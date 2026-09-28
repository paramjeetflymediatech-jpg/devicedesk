import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Retrieve auth cookies
  const userRole = request.cookies.get('devicedesk_user_role')?.value;
  const authUser = request.cookies.get('devicedesk_auth_user')?.value;

  const isAuthenticated = !!authUser;

  // Block /register — accounts are created by Admin only
  if (pathname === '/register') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!isAuthenticated) {
    if (pathname === '/' || pathname === '/employee-dashboard') {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. If authenticated, enforce authorization rules
  if (isAuthenticated) {
    const role = (userRole || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'management' || role === 'executive';
    const isTL = role === 'tl' || role === 'team leader' || role === 'team lead' || role === 'team_lead';
    const isClient = role === 'client';
    const isMarketing = role === 'marketing';
    const isCandidate = role === 'candidate';

    // If authenticated user attempts to access any authentication page, redirect to appropriate dashboard
    if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password') {
      let redirectUrl = new URL('/employee-dashboard', request.url);
      if (isAdmin) {
        redirectUrl = new URL('/', request.url);
      } else if (isTL) {
        redirectUrl = new URL('/portal/leader', request.url);
      } else if (isClient) {
        redirectUrl = new URL('/portal/client', request.url);
      } else if (isMarketing) {
        redirectUrl = new URL('/portal/marketing', request.url);
      } else if (isCandidate) {
        redirectUrl = new URL('/candidate-dashboard', request.url);
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Role-based route protection: non-admins cannot access admin desk
    if (pathname === '/') {
      const isIT = role.includes('it');
      if (!isAdmin && !isIT) {
        if (isTL) {
          return NextResponse.redirect(new URL('/portal/leader', request.url));
        } else if (isClient) {
          return NextResponse.redirect(new URL('/portal/client', request.url));
        } else if (isMarketing) {
          return NextResponse.redirect(new URL('/portal/marketing', request.url));
        } else if (isCandidate) {
          return NextResponse.redirect(new URL('/candidate-dashboard', request.url));
        }
        return NextResponse.redirect(new URL('/employee-dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/employee-dashboard',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
};
