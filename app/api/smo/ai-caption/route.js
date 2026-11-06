import { NextResponse } from 'next/server';
import { generateAICaption } from '../../utils/generateCaption';

export async function POST(req) {
  try {
    const { requirement, brandName, bannerUrl } = await req.json();

    if (!requirement || !requirement.trim()) {
      return NextResponse.json({ success: false, error: 'Requirement text is required.' }, { status: 400 });
    }

    const result = await generateAICaption({
      requirement,
      brandName,
      bannerUrl
    });

    return NextResponse.json({
      success: true,
      caption: result.caption,
      hashtags: result.hashtags
    });
  } catch (error) {
    console.error('AI Caption API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
