import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigError } from '../lib/supabase.js';

export const AuthContext = createContext(null);

function withTimeout(promise, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), 10000);
    }),
  ]);
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  if (supabaseConfigError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <div className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Deployment Configuration Needed
          </p>
          <h1 className="mt-2 text-xl font-bold">Supabase is not configured</h1>
          <p className="mt-3 text-sm text-slate-600">{supabaseConfigError}</p>
          <p className="mt-3 text-sm text-slate-600">
            Add them in Vercel Project Settings, then redeploy the app.
          </p>
        </div>
      </div>
    );
  }

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, role, status')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Unable to read profile: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No profile row is linked to this login account.');
    }

    if (data.length > 1) {
      throw new Error('More than one profile is linked to this login account.');
    }

    const activeProfile = data[0];

    if (activeProfile.status !== 'active') {
      throw new Error('This account is inactive. Please contact the administrator.');
    }

    if (!['admin', 'staff'].includes(activeProfile.role)) {
      throw new Error('This account does not have a valid admin or staff role.');
    }

    return activeProfile;
  }, []);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const applySession = useCallback(
    async (currentSession) => {
      if (!currentSession) {
        clearAuthState();
        return;
      }

      const activeProfile = await withTimeout(
        fetchProfile(currentSession.user.id),
        'Profile check timed out. Please refresh and try again.',
      );

      setSession(currentSession);
      setUser(currentSession.user);
      setProfile(activeProfile);
      setAuthError('');
    },
    [clearAuthState, fetchProfile],
  );

  const loadSession = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        'Session check timed out. Please refresh and try again.',
      );

      if (error) {
        throw new Error(error.message);
      }

      await applySession(data.session);
    } catch (error) {
      setAuthError(error.message || 'Unable to check the current session.');
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, [applySession, clearAuthState]);

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      // Keep the Supabase auth callback synchronous, then do profile work separately.
      setTimeout(async () => {
        setLoading(true);

        try {
          await applySession(currentSession);
        } catch (error) {
          setAuthError(error.message || 'Unable to load account profile.');
          clearAuthState();
        } finally {
          setLoading(false);
        }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [applySession, clearAuthState, loadSession]);

  const login = useCallback(
    async ({ email, password }) => {
      setAuthError('');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session || !data.user) {
        clearAuthState();
        throw new Error('No session was returned after login.');
      }

      try {
        const activeProfile = await fetchProfile(data.user.id);

        setSession(data.session);
        setUser(data.user);
        setProfile(activeProfile);

        return activeProfile;
      } catch (profileError) {
        await supabase.auth.signOut();
        clearAuthState();
        throw profileError;
      }
    },
    [clearAuthState, fetchProfile],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearAuthState();
  }, [clearAuthState]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      authError,
      isAuthenticated: Boolean(session && profile),
      login,
      logout,
    }),
    [authError, loading, login, logout, profile, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
