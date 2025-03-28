import { createStructuredCompletion } from '@/lib/ai'
import { STEP_DEFINITION_PROMPT } from '@/lib/constants'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'edge'

// spec is the API specification
// feature is the feature file

const Features = z.object({
  content: z.string()
})

async function generateStepDefinitions(feature: string, specString: string) {
  const result = await createStructuredCompletion(
    Features,
    `Generate step definitions for the following specification:${specString} And the following feature:${feature}`,
    STEP_DEFINITION_PROMPT,
    {
      temperature: 0,
      propertyName: 'stepDefinition'
    }
  )
  return result.content
}

export async function POST(request: Request) {
  try {
    const { feature, spec } = await request.json()
    const specString = JSON.stringify(spec)
    if (!feature) {
      throw new Error('No feature content provided')
    }

    // Return the static step definitions
    const stepDefinitions = await generateStepDefinitions(feature, specString)

    return NextResponse.json({ 
      success: true,
      stepDefinitionContent: stepDefinitions
    })
  } catch (error) {
    console.error('Error generating tests:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate tests' 
      },
      { status: 400 }
    )
  }
} 