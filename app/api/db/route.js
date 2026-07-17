import { NextResponse } from 'next/server';
import { getDbConnection } from './db.js';
import { Employee } from './models/Employee.js';
import { System } from './models/System.js';
import { Ticket } from './models/Ticket.js';
import { AssignmentHistory } from './models/AssignmentHistory.js';
import { Department } from './models/Department.js';
import { Email } from './models/Email.js';
import { Task } from './models/Task.js';

export async function GET() {
  try {
    // Ensure DB connection is active and tables are initialized
    await getDbConnection();

    const employees          = await Employee.getAll();
    const systems            = await System.getAll();
    const tickets            = await Ticket.getAll();
    const assignment_history = await AssignmentHistory.getAll();
    const departments        = await Department.getAll();
    const sent_emails_raw    = await Email.getAll();
    const tasks              = await Task.getAll();

    const sent_emails = sent_emails_raw.map(e => ({
      id:        e.id,
      to:        e.to_address,
      subject:   e.subject,
      body:      e.body,
      timestamp: e.timestamp
    }));

    return NextResponse.json({ employees, systems, tickets, assignment_history, departments, sent_emails, tasks });
  } catch (err) {
    console.error('MySQL GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, data } = await request.json();
    // Ensure DB connection is active and tables are initialized
    await getDbConnection();

    if (action === 'saveSystems') {
      await System.saveAll(data);
    } else if (action === 'saveEmployees') {
      await Employee.saveAll(data);
    } else if (action === 'saveTickets') {
      await Ticket.saveAll(data);
    } else if (action === 'saveAssignmentHistory') {
      await AssignmentHistory.saveAll(data);
    } else if (action === 'saveDepartments') {
      await Department.saveAll(data);
    } else if (action === 'saveEmails') {
      await Email.saveAll(data);
    } else if (action === 'saveTasks') {
      await Task.saveAll(data);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('MySQL POST Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
