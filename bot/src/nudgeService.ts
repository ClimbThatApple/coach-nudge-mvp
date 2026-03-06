import OpenAI from 'openai';
import type { StoredSupervisee } from './store.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
});

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';

async function callLLM(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
  });
  return response.choices[0]?.message?.content?.trim() ?? '';
}

function buildContext(supervisee: StoredSupervisee): string {
  let context = `Supervisee: ${supervisee.name}\n\n`;

  if (supervisee.notes.length > 0) {
    context += 'Observation Notes (chronological):\n';
    for (const note of supervisee.notes) {
      const date = new Date(note.createdAt).toLocaleDateString();
      context += `- [${date}] ${note.content}\n`;
    }
  }

  return context;
}

export async function generateNudge(
  supervisee: StoredSupervisee,
  type: 'coaching' | 'reflection' | 'synthesis',
): Promise<string> {
  const context = buildContext(supervisee);

  const prompts: Record<string, string> = {
    coaching: `You are a coaching assistant for a consultant who manages junior team members. Based on the following supervisee profile and recent observations, generate ONE specific, actionable coaching suggestion.

${context}

Generate a brief coaching nudge (2-3 sentences) that:
1. References specific observations or patterns you noticed
2. Suggests a concrete action the manager could take
3. Ties to the supervisee's development goals if known

Keep the tone warm, professional, and actionable. Start with a verb.`,

    reflection: `You are a coaching assistant helping a consultant reflect on their supervisee.

${context}

Generate a single, thoughtful reflection prompt (one question) to help the manager think about ${supervisee.name}'s recent work or development. The question should:
1. Be specific and observation-focused
2. Help surface insights the manager might have but hasn't articulated
3. Be easy to answer in 1-2 sentences

Just return the question, nothing else.`,

    synthesis: `You are a coaching assistant helping a consultant prepare for a development conversation. Based on the following profile and observations, generate a comprehensive coaching synthesis.

${context}

Generate a structured summary with:
## Key Themes
2-3 recurring patterns or themes.

## Wins & Positive Moments
Specific accomplishments or strengths observed.

## Growth Areas
1-2 areas where development focus could be valuable.

## Coaching Focus Suggestions
2-3 specific conversation topics or actions for the next coaching session.

Keep the tone constructive and development-focused.`,
  };

  try {
    const result = await callLLM(prompts[type]);
    if (!result) {
      return `Consider scheduling a brief check-in with ${supervisee.name} to discuss their recent progress.`;
    }
    return result;
  } catch (error) {
    console.error('LLM error:', error);
    return `Consider scheduling a brief check-in with ${supervisee.name} to discuss their recent progress.`;
  }
}
