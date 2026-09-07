import { NextResponse } from 'next/server';
import { checkAndSendSummaryReport } from '../../utils/fullAttendanceChecker.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'Morning';
    const force = searchParams.get('force') === 'true';
    const result = await checkAndSendSummaryReport(null, period, force);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Check Attendance GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    let period = 'Morning';
    let force = false;
    try {
      const body = await request.json();
      if (body.period) period = body.period;
      if (body.force) force = true;
    } catch(e) {}
    
    const result = await checkAndSendSummaryReport(null, period, force);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Check Attendance POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
