import { getPool } from '../db.js';

export class ChatMessage {
  static async getMessagesForUser(userId, departmentName) {
    const db = getPool();
    // Fetch messages the user is authorized to view
    // (General channel, their Department channel, DMs involving them, or any Group they are in)
    const deptChannel = `dept_${departmentName || ''}`;
    const [rows] = await db.execute(
      `SELECT * FROM chat_messages 
       WHERE receiverId = 'general'
          OR receiverId = ?
          OR senderId = ?
          OR receiverId = ?
          OR receiverId IN (SELECT groupId FROM chat_group_members WHERE employeeId = ?)
       ORDER BY timestamp ASC
       LIMIT 1000`,
      [deptChannel, userId, userId, userId]
    );
    return rows;
  }

  static async addMessage(msg) {
    const db = getPool();
    await db.execute(
      `INSERT INTO chat_messages (id, senderId, senderName, receiverId, messageType, content, fileUrl, fileName, fileSize, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        msg.id,
        msg.senderId,
        msg.senderName,
        msg.receiverId,
        msg.messageType || 'text',
        msg.content || null,
        msg.fileUrl || null,
        msg.fileName || null,
        msg.fileSize || null,
        msg.timestamp
      ]
    );
    return msg;
  }
}
