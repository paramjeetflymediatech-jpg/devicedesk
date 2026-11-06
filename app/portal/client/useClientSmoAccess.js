'use client';
import { useState, useEffect, useSyncExternalStore } from 'react';

const emptySubscribe = (callback) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }
  return () => {};
};

function getCachedSmoSnapshot() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('devicedesk_client_has_smo') || '';
}

function getServerSmoSnapshot() {
  return '';
}

export function useClientSmoAccess() {
  const cachedSmo = useSyncExternalStore(
    emptySubscribe,
    getCachedSmoSnapshot,
    getServerSmoSnapshot
  );

  const [liveHasSmo, setLiveHasSmo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      let clientId = null;
      try {
        const user = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
        if (user && user.id) clientId = user.id;
      } catch (e) {}

      if (!clientId) {
        if (isMounted) {
          setLiveHasSmo(false);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/client-services/my-packages?clientId=${clientId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const smoActive = data.data.some(pkg => {
            if (pkg.is_expired) return false;
            const name = (pkg.name || '').toLowerCase();
            return name.includes('smo') || name.includes('social');
          });

          if (isMounted) {
            setLiveHasSmo(smoActive);
            setLoading(false);
          }
          try {
            localStorage.setItem('devicedesk_client_has_smo', smoActive ? 'true' : 'false');
          } catch (e) {}
          return;
        }
      } catch (e) {
        console.error('Failed to verify SMO package access:', e);
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasSmo = liveHasSmo !== null ? liveHasSmo : cachedSmo === 'true';

  return { 
    hasSmo, 
    mounted: Boolean(cachedSmo !== '' || liveHasSmo !== null), 
    loading 
  };
}
