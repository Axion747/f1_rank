-- F1 Rank 2026 - Shared RPCs and catalog view
-- Run this after `supabase-upgrade.sql` on existing projects, or as part of the
-- fresh setup after the base tables exist.

CREATE OR REPLACE VIEW public.drivers_catalog AS
SELECT * FROM (
  VALUES
    (1, 4, 'Lando Norris', 'mclaren'),
    (81, 81, 'Oscar Piastri', 'mclaren'),
    (16, 16, 'Charles Leclerc', 'ferrari'),
    (44, 44, 'Lewis Hamilton', 'ferrari'),
    (3, 1, 'Max Verstappen', 'redbull'),
    (6, 6, 'Isack Hadjar', 'redbull'),
    (12, 12, 'Kimi Antonelli', 'mercedes'),
    (63, 63, 'George Russell', 'mercedes'),
    (14, 14, 'Fernando Alonso', 'astonmartin'),
    (18, 18, 'Lance Stroll', 'astonmartin'),
    (10, 10, 'Pierre Gasly', 'alpine'),
    (43, 43, 'Franco Colapinto', 'alpine'),
    (23, 23, 'Alex Albon', 'williams'),
    (55, 55, 'Carlos Sainz', 'williams'),
    (30, 30, 'Liam Lawson', 'racingbulls'),
    (41, 41, 'Arvid Lindblad', 'racingbulls'),
    (31, 31, 'Esteban Ocon', 'haas'),
    (87, 87, 'Oliver Bearman', 'haas'),
    (5, 5, 'Gabriel Bortoleto', 'audi'),
    (27, 27, 'Nico Hülkenberg', 'audi'),
    (11, 11, 'Sergio Pérez', 'cadillac'),
    (77, 77, 'Valtteri Bottas', 'cadillac')
) AS drivers_catalog(driver_id, driver_number, driver_name, team_id);

