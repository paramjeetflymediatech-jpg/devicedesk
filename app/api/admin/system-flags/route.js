import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';
import { isIosDisabled, getIosMaintenanceMessage } from '../../../utils/iosBlocker.js';

export async function GET(request) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const disabled = await isIosDisabled();
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT flag_key, flag_value, updated_at FROM app_system_flags WHERE flag_key = 'disable_ios_app' LIMIT 1"
    );

    return NextResponse.json({
      success: true,
      flags: {
        disable_ios_app: disabled,
        db_value: rows[0]?.flag_value || 'false',
        env_value: process.env.DISABLE_IOS_APP || 'unset',
        maintenance_message: getIosMaintenanceMessage(),
        updated_at: rows[0]?.updated_at || null
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await checkAuth(request);
    const role = (user?.role || '').toLowerCase();
    if (!user || (role !== 'admin' && role !== 'superadmin' && role !== 'super_admin' && role !== 'executive management')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { disable_ios_app } = await request.json();
    const flagVal = disable_ios_app === true || disable_ios_app === 'true' ? 'true' : 'false';

    const pool = getPool();
    await pool.execute(`
      INSERT INTO app_system_flags (flag_key, flag_value)
      VALUES ('disable_ios_app', ?)
      ON DUPLICATE KEY UPDATE flag_value = VALUES(flag_value), updated_at = CURRENT_TIMESTAMP
    `, [flagVal]);

    return NextResponse.json({
      success: true,
      message: `iOS application access has been set to: ${flagVal === 'true' ? 'DISABLED (Under Maintenance)' : 'ENABLED (Active)'}`,
      disable_ios_app: flagVal === 'true'
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
