import { NextResponse } from 'next/server';

export function middleware(request) {
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

    // Role-based protection:
    // Employees cannot access Admin portal (/)
    if (pathname === '/' && userRole === 'employee') {
      const employeeUrl = new URL('/employee-dashboard', request.url);
      return NextResponse.redirect(employeeUrl);
    }

    // Admins cannot access Employee portal (/employee-dashboard)
    if (pathname === '/employee-dashboard' && userRole === 'admin') {
      const adminUrl = new URL('/', request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ['/', '/employee-dashboard', '/login', '/register', '/forgot-password', '/reset-password'],
};
