import { NextResponse } from 'next/server';

function clearAllAuthCookies(response) {
  const cookieNames = [
    'devicedesk_token',
    'devicedesk_token_exp',
    'devicedesk_auth_user',
    'devicedesk_user_role',
    'devicedesk_browser_profile',
    'devicedesk_google_profile',
    'devicedesk_client_has_smo'
  ];

  for (const name of cookieNames) {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax'
    });
  }
  return response;
}

export async function POST(request) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.'
  });
  return clearAllAuthCookies(response);
}

export async function GET(request) {
  // Support redirecting directly to /login on GET request if called directly
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl);
  return clearAllAuthCookies(response);
}

