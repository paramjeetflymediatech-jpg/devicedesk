import { NextResponse } from 'next/server';
import { EodReport } from '../db/models/EodReport.js';
import { logSecurityEvent } from '../utils/securityLogger.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const today = searchParams.get('today');
    
    if (employeeId) {
      if (today === 'true') {
        const report = await EodReport.getTodayByEmployeeId(employeeId);
        return NextResponse.json({ success: true, data: report });
      }
      const reports = await EodReport.getByEmployeeId(employeeId);
      return NextResponse.json({ success: true, data: reports });
    }
    
    const allReports = await EodReport.getAll();
    return NextResponse.json({ success: true, data: allReports });
  } catch (err) {
    console.error('Error fetching EOD reports:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    if (!data.id) {
      data.id = 'eod_' + Date.now();
    }
    await EodReport.createOrUpdate(data);

    // Audit log: track submitter browser profile vs target employee
    try {
      await logSecurityEvent({
        request,
        action: 'EOD_REPORT_SUBMIT',
        category: 'EMPLOYEE_REQUEST',
        status: 'SUCCESS',
        targetUser: {
          id: data.employeeId,
          name: data.employeeName
        },
        details: {
          reportId: data.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          date: data.date
        }
      });
    } catch (logErr) {
      console.error('Failed to log EOD report security event:', logErr);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error saving EOD report:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    await EodReport.createOrUpdate(data);

    // Audit log: track submitter browser profile vs target employee
    try {
      await logSecurityEvent({
        request,
        action: 'EOD_REPORT_UPDATE',
        category: 'EMPLOYEE_REQUEST',
        status: 'SUCCESS',
        targetUser: {
          id: data.employeeId,
          name: data.employeeName
        },
        details: {
          reportId: data.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          date: data.date
        }
      });
    } catch (logErr) {
      console.error('Failed to log EOD report update security event:', logErr);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error updating EOD report:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
