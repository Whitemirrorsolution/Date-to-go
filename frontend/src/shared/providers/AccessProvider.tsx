import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getAccessToken } from '../../services/api';
import { API_URL } from '../../config/index.js';
import { UserAccessData, resolveHomeRoute } from '@date-to-go/access-policy';
import { useAuth } from '../../context/AuthContext';

interface AccessContextValue {
  access: UserAccessData | null;
  isLoading: boolean;
  error: string | null;
  refetchAccess: () => Promise<UserAccessData | null>;
}

const AccessContext = createContext<AccessContextValue>({
  access: null,
  isLoading: true,
  error: null,
  refetchAccess: async () => null,
});

export const useAccess = () => useContext(AccessContext);

export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [access, setAccess] = useState<UserAccessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccess = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<UserAccessData & { nextRoute?: string }>('/auth/me/access');
      const data = res.data || null;
      setAccess(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch access');
      setAccess(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (isAuthLoading) return; // Wait for auth resolution

    if (!isAuthenticated) {
      setAccess(null);
      setIsLoading(false);
      return;
    }

    fetchAccess().catch(() => {});
  }, [isAuthLoading, isAuthenticated, fetchAccess]);

  // Setup SSE
  useEffect(() => {
    if (!access || !isAuthenticated) return;

    let isMounted = true;
    const abortController = new AbortController();

    const connectSSE = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        const response = await fetch(`${API_URL}/v1/events`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: abortController.signal
        });

        if (!response.ok) throw new Error('SSE connection failed');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) return;

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const chunk of lines) {
            const dataMatch = chunk.match(/data: (.*)/);
            if (dataMatch) {
              const data = JSON.parse(dataMatch[1]);
              if (data.type === 'access.changed' || data.reason?.startsWith('subscription')) {
                // Refetch access
                if (isMounted) {
                  fetchAccess().then(newAccess => {
                    if (newAccess) {
                      resolveHomeRoute(newAccess);
                    }
                  });
                }
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && isMounted) {
          setTimeout(connectSSE, 5000); // Reconnect on failure
        }
      }
    };

    connectSSE();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [access?.accessVersion]); // Re-run if totally new token/version? Only if we drop

  return (
    <AccessContext.Provider value={{ access, isLoading, error, refetchAccess: fetchAccess }}>
      {children}
    </AccessContext.Provider>
  );
};
