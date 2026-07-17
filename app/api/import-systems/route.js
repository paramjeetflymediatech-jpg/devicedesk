import { NextResponse } from 'next/server';
import { getDbConnection, getPool } from '../db/db.js';
import { System } from '../db/models/System.js';

export async function POST(request) {
  try {
    await getDbConnection();

    const { systems: incoming } = await request.json();

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'No system records provided.' }, { status: 400 });
    }

    const db = getPool();

    // Fetch existing systems for duplicate check
    const existing = await System.getAll();
    const existingNumbers = new Set(
      existing.map(s => (s.systemNumber || '').trim().toLowerCase())
    );

    // Fetch all employees so we can resolve "Assigned To" by name or email
    const [empRows] = await db.execute('SELECT id, name, email FROM employees');
    const empByName  = new Map(empRows.map(e => [e.name.trim().toLowerCase(),  e.id]));
    const empByEmail = new Map(empRows.map(e => [(e.email || '').trim().toLowerCase(), e.id]));

    const imported   = [];
    const duplicates = [];
    const errors     = [];

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

      // Resolve "Assigned To" column — accept employee name or email
      const assignedToRaw = (row.assignedTo || row['Assigned To'] || row['Assigned Employee'] || row['Employee'] || '').toString().trim();
      let assignedTo = null;
      let assignedToName = 'Unassigned';

      if (assignedToRaw) {
        const key = assignedToRaw.toLowerCase();
        // Try name match first, then email
        if (empByName.has(key)) {
          assignedTo     = empByName.get(key);
          assignedToName = assignedToRaw;
        } else if (empByEmail.has(key)) {
          assignedTo     = empByEmail.get(key);
          assignedToName = assignedToRaw;
        } else {
          // Employee not found — record as error note but still import system as unassigned
          errors.push({ reason: `Employee not found for system "${systemNumber}": "${assignedToRaw}" — imported as Unassigned` });
        }
      }

      const newSystem = {
        id:         'sys_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        systemNumber,
        model:      (row.model   || row['Model']   || 'Generic PC').toString().trim(),
        os:         (row.os      || row['OS']       || 'Windows 11 Pro').toString().trim(),
        cpu:        (row.cpu     || row['CPU']      || 'Intel Core i5').toString().trim(),
        gpu:        (row.gpu     || row['GPU']      || 'Integrated Graphics').toString().trim(),
        ram:        (row.ram     || row['RAM']      || '8 GB').toString().trim(),
        storage:    (row.storage || row['Storage']  || '256 GB SSD').toString().trim(),
        status:     (row.status  || row['Status']   || 'Active').toString().trim(),
        assignedTo,
        remarks:    (row.remarks || row['Remarks']  || '').toString().trim(),
      };

      await db.execute(
        `INSERT INTO systems (id, systemNumber, cpu, gpu, ram, storage, os, model, assignedTo, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newSystem.id, newSystem.systemNumber, newSystem.cpu, newSystem.gpu, newSystem.ram,
         newSystem.storage, newSystem.os, newSystem.model, newSystem.assignedTo, newSystem.status, newSystem.remarks]
      );

      // Log system addition
      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      await db.execute(
        `INSERT INTO assignment_history (id, employeeId, systemId, systemNumber, action, timestamp, assignedBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [logId, null, newSystem.id, newSystem.systemNumber, 'System Added (Imported)', new Date().toISOString(), 'Admin']
      ).catch(err => console.error('Failed to log system import:', err));

      // Log assignment history if assigned
      if (assignedTo) {
        const assignmentLogId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        await db.execute(
          `INSERT INTO assignment_history (id, systemId, systemNumber, employeeId, action, assignedBy, timestamp) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [assignmentLogId, newSystem.id, newSystem.systemNumber, assignedTo, 'Assigned', 'Bulk Import']
        ).catch(err => console.error('Failed to log system assignment on import:', err));
      }

      existingNumbers.add(systemNumber.toLowerCase());
      imported.push({ ...newSystem, assignedToName });
    }

    return NextResponse.json({ success: true, imported: imported.length, duplicates, errors });
  } catch (err) {
    console.error('Bulk import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
