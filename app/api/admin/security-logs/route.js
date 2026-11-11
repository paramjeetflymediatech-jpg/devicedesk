import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';
import { ensureSecurityLogsTable } from '../../utils/securityLogger.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await checkAuth(request);
    const dbRoleStr = `${user?.dbRole || user?.role || ''}`.toLowerCase().trim();
    const isAdmin = dbRoleStr === 'admin' || dbRoleStr === 'superadmin' || dbRoleStr === 'management';

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const category = (searchParams.get('category') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const action = (searchParams.get('action') || '').trim();
    const search = (searchParams.get('search') || '').trim();
    const ip = (searchParams.get('ip') || '').trim();
    const timeframe = (searchParams.get('timeframe') || 'all').trim();

    const db = await getDbConnection();
    await ensureSecurityLogsTable(db);

    const conditions = [];
    const params = [];

    if (category && category !== 'ALL') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (status && status !== 'ALL') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (action && action !== 'ALL') {
      conditions.push('action = ?');
      params.push(action);
    }

    if (ip) {
      conditions.push('ip_address = ?');
      params.push(ip);
    }

    if (timeframe === 'today') {
      conditions.push('created_at >= CURDATE()');
    } else if (timeframe === '7d') {
      conditions.push('created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    } else if (timeframe === '30d') {
      conditions.push('created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    }

    if (search) {
      conditions.push('(ip_address LIKE ? OR identifier LIKE ? OR user_name LIKE ? OR action LIKE ? OR details LIKE ?)');
      const wild = `%${search}%`;
      params.push(wild, wild, wild, wild, wild);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Get total matching count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM security_audit_logs ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // 2. Get paginated logs
    const [logs] = await db.query(
      `SELECT * FROM security_audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 3. Compute Security Statistics
    let stats = {
      totalEvents: total,
      failedLogins24h: 0,
      passwordResets24h: 0,
      blockedAttempts24h: 0,
      suspiciousIps: []
    };

    try {
      const [statsRows] = await db.query(`
        SELECT 
          COUNT(CASE WHEN action = 'LOGIN_FAILED' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as failed_logins_24h,
          COUNT(CASE WHEN category = 'PASSWORD_RESET' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as resets_24h,
          COUNT(CASE WHEN status = 'BLOCKED' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as blocked_24h
        FROM security_audit_logs
      `);

      if (statsRows.length > 0) {
        stats.failedLogins24h = statsRows[0].failed_logins_24h || 0;
        stats.passwordResets24h = statsRows[0].resets_24h || 0;
        stats.blockedAttempts24h = statsRows[0].blocked_24h || 0;
      }

      // Suspicious IPs: Any IP with >= 3 failed logins or blocked attempts in the past 24 hours
      const [suspiciousRows] = await db.query(`
        SELECT 
          ip_address, 
          country,
          COUNT(*) as attempt_count,
          MAX(created_at) as last_attempt,
          GROUP_CONCAT(DISTINCT identifier SEPARATOR ', ') as targeted_accounts
        FROM security_audit_logs
        WHERE (status = 'FAILURE' OR status = 'BLOCKED')
          AND action IN ('LOGIN_FAILED', 'LOGIN_BLOCKED', 'OTP_VERIFY_FAILED')
          AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
          AND ip_address IS NOT NULL AND ip_address != '' AND ip_address != '127.0.0.1'
        GROUP BY ip_address, country
        HAVING attempt_count >= 3
        ORDER BY attempt_count DESC
        LIMIT 10
      `);

      stats.suspiciousIps = suspiciousRows.map(r => ({
        ip: r.ip_address,
        country: r.country,
        attempts: r.attempt_count,
        lastAttempt: r.last_attempt,
        targetedAccounts: r.targeted_accounts
      }));
    } catch (statsErr) {
      console.warn('Error fetching security stats:', statsErr);
    }

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      },
      stats
    });
  } catch (err) {
    console.error('Fetch Security Audit Logs API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

