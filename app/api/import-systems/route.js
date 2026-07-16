import { NextResponse } from 'next/server';
import { getDbConnection, getPool } from '../db/db.js';
import { System } from '../db/models/System.js';

export async function POST(request) {
  try {
    await getDbConnection();

    const body = await request.json();
    const { systems: incoming } = body;

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'No system records provided.' }, { status: 400 });
    }

    const existing = await System.getAll();
    const existingNumbers = new Set(
      existing.map(s => (s.systemNumber || '').trim().toLowerCase())
    );

    const imported = [];
    const duplicates = [];
    const errors = [];
    const db = getPool();

    for (const row of incoming) {
      const systemNumber = (row.systemNumber || row['System Number'] || '').toString().trim();

      if (!systemNumber) {
        errors.push({ reason: 'Missing System Number' });
        continue;
      }

      if (existingNumbers.has(systemNumber.toLowerCase())) {
        duplicates.push(systemNumber);
        continue;
      }

      const newSystem = {
        id: 'sys_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        systemNumber,
        model:   (row.model   || row['Model']   || 'Generic PC').toString().trim(),
        os:      (row.os      || row['OS']       || 'Windows 11 Pro').toString().trim(),
        cpu:     (row.cpu     || row['CPU']      || 'Intel Core i5').toString().trim(),
        gpu:     (row.gpu     || row['GPU']      || 'Integrated Graphics').toString().trim(),
        ram:     (row.ram     || row['RAM']      || '8 GB').toString().trim(),
        storage: (row.storage || row['Storage']  || '256 GB SSD').toString().trim(),
        status:  (row.status  || row['Status']   || 'Active').toString().trim(),
        assignedTo: null,
        remarks: (row.remarks || row['Remarks']  || '').toString().trim(),
      };

      await db.execute(
        `INSERT INTO systems (id, systemNumber, cpu, gpu, ram, storage, os, model, assignedTo, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newSystem.id, newSystem.systemNumber, newSystem.cpu, newSystem.gpu, newSystem.ram,
         newSystem.storage, newSystem.os, newSystem.model, newSystem.assignedTo, newSystem.status, newSystem.remarks]
      );

      existingNumbers.add(systemNumber.toLowerCase());
      imported.push(newSystem);
    }

    return NextResponse.json({ success: true, imported: imported.length, duplicates, errors });
  } catch (err) {
    console.error('Bulk import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