CREATE OR REPLACE FUNCTION public.get_leaderboard_summary()
RETURNS TABLE (
  username TEXT,
  display_name TEXT,
  favorite_team TEXT,
  races_ranked BIGINT,
  scored_events BIGINT,
  accuracy INTEGER,
  total_correct BIGINT,
  total_predictions BIGINT,
  position_diff_avg NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scored_predictions AS (
    SELECT
      r.user_id,
      r.race_id,
      r.race_type,
      r.position,
      r.driver_id,
      actual_at_position.driver_id AS actual_driver_at_position,
      actual_driver.position AS actual_position
    FROM rankings r
    LEFT JOIN actual_results actual_at_position
      ON actual_at_position.race_id = r.race_id
     AND actual_at_position.race_type = r.race_type
     AND actual_at_position.position = r.position
    LEFT JOIN actual_results actual_driver
      ON actual_driver.race_id = r.race_id
     AND actual_driver.race_type = r.race_type
     AND actual_driver.driver_id = r.driver_id
    WHERE EXISTS (
      SELECT 1
      FROM actual_results scoped
      WHERE scoped.race_id = r.race_id
        AND scoped.race_type = r.race_type
    )
  ),
  profile_rollup AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.favorite_team,
      COUNT(DISTINCT (r.race_id, r.race_type)) AS races_ranked,
      COUNT(DISTINCT (sp.race_id, sp.race_type)) AS scored_events,
      COUNT(sp.user_id) AS total_predictions,
      COALESCE(SUM(CASE WHEN sp.actual_driver_at_position = sp.driver_id THEN 1 ELSE 0 END), 0) AS total_correct,
      ROUND(AVG(CASE
        WHEN sp.actual_position IS NOT NULL THEN ABS(sp.position - sp.actual_position)::NUMERIC
        ELSE 10::NUMERIC
      END), 1) AS position_diff_avg
    FROM profiles p
    LEFT JOIN rankings r ON r.user_id = p.id
    LEFT JOIN scored_predictions sp ON sp.user_id = p.id
    GROUP BY p.id, p.username, p.display_name, p.favorite_team
  )
  SELECT
    username,
    display_name,
    favorite_team,
    races_ranked,
    scored_events,
    CASE
      WHEN total_predictions > 0
        THEN ROUND((total_correct::NUMERIC / total_predictions::NUMERIC) * 100)::INTEGER
      ELSE NULL
    END AS accuracy,
    total_correct,
    total_predictions,
    position_diff_avg
  FROM profile_rollup
  WHERE races_ranked > 0
  ORDER BY
    CASE WHEN total_predictions > 0 THEN 0 ELSE 1 END,
    accuracy DESC NULLS LAST,
    races_ranked DESC,
    username ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_summary(target_username TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  favorite_team TEXT,
  favorite_driver TEXT,
  created_at TIMESTAMPTZ,
  races_ranked BIGINT,
  scored_events BIGINT,
  accuracy INTEGER,
  total_correct BIGINT,
  total_predictions BIGINT,
  position_diff_avg NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_profile AS (
    SELECT *
    FROM profiles
    WHERE profiles.username = target_username
    LIMIT 1
  ),
  scored_predictions AS (
    SELECT
      r.user_id,
      r.race_id,
      r.race_type,
      r.position,
      r.driver_id,
      actual_at_position.driver_id AS actual_driver_at_position,
      actual_driver.position AS actual_position
    FROM rankings r
    JOIN target_profile tp ON tp.id = r.user_id
    LEFT JOIN actual_results actual_at_position
      ON actual_at_position.race_id = r.race_id
     AND actual_at_position.race_type = r.race_type
     AND actual_at_position.position = r.position
    LEFT JOIN actual_results actual_driver
      ON actual_driver.race_id = r.race_id
     AND actual_driver.race_type = r.race_type
     AND actual_driver.driver_id = r.driver_id
    WHERE EXISTS (
      SELECT 1
      FROM actual_results scoped
      WHERE scoped.race_id = r.race_id
        AND scoped.race_type = r.race_type
    )
  )
  SELECT
    tp.id,
    tp.username,
    tp.display_name,
    tp.bio,
    tp.favorite_team,
    tp.favorite_driver,
    tp.created_at,
    COUNT(DISTINCT (r.race_id, r.race_type)) AS races_ranked,
    COUNT(DISTINCT (sp.race_id, sp.race_type)) AS scored_events,
    CASE
      WHEN COUNT(sp.user_id) > 0
        THEN ROUND((
          COALESCE(SUM(CASE WHEN sp.actual_driver_at_position = sp.driver_id THEN 1 ELSE 0 END), 0)::NUMERIC
          / COUNT(sp.user_id)::NUMERIC
        ) * 100)::INTEGER
      ELSE NULL
    END AS accuracy,
    COALESCE(SUM(CASE WHEN sp.actual_driver_at_position = sp.driver_id THEN 1 ELSE 0 END), 0) AS total_correct,
    COUNT(sp.user_id) AS total_predictions,
    ROUND(AVG(CASE
      WHEN sp.actual_position IS NOT NULL THEN ABS(sp.position - sp.actual_position)::NUMERIC
      ELSE 10::NUMERIC
    END), 1) AS position_diff_avg
  FROM target_profile tp
  LEFT JOIN rankings r ON r.user_id = tp.id
  LEFT JOIN scored_predictions sp ON sp.user_id = tp.id
  GROUP BY tp.id, tp.username, tp.display_name, tp.bio, tp.favorite_team, tp.favorite_driver, tp.created_at;
$$;

CREATE OR REPLACE FUNCTION public.get_driver_championship_summary()
RETURNS TABLE (
  driver_id INTEGER,
  driver_name TEXT,
  team_id TEXT,
  driver_number INTEGER,
  points BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dc.driver_id,
    dc.driver_name,
    dc.team_id,
    dc.driver_number,
    SUM(
      CASE
        WHEN r.race_type = 'sprint' THEN
          CASE r.position
            WHEN 1 THEN 8 WHEN 2 THEN 7 WHEN 3 THEN 6 WHEN 4 THEN 5
            WHEN 5 THEN 4 WHEN 6 THEN 3 WHEN 7 THEN 2 WHEN 8 THEN 1
            ELSE 0
          END
        ELSE
          CASE r.position
            WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12
            WHEN 5 THEN 10 WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4
            WHEN 9 THEN 2 WHEN 10 THEN 1
            ELSE 0
          END
      END
    )::BIGINT AS points
  FROM rankings r
  JOIN drivers_catalog dc ON dc.driver_id = r.driver_id
  GROUP BY dc.driver_id, dc.driver_name, dc.team_id, dc.driver_number
  HAVING SUM(
    CASE
      WHEN r.race_type = 'sprint' THEN
        CASE r.position
          WHEN 1 THEN 8 WHEN 2 THEN 7 WHEN 3 THEN 6 WHEN 4 THEN 5
          WHEN 5 THEN 4 WHEN 6 THEN 3 WHEN 7 THEN 2 WHEN 8 THEN 1
          ELSE 0
        END
      ELSE
        CASE r.position
          WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12
          WHEN 5 THEN 10 WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4
          WHEN 9 THEN 2 WHEN 10 THEN 1
          ELSE 0
        END
    END
  ) > 0
  ORDER BY points DESC, dc.driver_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_constructor_championship_summary()
RETURNS TABLE (
  team_id TEXT,
  points BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dc.team_id,
    SUM(
      CASE
        WHEN r.race_type = 'sprint' THEN
          CASE r.position
            WHEN 1 THEN 8 WHEN 2 THEN 7 WHEN 3 THEN 6 WHEN 4 THEN 5
            WHEN 5 THEN 4 WHEN 6 THEN 3 WHEN 7 THEN 2 WHEN 8 THEN 1
            ELSE 0
          END
        ELSE
          CASE r.position
            WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12
            WHEN 5 THEN 10 WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4
            WHEN 9 THEN 2 WHEN 10 THEN 1
            ELSE 0
          END
      END
    )::BIGINT AS points
  FROM rankings r
  JOIN drivers_catalog dc ON dc.driver_id = r.driver_id
  GROUP BY dc.team_id
  HAVING SUM(
    CASE
      WHEN r.race_type = 'sprint' THEN
        CASE r.position
          WHEN 1 THEN 8 WHEN 2 THEN 7 WHEN 3 THEN 6 WHEN 4 THEN 5
          WHEN 5 THEN 4 WHEN 6 THEN 3 WHEN 7 THEN 2 WHEN 8 THEN 1
          ELSE 0
        END
      ELSE
        CASE r.position
          WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12
          WHEN 5 THEN 10 WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4
          WHEN 9 THEN 2 WHEN 10 THEN 1
          ELSE 0
        END
    END
  ) > 0
  ORDER BY points DESC, dc.team_id ASC;
$$;

GRANT SELECT ON public.drivers_catalog TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_summary(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_championship_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_constructor_championship_summary() TO anon, authenticated;
