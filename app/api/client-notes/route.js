import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import { containsPhoneNumber, PHONE_POLICY_WARNING } from '@/app/utils/contactFilter';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');

    const db = await getDbConnection();
    let rows;
    const baseQuery = `
      SELECT cn.*, 
        COALESCE(NULLIF(TRIM(c.name), ''), NULLIF(TRIM(cd.company_name), ''), cn.client_id) as client_name,
        cd.company_name,
        c.email as client_email,
        c.avatarUrl as client_avatar,
        cd.phone as client_phone
      FROM client_notes cn
      LEFT JOIN employees c ON (cn.client_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci)
      LEFT JOIN client_details cd ON (cn.client_id COLLATE utf8mb4_unicode_ci = cd.client_id COLLATE utf8mb4_unicode_ci)
    `;

    try {
      if (client_id) {
        [rows] = await db.query(`${baseQuery} WHERE cn.client_id = ? ORDER BY cn.created_at DESC`, [client_id]);
      } else {
        [rows] = await db.query(`${baseQuery} ORDER BY cn.created_at DESC`);
      }
    } catch (joinErr) {
      console.warn('client-notes join fallback:', joinErr.message);
      if (client_id) {
        [rows] = await db.query('SELECT * FROM client_notes WHERE client_id = ? ORDER BY created_at DESC', [client_id]);
      } else {
        [rows] = await db.query('SELECT * FROM client_notes ORDER BY created_at DESC');
      }

      // If join query failed, attempt manual enrich from employees and client_details
      if (rows && rows.length > 0) {
        const clientIds = [...new Set(rows.map(r => r.client_id).filter(Boolean))];
        if (clientIds.length > 0) {
          try {
            const placeholders = clientIds.map(() => '?').join(',');
            const [emps] = await db.query(`SELECT id, name, email, avatarUrl FROM employees WHERE id IN (${placeholders})`, clientIds);
            let details = [];
            try {
              const [d] = await db.query(`SELECT client_id, company_name, phone FROM client_details WHERE client_id IN (${placeholders})`, clientIds);
              details = d;
            } catch (dErr) {}

            const empMap = new Map((emps || []).map(e => [String(e.id), e]));
            const detailMap = new Map((details || []).map(d => [String(d.client_id), d]));

            rows = rows.map(r => {
              const emp = empMap.get(String(r.client_id));
              const det = detailMap.get(String(r.client_id));
              return {
                ...r,
                client_name: emp?.name || det?.company_name || r.client_id,
                company_name: det?.company_name || null,
                client_email: emp?.email || null,
                client_avatar: emp?.avatarUrl || null,
                client_phone: det?.phone || null
              };
            });
          } catch (enrichErr) {
            console.error('Failed fallback fetch for client names:', enrichErr);
          }
        }
      }
    }
    
    return NextResponse.json({ success: true, notes: rows });
  } catch (err) {
    console.error('Error fetching client notes:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { client_id, note, attachment, sender_role, sender_name, topic, initiated_by_tl } = body;

    if (!client_id || !note) {
      return NextResponse.json({ success: false, error: 'client_id and note are required' }, { status: 400 });
    }

    // Security & Anti-circumvention Policy: Prevent sharing phone / contact numbers
    if (containsPhoneNumber(note) || (topic && containsPhoneNumber(topic))) {
      return NextResponse.json({
        success: false,
        error: PHONE_POLICY_WARNING
      }, { status: 400 });
    }

    let finalNote = String(note).trim();
    if (sender_role === 'Admin' || body.initiated_by_admin) {
      const adminName = sender_name || 'Admin';
      const topicPrefix = topic && topic.trim() ? `[Topic: ${topic.trim()}]\n\n` : '';
      if (!finalNote.startsWith('[From Admin:')) {
        finalNote = `[From Admin: ${adminName}] ${topicPrefix}${finalNote}`;
      }
    } else if (sender_role === 'Team Leader' || initiated_by_tl) {
      const leaderName = sender_name || 'Team Leader';
      const topicPrefix = topic && topic.trim() ? `[Topic: ${topic.trim()}]\n\n` : '';
      if (!finalNote.startsWith('[From Team Leader:')) {
        finalNote = `[From Team Leader: ${leaderName}] ${topicPrefix}${finalNote}`;
      }
    }

    const db = await getDbConnection();
    const id = 'note_' + Date.now();
    await db.execute(
      'INSERT INTO client_notes (id, client_id, note, status, attachment) VALUES (?, ?, ?, ?, ?)',
      [id, client_id, finalNote, 'Unread', attachment || null]
    );

    return NextResponse.json({ success: true, message: 'Note added successfully', id });
  } catch (err) {
    console.error('Error adding client note:', err);
    return NextResponse.json({ success: false, error: 'Failed to add note' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, tl_reply, tl_attachment, replied_by_name } = await request.json();
    if (!id || !tl_reply) {
      return NextResponse.json({ success: false, error: 'id and tl_reply are required' }, { status: 400 });
    }

    // Security & Anti-circumvention Policy: Prevent sharing phone / contact numbers in replies
    if (containsPhoneNumber(tl_reply)) {
      return NextResponse.json({
        success: false,
        error: PHONE_POLICY_WARNING
      }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.execute(
      'UPDATE client_notes SET tl_reply = ?, status = ?, tl_attachment = ?, replied_by_name = ? WHERE id = ?', 
      [tl_reply, 'Replied', tl_attachment || null, replied_by_name || 'Admin', id]
    );

    return NextResponse.json({ success: true, message: 'Reply sent' });
  } catch (err) {
    console.error('Error replying to client note:', err);
    return NextResponse.json({ success: false, error: 'Failed to reply' }, { status: 500 });
  }
}
