'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ScreenshotsTab from "../../components/ScreenshotsTab.js";
import Link from 'next/link';
import { FiArrowLeft, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../auth/AuthContext';

function AdminScreenshotsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tlId = searchParams.get('tlId') || null;
  const employeeId = searchParams.get('employeeId') || 'all';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>
      <div style={{ padding: '2rem 24px 0 24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan, #06b6d4)', textDecoration: 'none', fontSize: '0.85rem' }}>
          <FiArrowLeft /> Back to Dashboard
        </Link>
        <Link href="/admin/team-hierarchy" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94a3b8)', textDecoration: 'none', fontSize: '0.85rem', padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
          <FiUsers /> Team Hierarchy & Assignments
        </Link>
      </div>
      <ScreenshotsTab user={user} adminInitialTlId={tlId} initialEmployeeId={employeeId} />
    </div>
  );
}

export default function AdminScreenshotsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
          Loading Activity & Screenshots...
        </div>
      }
    >
      <AdminScreenshotsContent />
    </Suspense>
  );
}
