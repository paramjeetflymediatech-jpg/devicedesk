import { NextResponse } from 'next/server';
import { EodReport } from '../db/models/EodReport.js';

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
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error updating EOD report:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
