/**
 * AI Generation Service Protocol
 *
 * Abstract interface for AI text generation that decouples Agent, AI, and other modules.
 * Allows implementations to be swapped (OpenAI, Claude, local LLM, etc.)
 * without breaking dependent modules.
 */

export interface IAiGenerationRequest {
  /** The model ID to use for generation */
  modelId: string;

  /** Message history for multi-turn conversations */
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

  /** Temperature for sampling (0-2) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Available tools the model can call */
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: object;
  }>;
}

export interface IAiGenerationResponse {
  /** The generated text */
  text: string;

  /** Token usage stats */
  tokensUsed?: {
    input: number;
    output: number;
  };

  /** Tool calls made by the model (if any) */
  toolCalls?: Array<{
    name: string;
    args: object;
  }>;
}

/**
 * Service token for dependency injection.
 * Using a Symbol prevents naming conflicts in the DI container.
 */
export const AI_GENERATION_SERVICE = Symbol('IAiGenerationService');

/**
 * Interface that AI implementations must provide.
 * The Agent module injects this without knowing what's behind it.
 */
export interface IAiGenerationService {
  /**
   * Generate text from a prompt.
   * Blocks until response is ready.
   */
  generate(request: IAiGenerationRequest): Promise<IAiGenerationResponse>;

  /**
   * Stream text generation.
   * Yields tokens as they arrive from the AI provider.
   */
  streamGenerate(request: IAiGenerationRequest): AsyncIterable<{ delta: string }>;
}
