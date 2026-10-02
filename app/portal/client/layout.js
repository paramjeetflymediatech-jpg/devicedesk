'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function ClientPortalLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      // List of restricted paths
      const restrictedPaths = [
        '/portal/client/book-service',
        '/portal/client/notes',
        '/portal/client/seo',
        '/portal/client/smo',
        '/portal/client/ads',
        '/portal/client' // The project overview page itself
      ];

      const isRestricted = restrictedPaths.includes(pathname);
      
      if (isRestricted) {
        let clientId = null;
        let isClientRole = false;
        
        try {
          const user = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
          if (user && user.id) clientId = user.id;
          if (user && user.role === 'client') isClientRole = true;
        } catch (e) {}

        // Only enforce this check for actual clients
        if (clientId && isClientRole) {
          try {
            const res = await fetch(`/api/client-services/my-packages?clientId=${clientId}`);
            const data = await res.json();
            if (data.success && (!data.data || data.data.length === 0)) {
              // No packages, redirect to packages page
              Swal.fire({
                icon: 'info',
                title: 'Subscription Required',
                text: 'You need an active subscription package to access this section.',
                confirmButtonColor: '#db2777'
              });
              router.push('/portal/client/packages');
              return;
            }
          } catch (err) {}
        }
      }
      setLoading(false);
    };

    checkAccess();
  }, [pathname, router]);

  const isRestricted = [
    '/portal/client/book-service',
    '/portal/client/notes',
    '/portal/client/seo',
    '/portal/client/smo',
    '/portal/client/ads',
    '/portal/client'
  ].includes(pathname);

  // While checking, show a blank or loading state for restricted routes to avoid flicker
  if (loading && isRestricted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 overflow-hidden w-screen h-screen">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-100 rounded-full blur-3xl opacity-60"></div>
        <div className="z-10 flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="relative flex items-center justify-center w-20 h-20 mb-6">
            <svg className="absolute w-full h-full text-pink-200 animate-spin" viewBox="0 0 100 100" style={{ animationDuration: '3s' }}>
              <circle cx="50" cy="50" r="45" fill="none" strokeWidth="2" stroke="currentColor" strokeDasharray="60 40" strokeLinecap="round" />
            </svg>
            <svg className="absolute w-14 h-14 text-pink-600 animate-spin" viewBox="0 0 100 100" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}>
              <circle cx="50" cy="50" r="40" fill="none" strokeWidth="4" stroke="currentColor" strokeDasharray="30 70" strokeLinecap="round" />
            </svg>
            <div className="w-3 h-3 bg-pink-600 rounded-full animate-pulse shadow-lg shadow-pink-500/50"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Preparing Your Workspace</h2>
          <p className="text-sm font-medium text-gray-500">Securely loading your client dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
