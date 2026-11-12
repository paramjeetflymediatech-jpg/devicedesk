import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';

export async function POST(req) {
  try {
    const { requestId, alsoDeleteRecord } = await req.json();

    if (!requestId) {
      return NextResponse.json({ success: false, error: 'Request ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // 1. Fetch SMO Request + Client Social Credentials
    let [rows] = await db.execute(`
      SELECT r.*, 
        c.name as client_name, 
        cd.company_name,
        cd.fb_page_id,
        cd.ig_business_id,
        cd.meta_access_token
      FROM client_smo_requests r
      LEFT JOIN employees c ON (r.client_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci)
      LEFT JOIN client_details cd ON (r.client_id COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci)
      WHERE r.id = ?
    `, [requestId]);

    if (!rows || rows.length === 0) {
      // Fallback check on service_requests
      const [srRows] = await db.execute(`
        SELECT sr.*, sr.clientId as client_id,
          c.name as client_name,
          cd.company_name,
          cd.fb_page_id,
          cd.ig_business_id,
          cd.meta_access_token
        FROM service_requests sr
        LEFT JOIN employees c ON (sr.clientId COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci)
        LEFT JOIN client_details cd ON (sr.clientId COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci)
        WHERE sr.id = ?
      `, [requestId]);

      if (!srRows || srRows.length === 0) {
        return NextResponse.json({ success: false, error: 'SMO Request not found.' }, { status: 404 });
      }
      rows = srRows;
    }

    const post = rows[0];

    // Parse stored social post IDs
    let socialIds = {};
    if (post.social_post_ids) {
      try {
        socialIds = typeof post.social_post_ids === 'string' 
          ? JSON.parse(post.social_post_ids) 
          : post.social_post_ids;
      } catch (e) {
        socialIds = {};
      }
    }

    const fbPost = socialIds?.facebook;
    const igPost = socialIds?.instagram;

    const results = {
      facebook: { attempted: false, success: false, message: '' },
      instagram: { attempted: false, success: false, message: '' }
    };

    // 2. Resolve Meta Credentials if available
    let effectiveFbToken = (post.meta_access_token || '').trim();
    let effectiveIgToken = (post.meta_access_token || '').trim();

    if (effectiveFbToken) {
      try {
        const meRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${effectiveFbToken}`
        );
        if (meRes.ok) {
          const meData = await meRes.json();
          const pages = meData.data || [];
          const matched = pages.find(p => String(p.id) === String(post.fb_page_id)) || (pages.length === 1 ? pages[0] : null);
          if (matched?.access_token) {
            effectiveFbToken = matched.access_token;
            effectiveIgToken = matched.access_token;
          }
        }
      } catch (e) {
        console.warn('Error resolving page access token for deletion:', e.message);
      }

      // Also query direct page fields to fetch Page Access Token if not already resolved
      if (post.fb_page_id) {
        try {
          const pageRes = await fetch(
            `https://graph.facebook.com/v19.0/${post.fb_page_id}?fields=access_token,instagram_business_account&access_token=${effectiveFbToken}`
          );
          if (pageRes.ok) {
            const pageData = await pageRes.json();
            if (pageData.access_token && pageData.access_token.length > 20) {
              effectiveFbToken = pageData.access_token;
              effectiveIgToken = pageData.access_token;
            }
          }
        } catch (e) {
          console.warn('Error querying page access_token directly:', e.message);
        }
      }
    }

    // 3. Delete from Facebook Page
    if (fbPost && (fbPost.post_id || fbPost.id)) {
      results.facebook.attempted = true;
      const isSimulated = fbPost.status === 'simulated_success' || String(fbPost.id).startsWith('mock_');

      if (isSimulated) {
        results.facebook.success = true;
        results.facebook.message = 'Simulated Facebook post removed successfully.';
      } else if (!effectiveFbToken) {
        results.facebook.success = false;
        results.facebook.message = 'Cannot delete from Facebook: Meta Page Access Token is not configured.';
      } else {
        // Build candidate IDs:
        // When uploading photos to a page, deleting the timeline feed post (PAGE_ID_PHOTO_ID) is the primary way
        const candidates = [];
        if (fbPost.post_id && String(fbPost.post_id).includes('_')) {
          candidates.push(String(fbPost.post_id));
        }
        if (post.fb_page_id && fbPost.id) {
          const rawId = String(fbPost.id);
          const fullPagePostId = `${post.fb_page_id}_${rawId}`;
          if (!candidates.includes(fullPagePostId)) {
            candidates.push(fullPagePostId);
          }
        }
        if (fbPost.post_id && !candidates.includes(String(fbPost.post_id))) {
          candidates.push(String(fbPost.post_id));
        }
        if (fbPost.id && !candidates.includes(String(fbPost.id))) {
          candidates.push(String(fbPost.id));
        }

        let deleted = false;
        let lastErr = '';

        for (const targetId of candidates) {
          try {
            const delRes = await fetch(`https://graph.facebook.com/v19.0/${targetId}?access_token=${effectiveFbToken}`, {
              method: 'DELETE'
            });
            const delData = await delRes.json();
            if (delRes.ok && (delData.success === true || delData.success === 'true')) {
              deleted = true;
              break;
            } else {
              const errMsg = delData.error?.message || '';
              // If already removed on Facebook manually
              if (errMsg.includes('does not exist') || errMsg.includes('nonexisting') || errMsg.includes('Unsupported delete request') || errMsg.includes('Unknown path')) {
                deleted = true;
                break;
              }
              lastErr = errMsg || 'Facebook API error';
            }
          } catch (netErr) {
            lastErr = netErr.message;
          }
        }

        if (deleted) {
          results.facebook.success = true;
          results.facebook.message = 'Post permanently deleted from Facebook Page!';
        } else {
          results.facebook.success = false;
          results.facebook.message = `Facebook error: ${lastErr}`;
        }
      }
    } else {
      results.facebook.message = 'No Facebook post ID found on this record.';
    }

    // 4. Delete from Instagram Business
    if (igPost && igPost.id) {
      results.instagram.attempted = true;
      const isSimulated = igPost.status === 'simulated_success' || String(igPost.id).startsWith('mock_');

      if (isSimulated) {
        results.instagram.success = true;
        results.instagram.message = 'Simulated Instagram post removed successfully.';
      } else if (!effectiveIgToken) {
        results.instagram.success = false;
        results.instagram.message = 'Cannot delete from Instagram: Meta Access Token is missing.';
      } else {
        try {
          const igRes = await fetch(`https://graph.facebook.com/v19.0/${igPost.id}?access_token=${effectiveIgToken}`, {
            method: 'DELETE'
          });
          const igData = await igRes.json();
          if (igRes.ok && (igData.success === true || igData.success === 'true')) {
            results.instagram.success = true;
            results.instagram.message = 'Post permanently deleted from Instagram!';
          } else {
            const errMsg = igData.error?.message || '';
            if (errMsg.includes('does not exist') || errMsg.includes('nonexisting') || errMsg.includes('Unsupported delete')) {
              results.instagram.success = true;
              results.instagram.message = 'Post was already removed from Instagram.';
            } else {
              results.instagram.success = false;
              if (errMsg.includes('permission') || igData.error?.code === 10 || igData.error?.code === 200) {
                results.instagram.message = `Instagram permission error: ${errMsg}. Note: Meta requires 'instagram_business_manage_media' permission to delete Instagram media. If missing, please remove directly in the Instagram app or Meta Business Suite.`;
              } else {
                results.instagram.message = errMsg ? `Instagram error: ${errMsg}` : 'Instagram post could not be deleted automatically. You can remove it directly inside the Instagram app or Meta Business Suite.';
              }
            }
          }
        } catch (igNetErr) {
          results.instagram.success = false;
          results.instagram.message = `Instagram error: ${igNetErr.message}`;
        }
      }
    } else {
      results.instagram.message = 'No Instagram post ID found on this record.';
    }

    // 5. Update Database Record
    if (alsoDeleteRecord) {
      try { await db.query('DELETE FROM tasks WHERE project_id = ?', [requestId]); } catch (e) {}
      try { await db.query('DELETE FROM service_requests WHERE id = ?', [requestId]); } catch (e) {}
      await db.query('DELETE FROM client_smo_requests WHERE id = ?', [requestId]);
    } else {
      // Just unpublish / reset from Meta
      await db.execute(`
        UPDATE client_smo_requests 
        SET status = 'Ready for Approval',
            social_post_ids = NULL,
            published_at = NULL
        WHERE id = ?
      `, [requestId]);

      try {
        await db.execute(`
          UPDATE service_requests 
          SET status = 'Ready for Approval' 
          WHERE id = ? AND status = 'Completed'
        `, [requestId]);
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: alsoDeleteRecord 
        ? 'Request and live Meta post deleted successfully.' 
        : 'Post deleted from Meta channels and returned to Ready for Approval.',
      results
    });
  } catch (error) {
    console.error('Delete from Meta Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
