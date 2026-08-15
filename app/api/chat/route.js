import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import { checkAuth, deleteFile } from '../utils/storageManager.js';
import { ChatMessage } from '../db/models/ChatMessage.js';
import { sendPushNotification } from '../utils/pushNotifications.js';

export async function GET(request) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDbConnection();
    
    // 1. Fetch user's department
    const [empRows] = await db.execute(
      'SELECT department FROM employees WHERE id = ? LIMIT 1',
      [user.id]
    );
    const department = empRows.length > 0 ? empRows[0].department : null;

    // 2. Fetch Chat Messages history
    const messages = await ChatMessage.getMessagesForUser(user.id, department);

    // 3. Fetch Groups the user is a member of
    const [groups] = await db.execute(
      `SELECT g.id, g.name, g.createdBy, g.createdAt, g.avatarUrl,
              (SELECT GROUP_CONCAT(m.employeeId) FROM chat_group_members m WHERE m.groupId = g.id) AS memberIds
       FROM chat_groups g
       JOIN chat_group_members gm ON g.id = gm.groupId
       WHERE gm.employeeId = ?`,
      [user.id]
    );

    // 4. Fetch Blocked Users list involving current user
    const [blockedUsers] = await db.execute(
      'SELECT blockerId, blockedId FROM blocked_users WHERE blockerId = ? OR blockedId = ?',
      [user.id, user.id]
    );

    return NextResponse.json({ success: true, messages, groups, blockedUsers });
  } catch (err) {
    console.error('Fetch Chat API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Action: Block User
    if (action === 'blockUser') {
      const { targetId } = body;
      if (!targetId) {
        return NextResponse.json({ success: false, error: 'Target user ID is required' }, { status: 400 });
      }
      if (String(targetId).toLowerCase() === String(user.id).toLowerCase()) {
        return NextResponse.json({ success: false, error: 'You cannot block yourself' }, { status: 400 });
      }

      const db = await getDbConnection();
      await db.execute(
        'INSERT IGNORE INTO blocked_users (blockerId, blockedId) VALUES (?, ?)',
        [user.id, targetId]
      );
      return NextResponse.json({ success: true, message: 'User blocked successfully' });
    }

    // Action: Unblock User
    if (action === 'unblockUser') {
      const { targetId } = body;
      if (!targetId) {
        return NextResponse.json({ success: false, error: 'Target user ID is required' }, { status: 400 });
      }

      const db = await getDbConnection();
      await db.execute(
        'DELETE FROM blocked_users WHERE blockerId = ? AND blockedId = ?',
        [user.id, targetId]
      );
      return NextResponse.json({ success: true, message: 'User unblocked successfully' });
    }

    // Check if creating a custom group
    if (action === 'createGroup') {
      const { name, members } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Group name is required' }, { status: 400 });
      }
      if (!Array.isArray(members) || members.length === 0) {
        return NextResponse.json({ success: false, error: 'At least one group member is required' }, { status: 400 });
      }

      const db = await getDbConnection();
      const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const createdAt = new Date().toISOString();

      // Ensure the creator is included in the members list
      const allMembers = Array.from(new Set([user.id, ...members]));

      const conn = await db.getConnection();
      await conn.beginTransaction();
      try {
        await conn.execute(
          'INSERT INTO chat_groups (id, name, createdBy, createdAt) VALUES (?, ?, ?, ?)',
          [groupId, name.trim(), user.id, createdAt]
        );

        for (const memberId of allMembers) {
          await conn.execute(
            'INSERT INTO chat_group_members (groupId, employeeId) VALUES (?, ?)',
            [groupId, memberId]
          );
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return NextResponse.json({
        success: true,
        group: {
          id: groupId,
          name: name.trim(),
          createdBy: user.id,
          createdAt,
          memberIds: allMembers.join(',')
        }
      });
    }

    // Add members to an existing group
    if (action === 'addGroupMembers') {
      const { groupId, members } = body;
      if (!groupId) {
        return NextResponse.json({ success: false, error: 'Group ID is required' }, { status: 400 });
      }
      if (!Array.isArray(members) || members.length === 0) {
        return NextResponse.json({ success: false, error: 'Members list is required' }, { status: 400 });
      }

      const db = await getDbConnection();
      const conn = await db.getConnection();
      await conn.beginTransaction();
      try {
        for (const memberId of members) {
          await conn.execute(
            'INSERT IGNORE INTO chat_group_members (groupId, employeeId) VALUES (?, ?)',
            [groupId, memberId]
          );
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return NextResponse.json({ success: true });
    }

    // Remove a member from a group
    if (action === 'removeGroupMember') {
      const { groupId, employeeId } = body;
      if (!groupId || !employeeId) {
        return NextResponse.json({ success: false, error: 'Group ID and Employee ID are required' }, { status: 400 });
      }

      const db = await getDbConnection();
      await db.execute(
        'DELETE FROM chat_group_members WHERE groupId = ? AND employeeId = ?',
        [groupId, employeeId]
      );

      return NextResponse.json({ success: true });
    }

    // Update profile picture for the current user
    if (action === 'updateProfilePicture') {
      const { avatarUrl } = body;
      const db = await getDbConnection();
      // Fetch the old avatar URL before overwriting it
      const [empRows] = await db.execute(
        'SELECT avatarUrl FROM employees WHERE id = ? LIMIT 1',
        [user.id]
      );
      const oldAvatarUrl = empRows?.[0]?.avatarUrl || null;
      // Update DB first
      await db.execute(
        'UPDATE employees SET avatarUrl = ? WHERE id = ?',
        [avatarUrl || null, user.id]
      );
      // Delete the old file after the DB is safely updated
      if (oldAvatarUrl && oldAvatarUrl !== avatarUrl) {
        await deleteFile(oldAvatarUrl);
      }
      return NextResponse.json({ success: true });
    }

    // Update group avatar URL
    if (action === 'updateGroupAvatar') {
      const { groupId, avatarUrl } = body;
      if (!groupId) {
        return NextResponse.json({ success: false, error: 'Group ID is required' }, { status: 400 });
      }
      const db = await getDbConnection();
      // Fetch the old group avatar URL before overwriting it
      const [groupRows] = await db.execute(
        'SELECT avatarUrl FROM chat_groups WHERE id = ? LIMIT 1',
        [groupId]
      );
      const oldGroupAvatarUrl = groupRows?.[0]?.avatarUrl || null;
      // Update DB first
      await db.execute(
        'UPDATE chat_groups SET avatarUrl = ? WHERE id = ?',
        [avatarUrl || null, groupId]
      );
      // Delete the old file after the DB is safely updated
      if (oldGroupAvatarUrl && oldGroupAvatarUrl !== avatarUrl) {
        await deleteFile(oldGroupAvatarUrl);
      }
      return NextResponse.json({ success: true });
    }

    // Edit Message (recent messages within 15 minutes)
    if (action === 'editMessage') {
      const { messageId, content } = body;
      if (!messageId || !content) {
        return NextResponse.json({ success: false, error: 'Message ID and content are required' }, { status: 400 });
      }

      const db = await getDbConnection();
      const [rows] = await db.execute('SELECT * FROM chat_messages WHERE id = ? LIMIT 1', [messageId]);
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
      }

      const msg = rows[0];
      if (String(msg.senderId).toLowerCase() !== String(user.id).toLowerCase()) {
        return NextResponse.json({ success: false, error: 'You can only edit your own messages' }, { status: 403 });
      }

      const diffMins = (Date.now() - new Date(msg.timestamp).getTime()) / (1000 * 60);
      if (diffMins > 15) {
        return NextResponse.json({ success: false, error: 'Messages older than 15 minutes cannot be edited' }, { status: 400 });
      }

      const editedAt = new Date().toISOString();
      await db.execute(
        'UPDATE chat_messages SET content = ?, isEdited = 1, editedAt = ? WHERE id = ?',
        [content, editedAt, messageId]
      );

      return NextResponse.json({ success: true, messageId, content, isEdited: 1, editedAt, receiverId: msg.receiverId, senderId: msg.senderId });
    }

    // Delete Message
    if (action === 'deleteMessage') {
      const { messageId, deleteType } = body; // deleteType: 'everyone' | 'self'
      if (!messageId) {
        return NextResponse.json({ success: false, error: 'Message ID is required' }, { status: 400 });
      }

      const db = await getDbConnection();
      const [rows] = await db.execute('SELECT * FROM chat_messages WHERE id = ? LIMIT 1', [messageId]);
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
      }

      const msg = rows[0];

      if (deleteType === 'everyone') {
        if (String(msg.senderId).toLowerCase() !== String(user.id).toLowerCase()) {
          return NextResponse.json({ success: false, error: 'You can only delete your own messages for everyone' }, { status: 403 });
        }

        const diffMins = (Date.now() - new Date(msg.timestamp).getTime()) / (1000 * 60);
        if (diffMins > 15) {
          return NextResponse.json({ success: false, error: 'Messages older than 15 minutes can only be deleted for yourself' }, { status: 400 });
        }

        await db.execute(
          'UPDATE chat_messages SET deletedForEveryone = 1 WHERE id = ?',
          [messageId]
        );

        return NextResponse.json({ success: true, messageId, deleteType: 'everyone', receiverId: msg.receiverId, senderId: msg.senderId });
      } else {
        // Delete for Self
        let deletedUsers = [];
        try {
          if (msg.deletedForUsers) {
            deletedUsers = JSON.parse(msg.deletedForUsers);
          }
        } catch (e) {
          deletedUsers = [];
        }

        if (!deletedUsers.includes(user.id)) {
          deletedUsers.push(user.id);
        }

        await db.execute(
          'UPDATE chat_messages SET deletedForUsers = ? WHERE id = ?',
          [JSON.stringify(deletedUsers), messageId]
        );

        return NextResponse.json({ success: true, messageId, deleteType: 'self', receiverId: msg.receiverId, senderId: msg.senderId });
      }
    }

    // Default: Sending a Chat message
    const { receiverId, messageType, content, fileUrl, fileName, fileSize } = body;

    if (!receiverId) {
      return NextResponse.json({ success: false, error: 'Receiver ID is required' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check if blocked before sending (only for Direct Messages)
    if (!receiverId.startsWith('group_') && !receiverId.startsWith('dept_') && receiverId !== 'general') {
      const [blockRows] = await db.execute(
        `SELECT * FROM blocked_users 
         WHERE (blockerId = ? AND blockedId = ?) OR (blockerId = ? AND blockedId = ?)`,
        [user.id, receiverId, receiverId, user.id]
      );
      if (blockRows.length > 0) {
        return NextResponse.json({ success: false, error: 'Cannot send message. This user has blocked you, or you have blocked them.' }, { status: 400 });
      }
    }

    const timestamp = new Date().toISOString();
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    let cleanFileUrl = fileUrl || null;
    if (cleanFileUrl && typeof cleanFileUrl === 'string') {
      cleanFileUrl = cleanFileUrl.replace(/(https?:\/\/storage\.flymediatech\.com\/uploads\/)+/g, 'https://storage.flymediatech.com/uploads/');
    }

    const messageData = {
      id: messageId,
      senderId: user.id,
      senderName: user.name,
      receiverId,
      messageType: messageType || 'text',
      content: content || null,
      fileUrl: cleanFileUrl,
      fileName: fileName || null,
      fileSize: fileSize || null,
      timestamp
    };

    const saved = await ChatMessage.addMessage(messageData);

    // Send Push Notification to recipient
    try {
      const notifTitle = `💬 New Message from ${user.name}`;
      const notifBody = messageType === 'image' 
        ? '📷 Sent an image' 
        : messageType === 'video' 
          ? '🎥 Sent a video' 
          : messageType === 'audio' 
            ? '🎙️ Sent a voice note' 
            : messageType === 'file' 
              ? '📎 Sent a file attachment' 
              : (content || 'Sent a message');

      if (!receiverId.startsWith('group_') && !receiverId.startsWith('dept_') && receiverId !== 'general') {
        sendPushNotification(receiverId, notifTitle, notifBody, {
          type: 'chat',
          senderId: user.id,
          senderName: user.name,
          chatId: user.id,
        });
      }
    } catch (notifErr) {
      console.warn('Failed to send chat push notification:', notifErr);
    }

    return NextResponse.json({ success: true, message: saved });
  } catch (err) {
    console.error('Send Chat API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
