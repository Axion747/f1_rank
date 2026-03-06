-- F1 Rank 2026 — Existing Project Upgrade
-- Run this against an already-initialized database to apply the audit changes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rankings_unique_driver_per_event'
  ) THEN
    ALTER TABLE rankings
      ADD CONSTRAINT rankings_unique_driver_per_event
      UNIQUE (user_id, race_id, driver_id, race_type);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'actual_results_unique_driver_per_event'
  ) THEN
    ALTER TABLE actual_results
      ADD CONSTRAINT actual_results_unique_driver_per_event
      UNIQUE (race_id, driver_id, race_type);
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can insert actual results" ON actual_results;
DROP POLICY IF EXISTS "Authenticated users can update actual results" ON actual_results;
DROP POLICY IF EXISTS "Authenticated users can delete actual results" ON actual_results;
DROP POLICY IF EXISTS "Service role manages actual results" ON actual_results;

CREATE POLICY "Service role manages actual results"
  ON actual_results FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

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

-- After this file succeeds on an existing project, run `supabase-rpc.sql` to
-- install the shared view and RPC functions used by the frontend.
