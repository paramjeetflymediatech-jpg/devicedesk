import { NextResponse } from 'next/server';
import { getDbConnection } from '../../db/db.js';
import { checkAuth } from '../../utils/storageManager.js';

export async function GET(request) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDbConnection();
    
    // Fetch all active employees (excluding the current user)
    const [allUsers] = await db.execute(
      `SELECT id, name, email, role, department, status, avatarUrl 
       FROM employees 
       WHERE id != ? AND status = 'Active' 
       ORDER BY name ASC`,
      [user.id]
    );

    const userRole = (user.role || '').toLowerCase();
    const userDept = (user.department || '').toLowerCase();

    // 1. Admin/Management -> Can see everyone
    if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'management') {
      return NextResponse.json({ success: true, data: allUsers });
    }

    // 2. Client -> Can only see Team Leaders of active departments
    if (userRole === 'client') {
      // First, find all departments where this client has an active package override
      const [seoRows] = await db.execute('SELECT 1 FROM client_seo_reports WHERE client_id = ? LIMIT 1', [user.id]);
      const [smoRows] = await db.execute('SELECT 1 FROM client_smo_requests WHERE client_id = ? LIMIT 1', [user.id]);
      const [adsRows] = await db.execute('SELECT 1 FROM client_paid_ads WHERE client_id = ? LIMIT 1', [user.id]);
      
      const activeDepts = [];
      if (seoRows.length > 0) activeDepts.push('seo');
      if (smoRows.length > 0) activeDepts.push('smo');
      if (adsRows.length > 0) activeDepts.push('paid ads', 'ads');

      // Also check if they have package overrides
      const [pkgs] = await db.execute(`
        SELECT p.name 
        FROM client_package_overrides cpo 
        JOIN packages p ON cpo.package_id = p.id 
        WHERE cpo.client_id = ?
      `, [user.id]);

      pkgs.forEach(p => {
        const pName = (p.name || '').toLowerCase();
        if (pName.includes('seo')) activeDepts.push('seo');
        if (pName.includes('smo')) activeDepts.push('smo');
        if (pName.includes('ads') || pName.includes('paid')) activeDepts.push('paid ads', 'ads');
      });

      // Also fetch default department assignment from client_details (if primary_service exists)
      const [details] = await db.execute('SELECT primary_service FROM client_details WHERE client_id = ? LIMIT 1', [user.id]);
      if (details.length > 0 && details[0].primary_service) {
        activeDepts.push(details[0].primary_service.toLowerCase());
      }

      // Filter users: must be Team Leader AND in an active department
      const filtered = allUsers.filter(u => {
        const role = (u.role || '').toLowerCase();
        const dept = (u.department || '').toLowerCase();
        const isTeamLeader = role.includes('team leader') || role === 'tl';
        
        // If we couldn't determine active departments (maybe they are new), default to allowing them to see all Team Leaders.
        if (activeDepts.length === 0) return isTeamLeader; 

        return isTeamLeader && activeDepts.some(activeDept => dept.includes(activeDept) || activeDept.includes(dept));
      });

      return NextResponse.json({ success: true, data: filtered });
    }

    // 3. Team Leader -> Can see other Team Leaders, their own Team Members, and related Clients
    if (userRole.includes('team leader') || userRole === 'tl') {
      const filtered = allUsers.filter(u => {
        const uRole = (u.role || '').toLowerCase();
        const uDept = (u.department || '').toLowerCase();

        const isOtherTL = uRole.includes('team leader') || uRole === 'tl';
        const isMyTeamMember = uDept === userDept && !uRole.includes('admin') && !uRole.includes('client');
        const isClient = uRole === 'client'; // For now, allow seeing all clients (or could filter by active project)
        const isManagement = uRole === 'admin' || uRole === 'management';

        return isOtherTL || isMyTeamMember || isClient || isManagement;
      });
      return NextResponse.json({ success: true, data: filtered });
    }

    // 4. Team Member -> Can only see their Department's Team Leader, and Admins/Management (optional)
    const filtered = allUsers.filter(u => {
      const uRole = (u.role || '').toLowerCase();
      const uDept = (u.department || '').toLowerCase();
      const isMyTeamLeader = (uRole.includes('team leader') || uRole === 'tl') && uDept === userDept;
      const isManagement = uRole === 'admin' || uRole === 'management';
      
      return isMyTeamLeader || isManagement;
    });

    return NextResponse.json({ success: true, data: filtered });

  } catch (err) {
    console.error('Fetch Chat Contacts API Error:', err);
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}
