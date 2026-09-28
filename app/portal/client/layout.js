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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Checking access...</div>;
  }

  return <>{children}</>;
}
