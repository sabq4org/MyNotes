import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchAuthStatus,
  loginWithPin,
  setupPin as apiSetupPin,
  changePin as apiChangePin,
} from '../api/auth';
import { setToken, clearToken, getToken } from '../lib/storage';
import { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [isSetup, setIsSetup] = useState(null);

  const refreshStatus = useCallback(async () => {
    const data = await fetchAuthStatus();
    setIsSetup(Boolean(data.isSetup));
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshStatus();
      } catch {
        /* leave isSetup null and let UI show retry/error */
      } finally {
        if (mounted) setBootstrapping(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshStatus]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthenticated(false);
    });
  }, []);

  const login = useCallback(async (pin) => {
    const { token } = await loginWithPin(pin);
    setToken(token);
    setAuthenticated(true);
  }, []);

  const setupAndLogin = useCallback(async (pin) => {
    const { token } = await apiSetupPin(pin);
    setToken(token);
    setIsSetup(true);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuthenticated(false);
  }, []);

  const changePinAndRefresh = useCallback(async (currentPin, newPin) => {
    const { token } = await apiChangePin(currentPin, newPin);
    setToken(token);
  }, []);

  const value = useMemo(
    () => ({
      bootstrapping,
      isAuthenticated,
      isSetup,
      login,
      setupAndLogin,
      logout,
      changePin: changePinAndRefresh,
      refreshStatus,
    }),
    [
      bootstrapping,
      isAuthenticated,
      isSetup,
      login,
      setupAndLogin,
      logout,
      changePinAndRefresh,
      refreshStatus,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
