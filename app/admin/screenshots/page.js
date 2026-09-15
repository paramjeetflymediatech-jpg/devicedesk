'use client';
import ScreenshotsTab from "../../components/ScreenshotsTab.js";
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../auth/AuthContext';

export default function AdminScreenshotsPage() {
  const { user } = useAuth();
  
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)' }}>
      <div style={{ padding: '2rem 24px 0 24px', maxWidth: '1600px', margin: '0 auto' }}>
        <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan, #06b6d4)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '8px' }}>
          <FiArrowLeft /> Back to Admin Panel
        </Link>
      </div>
      <ScreenshotsTab user={user} />
    </div>
  );
}
