import { getDbConnection } from '../db/db.js';
import { Employee } from '../db/models/Employee.js';
import { System } from '../db/models/System.js';
import { Ticket } from '../db/models/Ticket.js';
import { AssignmentHistory } from '../db/models/AssignmentHistory.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'systems';

    await getDbConnection();

    const employees = await Employee.getAll();
    const systems = await System.getAll();
    const tickets = await Ticket.getAll();
    const history = await AssignmentHistory.getAll();

    let csvString = '';
    let filename = '';

    if (type === 'systems') {
      filename = `devicedesk_systems_directory_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = ["System ID", "System Number", "Model", "OS", "CPU", "GPU", "RAM", "Storage", "Status", "Assigned To", "Employee Name", "Remarks"];
      const csvRows = [
        headers.join(","),
        ...systems.map(s => {
          const emp = employees.find(e => e.id === s.assignedTo) || { name: 'Unassigned' };
          const row = [
            s.id,
            s.systemNumber,
            s.model || "Generic PC",
            s.os || "Windows 11 Pro",
            s.cpu || "Intel Core i5",
            s.gpu || "Integrated Graphics",
            s.ram || "16 GB",
            s.storage || "512 GB SSD",
            s.status || "Active",
            s.assignedTo || "Unassigned",
            emp.name,
            s.remarks ? `"${s.remarks.replace(/"/g, '""')}"` : ""
          ];
          return row.map(val => val === null || val === undefined ? "" : String(val)).join(",");
        })
      ];
      csvString = "\uFEFF" + csvRows.join("\n");

    } else if (type === 'tickets') {
      filename = `devicedesk_ticket_reports_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = ["Ticket ID", "Category", "Description", "Severity", "Status", "System ID", "System Number", "Raised By", "Employee Name", "Created At", "Started At", "Resolved At", "Resolution Remarks"];
      const csvRows = [
        headers.join(","),
        ...tickets.map(t => {
          const emp = employees.find(e => e.id === t.employeeId) || { name: 'Unknown' };
          const sys = systems.find(s => s.id === t.systemId) || { systemNumber: 'N/A' };
          const row = [
            t.id,
            t.category,
            t.description ? `"${t.description.replace(/"/g, '""')}"` : "",
            t.severity,
            t.status,
            t.systemId,
            t.systemNumber || sys.systemNumber,
            t.raisedBy || t.employeeId,
            t.raisedByName || emp.name,
            t.createdAt ? new Date(t.createdAt).toLocaleString() : "",
            t.startedAt ? new Date(t.startedAt).toLocaleString() : "",
            t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : "",
            t.resolutionRemarks || t.notes ? `"${(t.resolutionRemarks || t.notes).replace(/"/g, '""')}"` : ""
          ];
          return row.map(val => val === null || val === undefined ? "" : String(val)).join(",");
        })
      ];
      csvString = "\uFEFF" + csvRows.join("\n");

    } else if (type === 'employees') {
      filename = `devicedesk_employees_directory_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = ["Employee ID", "Name", "Email", "Role", "Department", "Ticket Limit", "Assigned Systems"];
      const csvRows = [
        headers.join(","),
        ...employees.map(e => {
          const assigned = systems.filter(sys => sys.assignedTo === e.id).map(sys => sys.systemNumber).join(" | ");
          const row = [
            e.id,
            e.name,
            e.email || "N/A",
            e.role || "Team Member",
            e.department || "Operations",
            e.ticketLimit || 5,
            assigned ? `"${assigned}"` : "None"
          ];
          return row.map(val => val === null || val === undefined ? "" : String(val)).join(",");
        })
      ];
      csvString = "\uFEFF" + csvRows.join("\n");

    } else if (type === 'history') {
      filename = `devicedesk_transfer_logs_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = ["Log ID", "Action", "System ID", "System Number", "Employee ID", "Employee Name", "Timestamp", "Assigned By"];
      const csvRows = [
        headers.join(","),
        ...history.map(log => {
          const emp = employees.find(e => e.id === log.employeeId) || { name: 'Unknown' };
          const row = [
            log.id,
            log.action,
            log.systemId,
            log.systemNumber,
            log.employeeId,
            emp.name,
            log.timestamp ? new Date(log.timestamp).toLocaleString() : "",
            log.assignedBy || "System"
          ];
          return row.map(val => val === null || val === undefined ? "" : String(val)).join(",");
        })
      ];
      csvString = "\uFEFF" + csvRows.join("\n");
    } else {
      return new Response('Invalid export type', { status: 400 });
    }

    return new Response(csvString, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (err) {
    console.error('MySQL export GET Error:', err);
    return new Response(err.message, { status: 500 });
  }
}
