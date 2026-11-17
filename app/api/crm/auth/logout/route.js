import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/crm/auth/logout
 * Clears CRM authentication session cookie
 */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });

  response.cookies.delete('crm_auth_token');
  return response;
}
