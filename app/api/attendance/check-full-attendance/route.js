import { NextResponse } from 'next/server';
import { checkAndSendFullAttendanceReport } from '../../utils/fullAttendanceChecker.js';

export async function GET() {
  try {
    const result = await checkAndSendFullAttendanceReport();
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Check Full Attendance GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await checkAndSendFullAttendanceReport();
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Check Full Attendance POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
