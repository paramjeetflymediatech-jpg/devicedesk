import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { id, newPassword } = await req.json();

    if (!id || !newPassword) {
      return NextResponse.json({ success: false, error: 'User ID and new password are required' }, { status: 400 });
    }

    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    const hashedPassword = await bcrypt.hash(newPassword + pepper, 10);

    const db = await getDbConnection();
    
    // Check if user exists
    const [users] = await db.execute('SELECT id FROM employees WHERE id = ?', [id]);
    if (users.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update password
    await db.execute('UPDATE employees SET password = ? WHERE id = ?', [hashedPassword, id]);

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
