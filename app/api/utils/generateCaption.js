/**
 * AI Social Media Caption & Hashtags Generator
 * Multimodal AI: Analyzes the team member's submitted banner image and client requirements
 * to generate high-converting, original social media copy and trending hashtags.
 */

// Helper: Clean raw requirements into a concise marketing objective
function cleanRequirementBrief(raw) {
  if (!raw) return '';
  let str = String(raw);

  // Strip system booking headers, prompt labels, and internal notes
  str = str
    .replace(/Booking for package:[^\n]*/gi, '')
    .replace(/My Requirements?:?/gi, '')
    .replace(/Client Requirements?:?/gi, '')
    .replace(/Client Requirement Brief:?/gi, '')
    .replace(/Requirement Brief:?/gi, '')
    .replace(/Requirements?:?/gi, '')
    .replace(/Client Brief:?/gi, '')
    .replace(/Please prioritize[^\n]*/gi, '')
    .replace(/TL Note:[^\n]*/gi, '')
    .replace(/Employee Note:[^\n]*/gi, '')
    .replace(/Specialist Note:[^\n]*/gi, '')
    .trim();

  // Normalize spaces
  str = str.replace(/\s+/g, ' ').trim();
  return str;
}

// Helper: Fetch image from URL or data URI and convert to Gemini inlineData part
async function fetchImagePart(bannerUrl) {
  if (!bannerUrl || typeof bannerUrl !== 'string') return null;
  const cleanUrl = bannerUrl.trim();
  if (!cleanUrl) return null;

  try {
    // 1. Data URI
    if (cleanUrl.startsWith('data:image/')) {
      const match = cleanUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        };
      }
    }

    // 2. Local relative path or HTTP/HTTPS
    let fetchUrl = cleanUrl;
    if (cleanUrl.startsWith('/')) {
      const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetchUrl = `${host}${cleanUrl}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout
    const res = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Limit image size to 5MB
    if (buffer.length > 5 * 1024 * 1024) return null;

    let mimeType = res.headers.get('content-type') || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      if (cleanUrl.endsWith('.png')) mimeType = 'image/png';
      else if (cleanUrl.endsWith('.webp')) mimeType = 'image/webp';
      else if (cleanUrl.endsWith('.gif')) mimeType = 'image/gif';
      else mimeType = 'image/jpeg';
    }

    return {
      inlineData: {
        mimeType: mimeType.split(';')[0],
        data: buffer.toString('base64')
      }
    };
  } catch (err) {
    console.warn('Could not fetch banner image for multimodal AI analysis:', err.message);
    return null;
  }
}

export async function generateAICaption({ requirement = '', brandName = 'Flymedia Technology', bannerUrl = null } = {}) {
  const brand = brandName || 'Flymedia Technology';
  const cleanGoal = cleanRequirementBrief(requirement);
  const brandTag = `#${brand.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Try Google Gemini Multimodal AI
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      // Fetch the banner image part if available
      const imagePart = await fetchImagePart(bannerUrl);

      const prompt = `You are a world-class Social Media Copywriter and Creative Director for the brand "${brand}".

TASK:
Write an authentic, compelling, and high-converting social media post caption and trending hashtags ready for Instagram and Facebook.

ANALYSIS INPUTS:
${imagePart ? '1. CREATIVE BANNER IMAGE (ATTACHED): Thoroughly analyze the team member\'s submitted banner design. Examine the visual style, typography, graphics, main headline text on the banner, color scheme, seasonal/promotional theme, and emotional tone.' : '1. CREATIVE BANNER: A professional branding banner designed for this campaign.'}
2. CLIENT MARKETING INTENT: "${cleanGoal || 'Promote brand value, quality services, and positive audience engagement.'}"

STRICT GUIDELINES:
- DO NOT quote, repeat, or paste internal instructions, requirement briefs, booking notes, or phrases like "Client Requirement Brief" or "My Requirements".
- Craft ORIGINAL, engaging marketing copy that speaks directly to the audience/customers.
- Structure:
  * Hook: Catchy opening headline with 1-2 relevant emojis.
  * Body: 2-3 engaging sentences highlighting the theme, festive greeting, or value proposition.
  * Call to Action (CTA): A clear, natural next step (e.g. DM us today, tap the link in bio, or leave a comment).
- Include 5-8 targeted, high-traffic hashtags (including ${brandTag}).

Format your response STRICTLY as JSON:
{
  "caption": "Your clean, engaging post caption here with line breaks\\n\\nCall to Action here",
  "hashtags": "#Tag1 #Tag2 #Tag3"
}`;

      const contentsParts = [{ text: prompt }];
      if (imagePart) {
        contentsParts.push(imagePart);
      }

      // Try gemini-3.5-flash first, fallback to gemini-3.5-flash-lite
      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
      for (const model of modelsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 9500);

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: contentsParts }],
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
              if (parsed.caption && parsed.caption.trim()) {
                return {
                  caption: parsed.caption.trim(),
                  hashtags: (parsed.hashtags || `${brandTag} #SocialMedia #Trending`).trim()
                };
              }
            }
          }
        } catch (mErr) {
          console.warn(`Gemini ${model} attempt failed:`, mErr.message);
        }
      }
    } catch (err) {
      console.warn('Gemini caption generation skipped or failed:', err.message);
    }
  }

  // Smart Fallback Marketing Generator (Clean, Professional, Zero Brief Text Leakage)
  const lower = cleanGoal.toLowerCase();
  let headline = `✨ Elevate Your Standards with ${brand}! ✨`;
  let body = `Bringing you dedicated solutions, passion, and creativity crafted to help you stand out and achieve more. Experience the difference quality makes.`;
  let cta = '👉 Ready to take your journey to the next level? Send us a message or visit the link in our bio today!';
  const tags = [brandTag, '#DigitalGrowth', '#Trending', '#Flymedia'];

  if (lower.includes('diwali') || lower.includes('deepavali')) {
    headline = '✨ May the Divine Light of Diwali Illuminate Your Life with Joy & Success! 🪔';
    body = `As the festive lights shine bright, we celebrate new beginnings, prosperity, and endless possibilities. Wishing you and your loved ones a sparkling, safe, and truly blessed Diwali celebration!`;
    cta = '🌟 Share the festive warmth — what is your favorite Diwali tradition? Tell us in the comments below!';
    tags.push('#HappyDiwali', '#FestivalOfLights', '#DiwaliCelebration', '#Prosperity', '#FestiveVibes');
  } else if (lower.includes('festival') || lower.includes('new year') || lower.includes('celebrat') || lower.includes('eid') || lower.includes('christmas')) {
    headline = '🎉 Wishing You Joy, Prosperity & Incredible Success! ✨';
    body = `Moments like these remind us to cherish the people and milestones that make life special. From all of us at ${brand}, may this festive season bring immense happiness and good health to you and your family!`;
    cta = '🌟 Celebrate this wonderful occasion with us. Connect with our team today!';
    tags.push('#FestiveVibes', '#Celebration', '#JoyAndSuccess', '#SeasonOfJoy');
  } else if (lower.includes('sale') || lower.includes('discount') || lower.includes('off') || lower.includes('%') || lower.includes('deal')) {
    headline = '🔥 SPECIAL SAVINGS ALERT! Limited Time Exclusive Offers! 🔥';
    body = `Upgrade your experience today with premium quality at prices you will love. Don't let these incredible seasonal savings pass you by!`;
    cta = '🛍️ Tap the link in our bio to shop the collection before offers expire! ⏳';
    tags.push('#SpecialOffer', '#SaleAlert', '#MegaDiscount', '#ShopNow', '#ExclusiveDeal');
  } else if (lower.includes('hiring') || lower.includes('job') || lower.includes('career') || lower.includes('vacancy') || lower.includes('recruit')) {
    headline = '🚀 WE ARE HIRING! Ready for Your Next Big Career Move? 💼';
    body = `We are expanding our talented team at ${brand}. If you are passionate, driven, and excited to build meaningful work with high impact, we would love to connect with you.`;
    cta = '📩 Explore open positions and submit your portfolio or CV via the link in our bio!';
    tags.push('#WeAreHiring', '#CareerOpportunity', '#JoinOurTeam', '#HiringNow', '#NowHiring');
  } else if (lower.includes('launch') || lower.includes('new product') || lower.includes('announc')) {
    headline = '🚀 BIG ANNOUNCEMENT! Introducing Something Fresh & Powerful ✨';
    body = `Crafted with modern innovation and purpose, this new milestone was built to transform how you work and grow. Be among the first to experience it.`;
    cta = '💡 Discover the full story and get early access through the link in our bio!';
    tags.push('#NewLaunch', '#ProductLaunch', '#Innovation', '#NextLevel', '#Milestone');
  }

  const caption = `${headline}\n\n${body}\n\n${cta}`;
  const hashtags = Array.from(new Set(tags)).join(' ');

  return {
    caption,
    hashtags
  };
}
