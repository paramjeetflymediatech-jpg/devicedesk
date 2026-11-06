import { NextResponse } from 'next/server';
import { publishDuePosts } from '../../utils/smoScheduler';

export async function GET() {
  try {
    const outcome = await publishDuePosts();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...outcome
    });
  } catch (error) {
    console.error('Cron SMO Publisher Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}

