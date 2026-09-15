import { getDbConnection } from '../db/db.js';

/**
 * Checks if a given user is authorized to view / communicate with Marketing team members.
 * Returns true if:
 * 1. User has Admin / Superadmin / Management role.
 * 2. User belongs to the Marketing department.
 * 3. User is explicitly granted access in `marketing_authorizations` table by Admin.
 */
export async function isMarketingAuthorized(user) {
  if (!user) return false;

  const role = (user.role || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();

  // 1. Admin / Management / Superadmin always authorized
  if (role.includes('admin') || role.includes('superadmin') || role.includes('management')) {
    return true;
  }

  // 2. Members within Marketing department are authorized with each other
  if (dept === 'marketing' || role.includes('marketing')) {
    return true;
  }

  // 3. Check explicit authorization in database
  try {
    const db = await getDbConnection();
    const [rows] = await db.query(
      `SELECT employeeId FROM marketing_authorizations WHERE employeeId = ? LIMIT 1`,
      [user.id]
    );
    return rows && rows.length > 0;
  } catch (e) {
    // If table doesn't exist yet, fallback to role check
    return false;
  }
}

/**
 * Returns a list of employee IDs authorized by Admin to access Marketing members.
 */
export async function getAuthorizedMarketingEmployeeIds() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.query(`SELECT employeeId FROM marketing_authorizations`);
    return rows.map(r => r.employeeId);
  } catch (e) {
    return [];
  }
}
