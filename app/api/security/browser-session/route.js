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
    const browserName = browserProfile?.browserName || 'Web Browser';

    // If authenticated, the user's account identity is authoritative
    let googleEmail = (user?.email && user.email.includes('@'))
      ? user.email
      : (browserProfile?.googleEmail || null);
    let googleName = user?.name || browserProfile?.googleName || null;

    // For unauthenticated visitors, do NOT assign employee email to the visitor's public profile badge!
    let previouslyBoundEmployee = null;
    if (!user && profileId) {
      try {
        const db = await getDbConnection();
        const [empRows] = await db.execute(
          `SELECT id, name, email, role, department FROM employees WHERE chrome_profile_id = ? LIMIT 1`,
          [profileId]
        );
        if (empRows.length > 0) {
          previouslyBoundEmployee = empRows[0];
          // Keep googleEmail null for anonymous visitors prior to login so a new visitor is not spoofed as that employee
          googleEmail = null;
          googleName = null;
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
      // Visitor arrival analysis (anonymous / pre-authentication)
      await logSecurityEvent({
        request,
        action: 'SITE_VISITOR_ANALYZED',
        category: 'ACCESS_CONTROL',
        status: 'INFO',
        identifier: profileId || 'Guest Visitor',
        browserProfile: {
          ...(browserProfile || {}),
          profileId,
          googleEmail: null,
          googleName: null
        },
        details: {
          pageUrl: pageUrl || '/',
          referrer: referrer || null,
          browserProfileId: profileId,
          browserName,
          previouslyBoundEmployee: previouslyBoundEmployee ? {
            id: previouslyBoundEmployee.id,
            name: previouslyBoundEmployee.name,
            email: previouslyBoundEmployee.email
          } : null,
          note: previouslyBoundEmployee
            ? `Analyzed visitor browser profile (hardware profile previously used by ${previouslyBoundEmployee.name})`
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

