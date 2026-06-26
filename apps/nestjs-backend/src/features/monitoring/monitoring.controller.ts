import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PerformanceCacheService } from '../../performance-cache';
import { IMPORT_QUEUE, AI_GENERATION_QUEUE } from '../queue/queue.types';
import { slowQueryLog } from './performance.interceptor';
import type { ICacheStats } from '../../performance-cache';
import type { ISlowQueryEntry } from './performance.interceptor';

export interface IJobSummary {
  id: string;
  name: string;
  state: string;
  progress: number | object;
  failedReason?: string;
  timestamp?: number;
}

export interface IQueueDetail {
  name: string;
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  jobs: IJobSummary[];
}

export interface IQueueDepth {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface IPerformanceStats {
  cacheStats: ICacheStats;
  cacheHitPct: number;
  cacheEnabled: boolean;
  typeStats: Record<string, { hits: number; misses: number }>;
  queues: IQueueDepth[];
  slowRequests: ISlowQueryEntry[];
}

@Controller('api/admin/performance')
export class MonitoringController {
  constructor(
    private readonly performanceCacheService: PerformanceCacheService,
    @InjectQueue(IMPORT_QUEUE) private readonly importQueue: Queue,
    @InjectQueue(AI_GENERATION_QUEUE) private readonly aiQueue: Queue
  ) {}

  @Get('stats')
  async getStats(): Promise<IPerformanceStats> {
    const cacheStats = this.performanceCacheService.getStats();
    const total = cacheStats.hits + cacheStats.misses;
    const cacheHitPct = total > 0 ? Math.round((cacheStats.hits / total) * 100) : 0;

    const [importCounts, aiCounts] = await Promise.all([
      this.importQueue.getJobCounts(),
      this.aiQueue.getJobCounts(),
    ]);

    const queues: IQueueDepth[] = [
      {
        name: IMPORT_QUEUE,
        waiting: importCounts.waiting ?? 0,
        active: importCounts.active ?? 0,
        completed: importCounts.completed ?? 0,
        failed: importCounts.failed ?? 0,
        delayed: importCounts.delayed ?? 0,
      },
      {
        name: AI_GENERATION_QUEUE,
        waiting: aiCounts.waiting ?? 0,
        active: aiCounts.active ?? 0,
        completed: aiCounts.completed ?? 0,
        failed: aiCounts.failed ?? 0,
        delayed: aiCounts.delayed ?? 0,
      },
    ];

    return {
      cacheStats,
      cacheHitPct,
      cacheEnabled: this.performanceCacheService.isEnabled(),
      typeStats: this.performanceCacheService.getTypeStats() as Record<
        string,
        { hits: number; misses: number }
      >,
      queues,
      slowRequests: slowQueryLog.slice(0, 20),
    };
  }

  @Get('queues')
  async getQueues(): Promise<IQueueDetail[]> {
    const summarizeJobs = (jobs: unknown[]): IJobSummary[] =>
      jobs
        .slice(-50) // keep last 50 per queue
        .map((j) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const job = j as any;
          return {
            id: String(job.id ?? ''),
            name: String(job.name ?? ''),
            state: String(job.state ?? 'unknown'),
            progress: job.progress ?? 0,
            failedReason: job.failedReason,
            timestamp: typeof job.timestamp === 'number' ? job.timestamp : undefined,
          };
        })
        .reverse(); // newest first

    const [importJobs, aiJobs, importCounts, aiCounts] = await Promise.all([
      this.importQueue.getJobs().catch(() => []),
      this.aiQueue.getJobs().catch(() => []),
      this.importQueue.getJobCounts().catch(() => ({})),
      this.aiQueue.getJobCounts().catch(() => ({})),
    ]);

    return [
      {
        name: IMPORT_QUEUE,
        counts: {
          waiting: (importCounts as Record<string, number>).waiting ?? 0,
          active: (importCounts as Record<string, number>).active ?? 0,
          completed: (importCounts as Record<string, number>).completed ?? 0,
          failed: (importCounts as Record<string, number>).failed ?? 0,
          delayed: (importCounts as Record<string, number>).delayed ?? 0,
        },
        jobs: summarizeJobs(importJobs),
      },
      {
        name: AI_GENERATION_QUEUE,
        counts: {
          waiting: (aiCounts as Record<string, number>).waiting ?? 0,
          active: (aiCounts as Record<string, number>).active ?? 0,
          completed: (aiCounts as Record<string, number>).completed ?? 0,
          failed: (aiCounts as Record<string, number>).failed ?? 0,
          delayed: (aiCounts as Record<string, number>).delayed ?? 0,
        },
        jobs: summarizeJobs(aiJobs),
      },
    ];
  }
}
