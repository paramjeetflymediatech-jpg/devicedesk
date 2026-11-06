'use client';
import { useState, useEffect, useSyncExternalStore } from 'react';

const emptySubscribe = (callback) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }
  return () => {};
};

function getCachedProfileSnapshot() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('devicedesk_client_profile') || localStorage.getItem('devicedesk_auth_user') || '';
}

function getServerProfileSnapshot() {
  return '';
}

export function useClientProfile() {
  const cachedRaw = useSyncExternalStore(
    emptySubscribe,
    getCachedProfileSnapshot,
    getServerProfileSnapshot
  );

  const [liveProfile, setLiveProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derive cached profile from external store snapshot
  const parsedCached = (() => {
    if (!cachedRaw) return null;
    try {
      return JSON.parse(cachedRaw);
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      let clientId = null;
      try {
        const auth = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
        if (auth && auth.id) clientId = auth.id;
      } catch (e) {}

      if (!clientId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/client-details?clientId=${clientId}`);
        const data = await res.json();
        if (data.success && data.data && isMounted) {
          const info = {
            name: data.data.name || 'Client',
            company_name: data.data.company_name || '',
            email: data.data.email || ''
          };
          setLiveProfile(info);
          setLoading(false);
          try {
            localStorage.setItem('devicedesk_client_profile', JSON.stringify(info));
          } catch (e) {}
          return;
        }
      } catch (err) {
        console.error('Failed to fetch client details:', err);
      }

      if (isMounted) setLoading(false);
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeProfile = liveProfile || parsedCached || { name: '', company_name: '', email: '' };

  const company_name = activeProfile.company_name || '';
  const name = activeProfile.name || '';

  const initials = (() => {
    const target = company_name || name || 'Client';
    const parts = target.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return target.slice(0, 2).toUpperCase() || 'C';
  })();

  return {
    ...activeProfile,
    company_name,
    name,
    initials,
    mounted: Boolean(cachedRaw || liveProfile),
    loading
  };
}
