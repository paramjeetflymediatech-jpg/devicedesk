import { NextResponse } from 'next/server';
import { checkAndSendSummaryReport } from '../../utils/fullAttendanceChecker.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'Morning';
    const force = searchParams.get('force') === 'true';
    const date = searchParams.get('date') || null;
    const result = await checkAndSendSummaryReport(null, period, force, date);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Check Attendance GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    let period = searchParams.get('period') || 'Morning';
    let force = searchParams.get('force') === 'true';
    let date = searchParams.get('date') || null;

    try {
      const body = await request.json();
      if (body.period) period = body.period;
      if (body.force !== undefined) force = Boolean(body.force);
      if (body.date) date = body.date;
    } catch (e) { }

    const result = await checkAndSendSummaryReport(null, period, force, date);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Check Attendance POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
