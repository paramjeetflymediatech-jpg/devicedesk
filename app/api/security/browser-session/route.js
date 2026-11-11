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
    let googleEmail = browserProfile?.googleEmail || user?.email || null;
    let googleName = browserProfile?.googleName || user?.name || null;
    const browserName = browserProfile?.browserName || 'Web Browser';

    // If unauthenticated visitor, check if this Chrome Profile ID was previously bound to an employee
    let knownEmployee = null;
    if (!user && profileId) {
      try {
        const db = await getDbConnection();
        const [empRows] = await db.execute(
          `SELECT id, name, email, role, department FROM employees WHERE chrome_profile_id = ? LIMIT 1`,
          [profileId]
        );
        if (empRows.length > 0) {
          knownEmployee = empRows[0];
          googleEmail = googleEmail || knownEmployee.email;
          googleName = googleName || knownEmployee.name;
        }
      } catch (e) {}
    }

    const enrichedProfile = {
      ...(browserProfile || {}),
      profileId,
      googleEmail,
      googleName
    };

    if (user && user.id) {
      // Authenticated session arrival
      await logSecurityEvent({
        request,
        action: 'BROWSER_SESSION_START',
        category: 'AUTH',
        status: 'SUCCESS',
        user,
        identifier: user.email || user.name || user.id,
        browserProfile: enrichedProfile,
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
        const serializedProfile = JSON.stringify(enrichedProfile);
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
      // Visitor arrival analysis (shows known employee profile if previously logged in from this browser profile)
      await logSecurityEvent({
        request,
        action: 'SITE_VISITOR_ANALYZED',
        category: 'ACCESS_CONTROL',
        status: 'INFO',
        identifier: googleEmail || profileId || 'Guest Visitor',
        browserProfile: enrichedProfile,
        details: {
          pageUrl: pageUrl || '/',
          referrer: referrer || null,
          browserProfileId: profileId,
          browserName,
          googleEmail,
          knownEmployee: knownEmployee ? { id: knownEmployee.id, name: knownEmployee.name, email: knownEmployee.email } : null,
          note: knownEmployee
            ? `Analyzed known browser profile (${knownEmployee.name} - ${knownEmployee.email}) upon site arrival`
            : 'Analyzed visitor browser profile upon visiting site prior to authentication'
        }
      });
    }

    return NextResponse.json({ success: true, profileId });
  } catch (err) {
    console.error('Error logging browser session:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

