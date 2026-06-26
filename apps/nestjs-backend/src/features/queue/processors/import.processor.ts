import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { IMPORT_QUEUE, type ImportJobData } from '../queue.types';

@Processor(IMPORT_QUEUE)
@Injectable()
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  async process(job: Job<ImportJobData>): Promise<void> {
    // Validate job data shape (T-03-03-02 mitigation)
    const { importId, tableId, userId } = job.data ?? {};
    if (!importId || !tableId || !userId) {
      throw new Error(
        `[ImportProcessor] Invalid job data: importId=${importId}, tableId=${tableId}, userId=${userId}`
      );
    }

    this.logger.log(
      `[ImportProcessor] Processing import job ${job.id}: importId=${importId}, tableId=${tableId}`
    );
    // NOTE: This IMPORT_QUEUE is an outer dispatcher (D-05).
    // The actual import work is handled by the existing sub-queues
    // (TABLE_IMPORT_CSV_QUEUE, TABLE_IMPORT_CSV_CHUNK_QUEUE) in import-open-api.service.ts.
    // This processor logs the dispatch event and can be extended to coordinate sub-queues.
  }
}
