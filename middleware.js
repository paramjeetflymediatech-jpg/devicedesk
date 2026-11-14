import { NextResponse } from 'next/server';
import {
  verifySessionToken,
  isSuperAdminUser,
  isITSupportUser,
  isDnsManagerUser,
  getAuthorizedDashboard
} from './app/utils/authTokens.js';

const PUBLIC_EXACT_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/privacy-policy',
  '/account-deletion',
  '/support',
  '/careers/register',
  '/kiosk',
  '/setup-agent',
  '/inactive-account',
]);

function isPublicPath(pathname) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/careers/register')) return true;
  if (pathname.startsWith('/support')) return true;
  if (pathname.startsWith('/kiosk')) return true;
  if (pathname.startsWith('/setup-agent')) return true;
  if (pathname.startsWith('/inactive-account')) return true;
  if (pathname.startsWith('/privacy-policy')) return true;
  if (pathname.startsWith('/account-deletion')) return true;
  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Retrieve auth cookies
  const rawToken = request.cookies.get('devicedesk_token')?.value;
  const rawAuthUser = request.cookies.get('devicedesk_auth_user')?.value;
  const rawTokenExp = request.cookies.get('devicedesk_token_exp')?.value;

  let user = null;
  let isExpired = false;
  let isAuthenticated = false;

  // 1. Verify via signed JWT token if available
  if (rawToken) {
    const tokenCheck = await verifySessionToken(rawToken);
    if (tokenCheck.valid && tokenCheck.payload) {
      user = tokenCheck.payload;
      isAuthenticated = true;
    } else if (tokenCheck.expired) {
      isExpired = true;
      isAuthenticated = false;
    }
  }

  // 2. Fallback check on auth_user cookie if JWT wasn't verified
  if (!isAuthenticated && !isExpired && rawAuthUser) {
    try {
      const decodedStr = rawAuthUser.startsWith('%') ? decodeURIComponent(rawAuthUser) : rawAuthUser;
      const parsedUser = JSON.parse(decodedStr);

      if (parsedUser) {
        // If it includes a token, verify that token
        if (parsedUser.token) {
          const check = await verifySessionToken(parsedUser.token);
          if (check.valid && check.payload) {
            user = { ...parsedUser, ...check.payload };
            isAuthenticated = true;
          } else if (check.expired) {
            isExpired = true;
            isAuthenticated = false;
          }
        }

        // If expiresAt timestamp is recorded in cookie/localStorage
        if (!isExpired && parsedUser.expiresAt) {
          if (Date.now() > Number(parsedUser.expiresAt)) {
            isExpired = true;
            isAuthenticated = false;
          } else if (!isAuthenticated) {
            user = parsedUser;
            isAuthenticated = true;
          }
        } else if (!isExpired && rawTokenExp) {
          if (Date.now() > Number(rawTokenExp)) {
            isExpired = true;
            isAuthenticated = false;
          } else if (!isAuthenticated) {
            user = parsedUser;
            isAuthenticated = true;
          }
        }
      }
    } catch (e) {
      // Invalid user JSON
    }
  }

  // If token is found to be expired or invalid while visiting protected pages
  if (!isAuthenticated) {
    // Block /register — accounts are created by Admin only
    if (pathname === '/register') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Allow public pages (login, forgot-password, privacy-policy, etc.)
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    // Unauthenticated / Expired trying to access ANY protected route:
    // Send directly to login page!
    const loginUrl = new URL(isExpired ? '/login?expired=1' : '/login', request.url);
    const redirectRes = NextResponse.redirect(loginUrl);

    // Clean up stale or expired cookies immediately
    redirectRes.cookies.delete('devicedesk_token');
    redirectRes.cookies.delete('devicedesk_auth_user');
    redirectRes.cookies.delete('devicedesk_user_role');
    redirectRes.cookies.delete('devicedesk_token_exp');

    return redirectRes;
  }

  // -------------------------------------------------------------
  // USER IS AUTHENTICATED WITH A VALID TOKEN
  // -------------------------------------------------------------

  // If authenticated user attempts to access any login/auth page,
  // redirect them to their authorized dashboard
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  ) {
    // If the request explicitly requests logout, expired session, or client auth_user cookie was cleared
    const isExplicitLogout = request.nextUrl.searchParams.get('logout') === '1' || 
                             request.nextUrl.searchParams.get('logout') === 'true' ||
                             request.nextUrl.searchParams.get('expired') === '1' ||
                             !rawAuthUser;
    if (isExplicitLogout) {
      const response = NextResponse.next();
      response.cookies.delete('devicedesk_token');
      response.cookies.delete('devicedesk_token_exp');
      response.cookies.delete('devicedesk_auth_user');
      response.cookies.delete('devicedesk_user_role');
      response.cookies.delete('devicedesk_browser_profile');
      response.cookies.delete('devicedesk_google_profile');
      response.cookies.delete('devicedesk_client_has_smo');
      return response;
    }

    const dest = getAuthorizedDashboard(user);
    return NextResponse.redirect(new URL(dest, request.url));
  }

  const isSuperAdmin = isSuperAdminUser(user);
  const isIT = isITSupportUser(user);
  const isDns = isDnsManagerUser(user);
  const dbRoleLower = (user?.dbRole || user?.role || '').toLowerCase().trim();

  // STRICT ACCESS CONTROL FOR ROOT ROUTE '/' (Super Admin Desk):
  // Non-super-admin users must NEVER receive or see the Super Admin desk!
  if (pathname === '/') {
    if (!isSuperAdmin && !isIT && !isDns) {
      const targetDashboard = getAuthorizedDashboard(user);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    // IT Support navigating to root should be guided to their dashboard tab
    if (isIT && !isSuperAdmin && !request.nextUrl.searchParams.get('tab')) {
      return NextResponse.redirect(new URL('/?tab=dashboard', request.url));
    }
  }

  // Strict Protection for /admin and /admin/* routes:
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isSuperAdmin) {
      const isHR = dbRoleLower === 'hr' || dbRoleLower.includes('hr') || (user?.department || '').toLowerCase().includes('hr');
      if (!isIT && !isHR && !isDns) {
        // Disallow normal users, candidates, clients, and TLs from /admin
        const targetDashboard = getAuthorizedDashboard(user);
        return NextResponse.redirect(new URL(targetDashboard, request.url));
      }
    }
  }

  // Strict Protection for /portal/leader/*:
  if (pathname.startsWith('/portal/leader')) {
    const isTL =
      dbRoleLower === 'tl' ||
      dbRoleLower === 'team lead' ||
      dbRoleLower === 'team leader' ||
      dbRoleLower === 'team_lead' ||
      (user?.department || '').toLowerCase().includes('leader');
    if (!isTL && !isSuperAdmin) {
      return NextResponse.redirect(new URL(getAuthorizedDashboard(user), request.url));
    }
  }

  // Strict Protection for /portal/client/*:
  if (pathname.startsWith('/portal/client')) {
    const isClient = dbRoleLower === 'client';
    if (!isClient && !isSuperAdmin) {
      return NextResponse.redirect(new URL(getAuthorizedDashboard(user), request.url));
    }
  }

  // Strict Protection for /portal/marketing/*:
  if (pathname.startsWith('/portal/marketing')) {
    const isMarketing = dbRoleLower === 'marketing' || (user?.department || '').toLowerCase().includes('marketing');
    if (!isMarketing && !isSuperAdmin) {
      return NextResponse.redirect(new URL(getAuthorizedDashboard(user), request.url));
    }
  }

  // Strict Protection for /developer/*:
  if (pathname.startsWith('/developer')) {
    const emailLower = (user?.email || '').toLowerCase();
    const isDev = emailLower === 'developer@devicedesk.com' || dbRoleLower === 'developer';
    if (!isDev && !isSuperAdmin) {
      return NextResponse.redirect(new URL(getAuthorizedDashboard(user), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * 1. /api routes
     * 2. /_next/static (static files)
     * 3. /_next/image (image optimization files)
     * 4. Static media files: favicon.ico, images, audio, manifest.json, sw.js
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ico|txt|pdf)).*)',
  ],
};

