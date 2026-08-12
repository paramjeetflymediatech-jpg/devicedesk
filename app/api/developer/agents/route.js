import { NextResponse } from 'next/server';
import { getPool } from '../../db/db.js';

export async function GET(req) {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(`SELECT * FROM agent_registrations ORDER BY lastSeenAt DESC`);
      
      const activeAgents = [];
      const deletedAgents = [];

      const stats = {
        total: 0,
        windows: 0,
        mac: 0,
        linux: 0,
        online: 0,
        offline: 0,
        deleted: 0
      };

      const now = new Date();

      rows.forEach(agent => {
        if (agent.status === 'DELETED' || agent.status === 'LOGGED_OUT') {
          deletedAgents.push(agent);
          stats.deleted++;
        } else {
          activeAgents.push(agent);
          stats.total++;

          const platform = (agent.osPlatform || '').toLowerCase();
          if (platform.includes('win')) stats.windows++;
          else if (platform.includes('darwin') || platform.includes('mac')) stats.mac++;
          else if (platform.includes('linux') || platform.includes('ubuntu')) stats.linux++;

          // Online if seen in last 5 minutes
          const lastSeen = new Date(agent.lastSeenAt);
          const diffMs = now.getTime() - lastSeen.getTime();
          if (diffMs <= 5 * 60 * 1000) {
            stats.online++;
          } else {
            stats.offline++;
          }
        }
      });

      return NextResponse.json({ success: true, data: activeAgents, deletedData: deletedAgents, stats });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Fetch developer agents error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Agent ID is required' }, { status: 400 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.execute(`UPDATE agent_registrations SET status = 'DELETED' WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Agent successfully deleted' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete developer agent error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
