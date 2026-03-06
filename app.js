import {
  createRoot,
  html,
  supabase,
  useCallback,
  useEffect,
  useState,
} from './lib/core.mjs';
import { AuthContext, useHashRoute } from './lib/app-utils.mjs';
import { ToastProvider } from './components/app-components.mjs';
import { Navbar } from './components/app-shell.mjs';
import {
  CalendarView,
  ChampionshipsView,
  LeaderboardView,
  LiveDashboard,
  ProfileView,
  RankingsView,
} from './views/app-views.mjs';

function App() {
  const [route] = useHashRoute();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        return data;
      }

      const { data: userResponse } = await supabase.auth.getUser();
      const user = userResponse.user;
      if (!user) {
        setProfile(null);
        return null;
      }

      const meta = user.user_metadata || {};
      const username =
        meta.username || user.email?.split('@')[0] || `user_${userId.slice(0, 8)}`;
      const display_name =
        meta.display_name || meta.username || user.email?.split('@')[0] || 'User';

      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, username, display_name })
        .select()
        .single();
      if (insertError) {
        if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
          const fallbackUsername = `${username}_${userId.slice(0, 6)}`;
          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .insert({ id: userId, username: fallbackUsername, display_name })
            .select()
            .single();
          if (retryError) throw retryError;
          setProfile(retryProfile || null);
          return retryProfile || null;
        }
        throw insertError;
      }
      setProfile(insertedProfile || null);
      return insertedProfile || null;
    } catch (loadError) {
      console.error('loadProfile error:', loadError);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        loadProfile(initialSession.user.id).finally(() => setAuthLoading(false));
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const authValue = {
    session,
    profile,
    loading: authLoading,
    logout,
    refreshProfile: () => (session ? loadProfile(session.user.id) : Promise.resolve(null)),
  };

  const renderPage = () => {
    if (route === '/live') return html`<${LiveDashboard} />`;
    if (route === '/rankings') return html`<${RankingsView} />`;
    if (route === '/leaderboard') return html`<${LeaderboardView} />`;
    if (route === '/championships') return html`<${ChampionshipsView} />`;
    if (route.startsWith('/profile/')) {
      return html`<${ProfileView} username=${route.slice('/profile/'.length)} />`;
    }
    return html`<${CalendarView} />`;
  };

  return html`<${AuthContext.Provider} value=${authValue}>
    <${ToastProvider}>
      <div class="app-wrapper">
        <${Navbar} route=${route} />
        <main class="main-content">
          ${renderPage()}
        </main>
        <footer class="app-footer">
          F1 Rank 2026 - Private Formula 1 prediction pool
        </footer>
      </div>
    <//>
  <//>`;
}

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
