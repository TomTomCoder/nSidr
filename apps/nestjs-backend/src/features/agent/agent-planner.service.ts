import { Inject, Injectable, Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { AI_SERVICE } from '../../shared/tokens/ai.token';

interface IAiService {
  getAIConfig(baseId: string): Promise<any>;
  getModelInstance(modelKey: string, llmProviders: any): Promise<any>;
}

export interface IPlanStep {
  id: number;
  description: string;
  status: 'pending' | 'done';
}

export interface IReflectionVerdict {
  goalAchieved: boolean;
  critique: string;
}

/**
 * Planning + reflexion module that upgrades the agent's reactive ReAct loop into a
 * plan-and-execute + self-critique loop (state-of-the-art agentic pattern).
 *
 * Both methods are best-effort and FAIL OPEN: any model/parse error degrades the
 * agent gracefully back to plain ReAct (createPlan → [], reflect → goalAchieved).
 */
@Injectable()
export class AgentPlannerService {
  private readonly logger = new Logger(AgentPlannerService.name);

  constructor(@Inject(AI_SERVICE) private readonly aiService: IAiService) {}

  private async resolveModel(baseId: string, modelKey: string | null) {
    const aiConfig = await this.aiService.getAIConfig(baseId);
    const key = modelKey ?? aiConfig?.chatModel?.lg ?? null;
    if (!key) throw new Error('No model key for planner');
    return this.aiService.getModelInstance(key, aiConfig.llmProviders);
  }

  /** Extract the first JSON object/array from a model response (tolerates code fences/prose). */
  private parseJson<T>(text: string): T | undefined {
    if (!text) return undefined;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fenced ? fenced[1] : text).trim();
    const start = candidate.search(/[[{]/);
    if (start === -1) return undefined;
    // Find the matching end by scanning from the last closing bracket.
    const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
    if (end < start) return undefined;
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    } catch {
      return undefined;
    }
  }

  /**
   * Decompose the user's goal into a short, ordered, tool-grounded plan.
   * Returns [] when planning is unavailable (the agent then runs plain ReAct).
   */
  async createPlan(opts: {
    baseId: string;
    modelKey: string | null;
    goal: string;
    instructions: string;
    toolNames: string[];
  }): Promise<IPlanStep[]> {
    try {
      const model = await this.resolveModel(opts.baseId, opts.modelKey);
      const system =
        'You are the planning module of an autonomous agent. Decompose the goal into a ' +
        'concise ordered list of concrete, actionable steps (at most 6) grounded in the ' +
        'available tools. Each step is one short imperative sentence. ' +
        'Output ONLY JSON: {"steps":["...","..."]}. No prose, no markdown.';
      const user =
        `Goal: ${opts.goal ?? ''}\n\n` +
        `Agent role: ${(opts.instructions ?? '').slice(0, 800)}\n\n` +
        `Available tools: ${(opts.toolNames ?? []).join(', ') || '(none)'}`;
      const { text } = await generateText({
        model,
        system,
        messages: [{ role: 'user', content: user }],
      });
      const parsed = this.parseJson<{ steps?: string[] }>(text);
      const steps = (parsed?.steps ?? [])
        .filter((s) => typeof s === 'string' && s.trim())
        .slice(0, 8);
      return steps.map((description, i) => ({
        id: i + 1,
        description: description.trim(),
        status: 'pending',
      }));
    } catch (err) {
      this.logger.warn(`Planning failed, falling back to plain ReAct: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Self-review: has the goal been fully achieved given the transcript so far?
   * FAILS OPEN to goalAchieved=true so a parser/model error never causes an infinite loop.
   */
  async reflect(opts: {
    baseId: string;
    modelKey: string | null;
    goal: string;
    transcript: string;
  }): Promise<IReflectionVerdict> {
    try {
      const model = await this.resolveModel(opts.baseId, opts.modelKey);
      const system =
        'You are the self-review module of an autonomous agent. Given the goal and the ' +
        'transcript of what the agent has done, decide whether the goal is FULLY achieved. ' +
        'Be strict but fair. Output ONLY JSON: {"goalAchieved":true|false,"critique":"..."}. ' +
        'If not achieved, critique must concretely state what remains to be done.';
      const user = `Goal: ${opts.goal}\n\nTranscript:\n${opts.transcript.slice(0, 6000)}`;
      const { text } = await generateText({
        model,
        system,
        messages: [{ role: 'user', content: user }],
      });
      const parsed = this.parseJson<IReflectionVerdict>(text);
      if (parsed && typeof parsed.goalAchieved === 'boolean') {
        return { goalAchieved: parsed.goalAchieved, critique: parsed.critique ?? '' };
      }
      return { goalAchieved: true, critique: '' };
    } catch (err) {
      this.logger.warn(`Reflection failed, treating goal as achieved: ${(err as Error).message}`);
      return { goalAchieved: true, critique: '' };
    }
  }

  /** Render a plan as a markdown checklist for injection into the system prompt. */
  renderPlan(steps: IPlanStep[]): string {
    return steps
      .map((s) => `${s.status === 'done' ? '- [x]' : '- [ ]'} ${s.id}. ${s.description}`)
      .join('\n');
  }
}
