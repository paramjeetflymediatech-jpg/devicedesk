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
    // If authenticated user attempts to access any authentication page, redirect to appropriate dashboard
    if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password') {
      const redirectUrl = userRole === 'admin' ? new URL('/', request.url) : new URL('/employee-dashboard', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Role-based route protection: employees cannot access admin desk
    if (pathname === '/' && userRole === 'employee') {
      return NextResponse.redirect(new URL('/employee-dashboard', request.url));
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
