/**
 * AI Social Media Caption & Hashtags Generator
 * Automatically generates high-converting marketing copy and trending hashtags
 * using Gemini AI with intelligent fallback algorithms.
 */

export async function generateAICaption({ requirement = '', brandName = 'Flymedia Technology', bannerUrl = null } = {}) {
  const brand = brandName || 'Flymedia Technology';
  const cleanReq = (requirement || '').trim();

  // Try Google Gemini AI first
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const prompt = `You are a world-class Social Media Marketing & Copywriting Expert for the brand "${brand}".
Write an engaging, high-converting social media caption and relevant hashtags for this creative design brief:
"${cleanReq || 'Promotional branding post showcasing quality services and value'}"

Requirements:
- Catchy opening hook with relevant emojis
- Clear, engaging value proposition
- Compelling Call To Action (e.g., DM us, visit link in bio, or contact today)
- 4-8 targeted, high-traffic hashtags (including #${brand.replace(/[^a-zA-Z0-9]/g, '')})

Format your response strictly as JSON:
{
  "caption": "Your compelling post caption here with line breaks\\n\\nCall to Action here",
  "hashtags": "#Tag1 #Tag2 #Tag3"
}`;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.caption) {
            return {
              caption: parsed.caption,
              hashtags: parsed.hashtags || `#${brand.replace(/[^a-zA-Z0-9]/g, '')} #SocialMedia #Trending`
            };
          }
        }
      }
    } catch (err) {
      console.warn('Gemini caption generation skipped or timed out, using smart marketing template:', err.message);
    }
  }

  // Smart Fallback Marketing Generator
  const lower = cleanReq.toLowerCase();
  let headline = `✨ Elevate Your Business with ${brand}!`;
  let cta = '👉 DM us today or visit the link in bio to get started!';
  const brandTag = `#${brand.replace(/[^a-zA-Z0-9]/g, '')}`;
  const tags = [brandTag, '#DigitalGrowth', '#Trending', '#Flymedia'];

  if (lower.includes('sale') || lower.includes('discount') || lower.includes('off') || lower.includes('%')) {
    headline = '🔥 SPECIAL OFFER ALERT! Limited Time Only! 🔥';
    cta = '🛍️ Grab this exclusive deal before it expires! Tap the link in bio to shop now ⏳';
    tags.push('#SpecialOffer', '#SaleAlert', '#MegaDiscount', '#ShopNow');
  } else if (lower.includes('festival') || lower.includes('diwali') || lower.includes('new year') || lower.includes('celebrat') || lower.includes('eid') || lower.includes('christmas')) {
    headline = '🎉 Wishing You Joy, Prosperity & Incredible Success! ✨';
    cta = 'Celebrate this special moment with us. Connect with our team today! 🌟';
    tags.push('#FestiveVibes', '#Celebration', '#JoyAndSuccess');
  } else if (lower.includes('hiring') || lower.includes('job') || lower.includes('career') || lower.includes('vacancy')) {
    headline = '🚀 WE ARE HIRING! Step Into Your Next Career Milestone 💼';
    cta = '📩 Share your resume / portfolio or apply through the link in our bio today!';
    tags.push('#WeAreHiring', '#CareerOpportunity', '#JoinOurTeam', '#HiringNow');
  } else if (lower.includes('launch') || lower.includes('new product') || lower.includes('announc')) {
    headline = '🚀 BIG ANNOUNCEMENT! Introducing Something New & Powerful ✨';
    cta = '💡 Be the first to explore what we have built for you. Link in bio!';
    tags.push('#NewLaunch', '#ProductLaunch', '#Innovation', '#NextLevel');
  } else {
    headline = `✨ ${cleanReq.slice(0, 70)}${cleanReq.length > 70 ? '...' : ''}`;
    cta = '💡 Transform your goals into results today. Send us a message to learn more!';
    tags.push('#BusinessGrowth', '#SuccessMindset', '#Innovation');
  }

  const caption = `${headline}\n\n${cleanReq || 'Discover top-tier solutions designed to help you stand out and achieve more.'}\n\n${cta}`;
  const hashtags = Array.from(new Set(tags)).join(' ');

  return {
    caption,
    hashtags
  };
}
