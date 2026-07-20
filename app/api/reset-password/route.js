import { NextResponse } from 'next/server';
import { getDbConnection } from '../db/db.js';
import bcrypt from 'bcryptjs';

/**
 * GET /api/reset-password?token=...
 * Action: Validates if a password reset token is active and unexpired.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, message: 'Token parameter is missing.' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [rows] = await db.execute(
      'SELECT id, email, expiresAt, used FROM password_reset_tokens WHERE token = ? LIMIT 1',
      [token]
    );

    if (rows.length === 0 || rows[0].used === 1) {
      return NextResponse.json({ valid: false, message: 'This password reset link is invalid or has already been used.' }, { status: 400 });
    }

    const expiresAt = new Date(rows[0].expiresAt).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json({ valid: false, message: 'This password reset link has expired. Please request a new one.' }, { status: 400 });
    }

    return NextResponse.json({ valid: true, email: rows[0].email });
  } catch (err) {
    console.error('Validate Reset Token error:', err);
    return NextResponse.json({ valid: false, message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/reset-password
 * Body: { token, newPassword }
 * Action: Sets new password, hashes with bcrypt, and expires the token.
 */
export async function POST(request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ success: false, message: 'Token and new password are required.' }, { status: 400 });
    }

    const db = await getDbConnection();

    // 1. Fetch token
    const [rows] = await db.execute(
      'SELECT id, email, expiresAt, used FROM password_reset_tokens WHERE token = ? LIMIT 1',
      [token]
    );

    if (rows.length === 0 || rows[0].used === 1) {
      return NextResponse.json({ success: false, message: 'This password reset link is invalid or has already been used.' }, { status: 400 });
    }

    const expiresAt = new Date(rows[0].expiresAt).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json({ success: false, message: 'This password reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const targetEmail = rows[0].email;

    // 2. Hash new password with bcrypt & pepper
    const pepper = process.env.PASSWORD_PEPPER || 'devicedesk_secure_pepper_key_2026';
    const hashedPassword = await bcrypt.hash(newPassword + pepper, 10);

    // 3. Update employee password in MySQL
    await db.execute(
      'UPDATE employees SET password = ? WHERE LOWER(email) = LOWER(?)',
      [hashedPassword, targetEmail]
    );

    // 4. Mark token as used immediately so it cannot be reused
    await db.execute(
      'UPDATE password_reset_tokens SET used = 1 WHERE token = ?',
      [token]
    );

    return NextResponse.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Reset Password API error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
