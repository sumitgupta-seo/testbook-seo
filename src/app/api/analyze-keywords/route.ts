import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { exam, contentType, keywords, context } = body

    const prompt = `You are an SEO expert for testbook.com, India's leading exam preparation platform.

Generate a detailed SEO content brief for the following:
- Exam/Topic: ${exam}
- Content Type: ${contentType}
- Seed Keywords: ${keywords?.join(', ')}
- Additional Context: ${context || 'None'}

Return ONLY a JSON object (no markdown, no backticks) with these fields:
{
  "meta_title": "SEO-optimized title under 60 chars",
  "meta_description": "Compelling description under 155 chars with CTA",
  "h1": "Main heading",
  "primary_keyword": "exact match primary keyword",
  "secondary_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "lsi_keywords": ["related1", "related2", "related3"],
  "outline": ["## Section 1", "## Section 2", "## Section 3", "## Section 4", "## Section 5"],
  "word_count_target": "2000-2500",
  "internal_links": ["suggested/url/1", "suggested/url/2"],
  "content_angle": "Brief description of unique content angle",
  "seasonal_hook": "Why this content is especially relevant right now"
}`

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(fallbackBrief(exam, contentType, keywords))
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You are an SEO expert. Always respond with valid JSON only, no markdown.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text())
      return NextResponse.json(fallbackBrief(exam, contentType, keywords))
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json(fallbackBrief(exam, contentType, keywords))
    }
  } catch (err) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 })
  }
}

function fallbackBrief(exam: string, contentType: string, keywords: string[]) {
  const pk = keywords?.[0] || exam
  return {
    meta_title: `${exam} 2025 - ${contentType} | Testbook`,
    meta_description: `Complete ${exam} ${contentType} for 2025. Get free mock tests, syllabus PDF, and expert preparation tips. Start now!`,
    h1: `${exam} 2025: Complete ${contentType}`,
    primary_keyword: pk,
    secondary_keywords: keywords?.slice(1, 5) || [],
    lsi_keywords: [`${exam} preparation`, `${exam} tips`, `${exam} pattern`],
    outline: [
      `## What is ${exam}?`,
      `## ${exam} 2025 Important Dates`,
      `## ${exam} Syllabus & Exam Pattern`,
      `## Preparation Strategy`,
      `## Previous Year Cut-offs`,
      `## Free Mock Tests`,
    ],
    word_count_target: '2000-2500',
    internal_links: ['/mock-test', '/syllabus', '/current-affairs'],
    content_angle: `Comprehensive guide targeting aspirants searching for ${exam} 2025 updates`,
    seasonal_hook: `High search demand expected 60-90 days before exam date`,
  }
}
