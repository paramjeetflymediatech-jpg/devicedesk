'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/AuthContext';

export default function AdminPageRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const dbRoleStr = `${user?.dbRole || user?.role || ''}`.toLowerCase().trim();
    const deptStr = `${user?.department || ''}`.toLowerCase().trim();
    const emailLower = `${user?.email || ''}`.toLowerCase().trim();

    const isAdmin =
      dbRoleStr === 'admin' ||
      dbRoleStr === 'superadmin' ||
      dbRoleStr === 'management' ||
      dbRoleStr === 'executive' ||
      emailLower === 'admin@yopmail.com' ||
      emailLower === 'pravi@yopmail.com' ||
      emailLower === 'admin@devicedesk.com';

    if (isAdmin) {
      router.replace('/');
      return;
    }

    const isIT =
      dbRoleStr === 'it support' ||
      dbRoleStr === 'it_support' ||
      dbRoleStr === 'it engineer' ||
      dbRoleStr === 'it_engineer' ||
      dbRoleStr === 'it' ||
      deptStr === 'it' ||
      deptStr === 'it support' ||
      deptStr === 'it_support' ||
      deptStr === 'information technology' ||
      deptStr === 'it department' ||
      deptStr.startsWith('it ') ||
      deptStr.endsWith(' it') ||
      deptStr.includes(' it ') ||
      deptStr.includes('it support');

    if (isIT) {
      router.replace('/admin/tickets');
      return;
    }

    const isDNS = dbRoleStr === 'dns manager' || deptStr === 'dns manager';
    if (isDNS) {
      router.replace('/admin/domains');
      return;
    }

    const isHR = dbRoleStr === 'hr' || dbRoleStr.includes('hr') || deptStr.includes('hr');
    if (isHR) {
      router.replace('/admin/recruitment');
      return;
    }

    if (dbRoleStr === 'candidate') {
      router.replace('/candidate-dashboard');
    } else if (dbRoleStr === 'client') {
      router.replace('/portal/client');
    } else if (dbRoleStr === 'marketing') {
      router.replace('/portal/marketing');
    } else if (dbRoleStr.includes('leader') || dbRoleStr.includes('tl')) {
      router.replace('/portal/leader');
    } else {
      router.replace('/employee-dashboard');
    }
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
