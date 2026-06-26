/**
 * Prompt Override Repository Interface
 *
 * Abstraction for storing and retrieving prompt overrides.
 * Allows swapping implementations (Prisma, Redis, file system, etc.)
 * without changing the PromptService logic.
 */
export interface IAiPromptOverride {
  id: string;
  promptKey: string;
  modelPattern: string | null;
  content: string;
  isActive: boolean;
  createdBy: string;
}

export interface IPromptRepository {
  /**
   * Get all active prompt overrides for a given key.
   * @param key The prompt key (e.g., 'table.create', 'app.generate')
   * @returns All active override records for this key
   */
  findOverridesByKey(key: string): Promise<IAiPromptOverride[]>;

  /**
   * Get a specific override by key and model pattern.
   * @param key The prompt key
   * @param modelPattern The model pattern (null for global override)
   * @returns The override record, or null if not found
   */
  findOverride(key: string, modelPattern: string | null): Promise<IAiPromptOverride | null>;

  /**
   * Create or update a prompt override.
   * @param key The prompt key
   * @param content The prompt content
   * @param modelPattern Optional model pattern (null for global override)
   * @param createdBy User/system that created this override
   */
  upsertOverride(
    key: string,
    content: string,
    modelPattern: string | null,
    createdBy: string
  ): Promise<void>;
}

export const PROMPT_REPOSITORY = Symbol('IPromptRepository');
