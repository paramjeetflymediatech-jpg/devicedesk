'use client';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../../auth/AuthContext';
import ScreenshotsTab from '../../../components/ScreenshotsTab';

function LeaderScreenshotsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialEmployeeId = searchParams.get('employeeId') || 'all';

  return (
    <div className="space-y-4">
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2">
        <div className="flex items-center space-x-3 text-sm text-slate-500">
          <Link
            href="/portal/leader"
            className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-blue-600 transition-colors"
          >
            <FiArrowLeft size={16} /> Overview
          </Link>
          <span>/</span>
          <Link
            href="/portal/leader/team"
            className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-blue-600 transition-colors"
          >
            <FiUsers size={15} /> Team & EODs
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900">Screenshots</span>
        </div>
      </div>

      {/* Embedded Screenshots Tab Component with TL Scoping */}
      <ScreenshotsTab
        user={user}
        isTL={true}
        tlId={user?.id}
        initialEmployeeId={initialEmployeeId}
      />
    </div>
  );
}

export default function LeaderScreenshotsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] gap-3 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium">Loading team screenshots...</p>
        </div>
      }
    >
      <LeaderScreenshotsContent />
    </Suspense>
  );
}
