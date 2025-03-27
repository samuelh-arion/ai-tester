import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { LLM } from "./constants";

const openai = new OpenAI({
  apiKey: LLM.OPENAI_API_KEY,
});

/**
 * Creates a structured completion using OpenAI and Zod for type-safe parsing
 * @param schema The Zod schema to validate and parse the response
 * @param userPrompt The user's input prompt
 * @param systemPrompt Optional system prompt to guide the model
 * @param options Additional OpenAI API options
 * @returns Parsed response matching the provided Zod schema
 */
export async function createStructuredCompletion<T extends z.ZodType>(
  schema: T,
  userPrompt: string,
  systemPrompt: string = "",
  options: {
    model?: string;
    propertyName?: string;
    temperature?: number;
  } = {}
): Promise<z.infer<T>> {
  const {
    model = LLM.MODEL,
    propertyName = LLM.PROPERTY_NAME,
    temperature = LLM.TEMPERATURE,
  } = options;

  const messages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    { role: "user" as const, content: userPrompt },
  ];

  const completion = await openai.beta.chat.completions.parse({
    model,
    messages,
    temperature,
    response_format: zodResponseFormat(schema, propertyName),
  });

  return completion.choices[0].message.parsed;
}

// Example usage:
/*
const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

const event = await createStructuredCompletion(
  CalendarEvent,
  "Alice and Bob are going to a science fair on Friday.",
  "Extract the event information."
);
*/
