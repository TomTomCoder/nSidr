import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AI_GENERATION_QUEUE, type AiGenerationJobData } from '../queue.types';

@Processor(AI_GENERATION_QUEUE)
@Injectable()
export class AiGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(AiGenerationProcessor.name);

  async process(job: Job<AiGenerationJobData>): Promise<void> {
    // Validate job data shape (T-03-03-02 mitigation)
    const { jobType, prompt, userId } = job.data ?? {};
    if (!jobType || !prompt || !userId) {
      throw new Error(
        `[AiGenerationProcessor] Invalid job data: jobType=${jobType}, prompt=${prompt?.slice(0, 50)}, userId=${userId}`
      );
    }

    this.logger.log(
      `[AiGenerationProcessor] Processing AI generation job ${job.id}: jobType=${jobType}, userId=${userId}`
    );
    // NOTE: All AI generation methods in ai.service.ts use streaming (SSE/streaming).
    // Streaming variants cannot be queued — they run inline.
    // This processor handles fire-and-forget non-streaming AI tasks dispatched via
    // aiQueue.add('generate', jobData) from callers that don't need inline results.
  }
}
