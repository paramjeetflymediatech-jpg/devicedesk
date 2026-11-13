'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/AuthContext';
import { isSuperAdminUser, isITSupportUser, isDnsManagerUser, getAuthorizedDashboard } from '../utils/authTokens.js';

export default function AdminPageRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const isAdmin = isSuperAdminUser(user);
    if (isAdmin) {
      router.replace('/');
      return;
    }

    const isIT = isITSupportUser(user);
    if (isIT) {
      router.replace('/admin/tickets');
      return;
    }

    const isDNS = isDnsManagerUser(user);
    if (isDNS) {
      router.replace('/admin/domains');
      return;
    }

    const dbRoleStr = `${user?.dbRole || ''}`.toLowerCase().trim();
    const deptStr = `${user?.department || ''}`.toLowerCase().trim();
    const isHR = dbRoleStr === 'hr' || dbRoleStr.includes('hr') || deptStr.includes('hr');
    if (isHR) {
      router.replace('/admin/recruitment');
      return;
    }

    const dest = getAuthorizedDashboard(user);
    router.replace(dest);
  }, [user, loading, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0f172a)',
      color: 'var(--text-secondary, #94a3b8)',
      fontSize: '0.9rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '2px solid rgba(255,255,255,0.2)',
          borderTopColor: 'var(--accent-cyan, #06b6d4)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span>Redirecting to authorized dashboard...</span>
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
