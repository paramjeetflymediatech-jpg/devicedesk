import { NextResponse } from 'next/server';
import { checkAndSendSummaryReport } from '../../utils/fullAttendanceChecker.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'Morning';
    const result = await checkAndSendSummaryReport(null, period);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Check Attendance GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    let period = 'Morning';
    try {
      const body = await request.json();
      if (body.period) period = body.period;
    } catch(e) {}
    
    const result = await checkAndSendSummaryReport(null, period);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Check Attendance POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
