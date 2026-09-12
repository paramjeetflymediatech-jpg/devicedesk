import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../db/db.js';

export async function GET(request, { params }) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');

    if (!projectId || !departmentId) {
      return NextResponse.json({ error: 'project_id and department_id are required.' }, { status: 400 });
    }

    // In a project-based chat, the "groupId" can simply be a combination of project+department
    const groupId = `proj_${projectId}_dept_${departmentId}`;

    const db = await getDbConnection();
    const [rows] = await db.query(
      `SELECT * FROM chat_messages WHERE receiverId = ? ORDER BY timestamp ASC`,
      [groupId]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch Chat Messages API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id: projectId } = await params;
    const { department_id, sender_id, sender_name, content, file_url, file_name, file_size } = await request.json();

    if (!projectId || !department_id || !sender_id || !content) {
      return NextResponse.json({ error: 'Missing required chat fields.' }, { status: 400 });
    }

    const groupId = `proj_${projectId}_dept_${department_id}`;
    const messageId = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const timestamp = new Date().toISOString();

    const db = await getDbConnection();

    await db.execute(
      `INSERT INTO chat_messages (id, senderId, senderName, receiverId, messageType, content, fileUrl, fileName, fileSize, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId, 
        sender_id, 
        sender_name || 'User', 
        groupId, // Storing groupId in receiverId field for group chats
        file_url ? 'file' : 'text', 
        content, 
        file_url || null, 
        file_name || null, 
        file_size || null, 
        timestamp
      ]
    );

    return NextResponse.json({
      success: true,
      message: {
        id: messageId,
        senderId: sender_id,
        senderName: sender_name,
        receiverId: groupId,
        content,
        fileUrl: file_url,
        timestamp
      }
    });
  } catch (err) {
    console.error('Send Chat Message API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
