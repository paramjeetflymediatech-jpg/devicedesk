import { NextResponse } from 'next/server';
import { getDbConnection } from './db.js';
import { Employee } from './models/Employee.js';
import { System } from './models/System.js';
import { Ticket } from './models/Ticket.js';
import { AssignmentHistory } from './models/AssignmentHistory.js';
import { Department } from './models/Department.js';
import { Email } from './models/Email.js';
import { Task } from './models/Task.js';
import { sendPushNotification, sendPushNotificationToAdmins } from '../utils/pushNotifications.js';


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
      try {
        const currentTickets = await Ticket.getAll();
        const currentMap = new Map(currentTickets.map(t => [t.id, t]));
        
        if (Array.isArray(data)) {
          for (const newTicket of data) {
            const oldTicket = currentMap.get(newTicket.id);
            
            // Check 1: Newly raised ticket (status is Open and not previously present or wasn't Open)
            const isNewOpen = newTicket.status === 'Open' && (!oldTicket || oldTicket.status !== 'Open');
            if (isNewOpen) {
              const title = 'New Ticket Raised 🎫';
              const body = `${newTicket.employeeName || 'An employee'} raised a ticket: ${newTicket.category || 'Support Ticket'}`;
              const payload = { type: 'ticket_raised', ticketId: newTicket.id };

              sendPushNotificationToAdmins(title, body, payload)
                .catch(e => console.error('FCM Ticket Raised Push Error (Admins):', e));
            }

            // Check 2: Ticket marked Resolved/Completed
            const isNowResolved = newTicket.status === 'Resolved' && (!oldTicket || oldTicket.status !== 'Resolved');
            if (isNowResolved) {
              const title = 'Ticket Resolved ✅';
              const body = `Ticket "${newTicket.category || 'Support Ticket'}" has been marked as Resolved.`;
              const payload = { type: 'ticket_resolved', ticketId: newTicket.id };

              if (newTicket.employeeId) {
                sendPushNotification(newTicket.employeeId, title, body, payload)
                  .catch(e => console.error('FCM Ticket Resolved Push Error (Employee):', e));
              }

              sendPushNotificationToAdmins(title, body, payload)
                .catch(e => console.error('FCM Ticket Resolved Push Error (Admins):', e));
            }
          }
        }
      } catch (compareErr) {
        console.error('Error comparing tickets for push triggers:', compareErr);
      }
      await Ticket.saveAll(data);
    } else if (action === 'saveAssignmentHistory') {
      await AssignmentHistory.saveAll(data);
    } else if (action === 'saveDepartments') {
      await Department.saveAll(data);
    } else if (action === 'saveEmails') {
      await Email.saveAll(data);
    } else if (action === 'saveTasks') {
      try {
        const currentTasks = await Task.getAll();
        const currentMap = new Map(currentTasks.map(t => [t.id, t]));
        
        if (Array.isArray(data)) {
          for (const newTask of data) {
            const oldTask = currentMap.get(newTask.id);
            
            // Check 1: Newly assigned or assignee changed
            const hasNewAssignee = newTask.assignedTo && (!oldTask || oldTask.assignedTo !== newTask.assignedTo);
            if (hasNewAssignee) {
              sendPushNotification(
                newTask.assignedTo,
                'New Task Assigned 📋',
                `${newTask.assignedByName || 'Someone'} assigned you: ${newTask.title}`,
                { type: 'task_assigned', taskId: newTask.id }
              ).catch(e => console.error('FCM Task Assignment Push Error:', e));
            }

            // Check 2: Task status changed to Completed
            const isNowCompleted = newTask.status === 'Completed' && (!oldTask || oldTask.status !== 'Completed');
            if (isNowCompleted) {
              const title = 'Task Completed ✅';
              const body = `${newTask.assignedToName || 'Team member'} has completed: ${newTask.title}`;
              const payload = { type: 'task_completed', taskId: newTask.id };

              if (newTask.assignedBy && !['admin', 'Admin', 'system', 'System'].includes(String(newTask.assignedBy).trim())) {
                sendPushNotification(newTask.assignedBy, title, body, payload)
                  .catch(e => console.error('FCM Task Completion Push Error (Assigner):', e));
              }

              sendPushNotificationToAdmins(title, body, payload)
                .catch(e => console.error('FCM Task Completion Push Error (Admins):', e));
            }
          }
        }
      } catch (compareErr) {
        console.error('Error comparing tasks for push triggers:', compareErr);
      }
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
