import { getPool } from '../db.js';

export class ChatMessage {
  static async getMessagesForUser(userId, departmentName) {
    const db = getPool();
    // Fetch messages the user is authorized to view
    // (General channel, their Department channel, DMs involving them, or any Group they are in)
    const deptChannel = `dept_${departmentName || ''}`;
    // Auto-repair any corrupt double-prefixed fileUrl records in the database
    try {
      await db.execute(
        `UPDATE chat_messages 
         SET fileUrl = REPLACE(fileUrl, 'https://storage.flymediatech.com/uploads/https://storage.flymediatech.com/uploads/', 'https://storage.flymediatech.com/uploads/') 
         WHERE fileUrl LIKE '%https://storage.flymediatech.com/uploads/https://storage.flymediatech.com/uploads/%'`
      );
    } catch (e) {}

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

    // Sanitize any remaining malformed fileUrl strings before sending to client
    const sanitizedRows = rows.map((row) => {
      if (row.fileUrl && typeof row.fileUrl === 'string') {
        row.fileUrl = row.fileUrl.replace(/(https?:\/\/storage\.flymediatech\.com\/uploads\/)+/g, 'https://storage.flymediatech.com/uploads/');
      }
      return row;
    });

    return sanitizedRows;
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
