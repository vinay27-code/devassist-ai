import OpenAI from 'openai';
import { env } from '../config/env';
import { query } from '../config/database';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ─── Code Review ────────────────────────────────────────────────────────────
export const reviewCode = async (code: string, language: string): Promise<string> => {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an expert code reviewer. Analyze code for:
1. Bugs and errors
2. Performance issues
3. Security vulnerabilities
4. Code style and best practices
5. Specific improvements with code examples
Format your response in clear sections with markdown.`,
      },
      {
        role: 'user',
        content: `Please review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      },
    ],
    max_tokens: 1500,
    temperature: 0.3,
  });

  return completion.choices[0].message.content || '';
};

// ─── Documentation Generator ─────────────────────────────────────────────────
export const generateDocumentation = async (code: string, language: string): Promise<string> => {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a technical documentation expert. Generate comprehensive documentation including:
1. Overview and purpose
2. Function/class descriptions
3. Parameter types and descriptions
4. Return values
5. Usage examples
6. Edge cases and limitations
Use markdown format.`,
      },
      {
        role: 'user',
        content: `Generate documentation for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      },
    ],
    max_tokens: 1500,
    temperature: 0.2,
  });

  return completion.choices[0].message.content || '';
};

// ─── Embeddings (for RAG) ────────────────────────────────────────────────────
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const response = await openai.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
};

// ─── RAG - Store snippet with embedding ──────────────────────────────────────
export const storeSnippetWithEmbedding = async (
  snippetId: string,
  code: string,
  title: string
): Promise<void> => {
  const textToEmbed = `${title}\n${code}`;
  const embedding = await generateEmbedding(textToEmbed);
  const embeddingStr = `[${embedding.join(',')}]`;

  await query(
    'UPDATE code_snippets SET embedding = $1 WHERE id = $2',
    [embeddingStr, snippetId]
  );
  logger.info(`Stored embedding for snippet ${snippetId}`);
};

// ─── RAG - Semantic search across codebase ───────────────────────────────────
export const semanticSearch = async (
  projectId: string,
  userQuery: string,
  limit = 5
): Promise<Array<{ title: string; code: string; language: string; similarity: number }>> => {
  const queryEmbedding = await generateEmbedding(userQuery);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const result = await query(
    `SELECT title, code, language,
     1 - (embedding <=> $1::vector) as similarity
     FROM code_snippets
     WHERE project_id = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [embeddingStr, projectId, limit]
  );

  return result.rows;
};

// ─── RAG Chat with codebase ──────────────────────────────────────────────────
export const chatWithCodebase = async (
  projectId: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  // 1. Find relevant code snippets via semantic search
  const relevantSnippets = await semanticSearch(projectId, userMessage, 5);

  // 2. Build context from retrieved snippets
  const context = relevantSnippets
    .map((s, i) => `--- Snippet ${i + 1}: ${s.title} (${s.language}) [similarity: ${s.similarity.toFixed(2)}]\n\`\`\`${s.language}\n${s.code}\n\`\`\``)
    .join('\n\n');

  // 3. Construct RAG prompt
  const systemPrompt = relevantSnippets.length > 0
    ? `You are an AI assistant helping developers understand and work with their codebase.
Use the following code snippets as context to answer the user's question:

${context}

Answer based on this code context. If the answer isn't in the provided code, say so clearly.`
    : `You are an AI assistant helping developers. No relevant code snippets were found in the codebase for this query. Answer from your general knowledge.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages,
    max_tokens: 1500,
    temperature: 0.5,
    stream: false,
  });

  return completion.choices[0].message.content || '';
};
