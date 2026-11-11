import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

export async function POST(request) {
  try {
    const { browserProfile, pageUrl, referrer } = await request.json();

    let user = null;
    try {
      user = await checkAuth(request);
    } catch (e) {}

    const profileId = browserProfile?.profileId || null;
    const googleEmail = browserProfile?.googleEmail || null;
    const browserName = browserProfile?.browserName || 'Web Browser';

    if (user && user.id) {
      // Authenticated session arrival
      await logSecurityEvent({
        request,
        action: 'BROWSER_SESSION_START',
        category: 'AUTH',
        status: 'SUCCESS',
        user,
        identifier: user.email || user.name || user.id,
        browserProfile,
        details: {
          pageUrl: pageUrl || '/',
          referrer: referrer || null,
          browserProfileId: profileId,
          browserName,
          googleEmail
        }
      });

      // Update employee's active browser profile record
      try {
        const db = await getDbConnection();
        const serializedProfile = typeof browserProfile === 'string' ? browserProfile : JSON.stringify(browserProfile);
        await db.execute(
          `UPDATE employees 
           SET chrome_profile_id = COALESCE(?, chrome_profile_id),
               google_email = COALESCE(?, google_email),
               last_browser_profile = ?
           WHERE id = ?`,
          [profileId, googleEmail, serializedProfile, user.id]
        );
      } catch (dbErr) {
        console.warn('Failed to update employee browser session:', dbErr.message);
      }
    } else {
      // Unauthenticated visitor arrival analysis
      await logSecurityEvent({
        request,
        action: 'SITE_VISITOR_ANALYZED',
        category: 'ACCESS_CONTROL',
        status: 'INFO',
        identifier: googleEmail || profileId || 'Guest Visitor',
        browserProfile,
        details: {
          pageUrl: pageUrl || '/',
          referrer: referrer || null,
          browserProfileId: profileId,
          browserName,
          googleEmail,
          note: 'Analyzed browser profile upon visiting site prior to authentication'
        }
      });
    }

    return NextResponse.json({ success: true, profileId });
  } catch (err) {
    console.error('Error logging browser session:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
