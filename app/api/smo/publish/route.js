import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db';

export async function POST(req) {
  try {
    const { requestId, simulate } = await req.json();

    if (!requestId) {
      return NextResponse.json({ success: false, error: 'Request ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // 1. Fetch SMO Request + Client Social Credentials
    const [rows] = await db.execute(`
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
      return NextResponse.json({ success: false, error: 'SMO Request not found.' }, { status: 404 });
    }

    const post = rows[0];

    if (!post.banner_url) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot publish: Designer has not uploaded a banner image yet.' 
      }, { status: 400 });
    }

    // Determine target platforms
    let platforms = ['facebook', 'instagram'];
    try {
      if (post.platforms) {
        platforms = typeof post.platforms === 'string' ? JSON.parse(post.platforms) : post.platforms;
      }
    } catch (e) {
      platforms = ['facebook', 'instagram'];
    }

    const fullCaption = [post.caption, post.hashtags].filter(Boolean).join('\n\n');

    // 2. Handle Simulation / Demo Mode
    if (simulate) {
      const mockResults = {
        facebook: platforms.includes('facebook') ? {
          id: 'mock_fb_' + Date.now(),
          post_id: `${post.fb_page_id || 'page123'}_mock_${Date.now()}`,
          status: 'simulated_success',
          permalink_url: 'https://facebook.com'
        } : null,
        instagram: platforms.includes('instagram') ? {
          id: 'mock_ig_' + Date.now(),
          status: 'simulated_success',
          permalink: 'https://instagram.com'
        } : null
      };

      await db.execute(`
        UPDATE client_smo_requests 
        SET status = 'Published', 
            published_at = NOW(), 
            social_post_ids = ?
        WHERE id = ?
      `, [JSON.stringify(mockResults), requestId]);

      try {
        await db.execute(`UPDATE service_requests SET status = 'Completed' WHERE id = ?`, [requestId]);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Simulation successful! Post marked as Published.',
        results: mockResults
      });
    }

    // 3. Validation for Live Publishing
    if (!post.meta_access_token) {
      return NextResponse.json({
        success: false,
        requiresSetup: true,
        error: 'Meta Page Access Token is not configured for this client. Please add it in "Social Settings" to publish automatically.'
      }, { status: 400 });
    }

    const publishResults = {};
    const errors = [];

    // Ensure image URL is fully qualified
    let imageUrl = post.banner_url;
    if (imageUrl.startsWith('/')) {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://storage.flymediatech.com';
      imageUrl = `${baseUrl.replace(/\/$/, '')}${imageUrl}`;
    }

    // 4. Publish to Facebook Page
    if (platforms.includes('facebook')) {
      if (!post.fb_page_id) {
        errors.push('Facebook Page ID is missing.');
      } else {
        try {
          const fbRes = await fetch(`https://graph.facebook.com/v19.0/${post.fb_page_id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: imageUrl,
              caption: fullCaption,
              access_token: post.meta_access_token
            })
          });

          const fbData = await fbRes.json();
          if (fbRes.ok && fbData.id) {
            publishResults.facebook = {
              success: true,
              id: fbData.id,
              post_id: fbData.post_id || fbData.id,
              permalink_url: `https://facebook.com/${fbData.post_id || fbData.id}`
            };
          } else {
            const errDetail = fbData.error ? fbData.error.message : 'Facebook API error';
            errors.push(`Facebook: ${errDetail}`);
            publishResults.facebook = { success: false, error: errDetail };
          }
        } catch (err) {
          errors.push(`Facebook network error: ${err.message}`);
          publishResults.facebook = { success: false, error: err.message };
        }
      }
    }

    // 5. Publish to Instagram Business
    if (platforms.includes('instagram')) {
      if (!post.ig_business_id) {
        errors.push('Instagram Business Account ID is missing.');
      } else {
        try {
          // Step A: Create Media Container
          const containerRes = await fetch(`https://graph.facebook.com/v19.0/${post.ig_business_id}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: imageUrl,
              caption: fullCaption,
              access_token: post.meta_access_token
            })
          });

          const containerData = await containerRes.json();

          if (containerRes.ok && containerData.id) {
            // Step B: Publish Media Container
            const publishRes = await fetch(`https://graph.facebook.com/v19.0/${post.ig_business_id}/media_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creation_id: containerData.id,
                access_token: post.meta_access_token
              })
            });

            const publishData = await publishRes.json();
            if (publishRes.ok && publishData.id) {
              publishResults.instagram = {
                success: true,
                id: publishData.id,
                permalink: `https://instagram.com`
              };
            } else {
              const errDetail = publishData.error ? publishData.error.message : 'Instagram publication failed';
              errors.push(`Instagram Publish: ${errDetail}`);
              publishResults.instagram = { success: false, error: errDetail };
            }
          } else {
            const errDetail = containerData.error ? containerData.error.message : 'Instagram container creation failed';
            errors.push(`Instagram Media: ${errDetail}`);
            publishResults.instagram = { success: false, error: errDetail };
          }
        } catch (err) {
          errors.push(`Instagram network error: ${err.message}`);
          publishResults.instagram = { success: false, error: err.message };
        }
      }
    }

    // Determine overall success:
    const atLeastOneSuccess = Object.values(publishResults).some(r => r && r.success);

    if (atLeastOneSuccess) {
      await db.execute(`
        UPDATE client_smo_requests 
        SET status = 'Published', 
            published_at = NOW(), 
            social_post_ids = ?
        WHERE id = ?
      `, [JSON.stringify(publishResults), requestId]);

      try {
        await db.execute(`UPDATE service_requests SET status = 'Completed' WHERE id = ?`, [requestId]);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: 'Successfully published to social channels!',
        results: publishResults,
        warnings: errors.length > 0 ? errors : undefined
      });
    } else {
      return NextResponse.json({
        success: false,
        error: errors.join(' | ') || 'Failed to publish to selected platforms.',
        results: publishResults
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Publish SMO Post Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
