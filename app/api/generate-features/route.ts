import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createStructuredCompletion } from '@/lib/ai'
import { FEATURE_GENERATION } from '@/lib/constants'

export const runtime = 'edge'

const Features = z.object({
  content: z.string()
})

export async function POST(request: Request) {
  try {
    const { spec } = await request.json()

    const result = await createStructuredCompletion(
      Features,
      `Generate feature files for testing the following API specification:\n\n${spec}`,
      FEATURE_GENERATION.SYSTEM_PROMPT,
      {
        temperature: FEATURE_GENERATION.TEMPERATURE,
        propertyName: 'feature'
      }
    )

    return NextResponse.json({
      success: true,
      features: { ['api.feature']: result.content } 
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate features' },
      { status: 400 }
    )
  }
} 