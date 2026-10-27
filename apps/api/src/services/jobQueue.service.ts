export type JobType =
  | 'GENERATE_PDF_QUOTATION'
  | 'DISPATCH_WHATSAPP_BROCHURE'
  | 'PROCESS_LEAD_NOTIFICATIONS'
  | 'ANALYTICS_ROLLUP';

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JobRecord<TPayload = any, TResult = any> {
  id: string;
  type: JobType;
  payload: TPayload;
  status: JobStatus;
  progressPercent: number;
  result?: TResult;
  error?: string;
  retries: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type JobHandler<TPayload = any, TResult = any> = (
  payload: TPayload,
  updateProgress: (percent: number) => void
) => Promise<TResult>;

export class JobQueueService {
  private jobs = new Map<string, JobRecord>();
  private handlers = new Map<JobType, JobHandler>();
  private queue: string[] = [];
  private activeWorkers = 0;
  private maxConcurrency = 3;

  constructor() {
    console.log('[JobQueueService] Asynchronous Background Worker Queue initialized.');
  }

  /**
   * Register a worker handler for a specific job type
   */
  registerHandler<TPayload = any, TResult = any>(
    type: JobType,
    handler: JobHandler<TPayload, TResult>
  ): void {
    this.handlers.set(type, handler);
  }

  /**
   * Enqueue a new background job
   */
  async enqueue<TPayload = any, TResult = any>(
    type: JobType,
    payload: TPayload,
    options: { maxRetries?: number } = {}
  ): Promise<JobRecord<TPayload, TResult>> {
    // Generate simple unique ID without external heavy dependency
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job: JobRecord<TPayload, TResult> = {
      id,
      type,
      payload,
      status: 'QUEUED',
      progressPercent: 0,
      retries: 0,
      maxRetries: options.maxRetries ?? 2,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);
    this.queue.push(id);

    console.log(`[JobQueueService] Enqueued job ${id} [${type}]`);

    // Trigger process loop asynchronously
    setImmediate(() => {
      this.processNext();
    });

    return job;
  }

  /**
   * Get job status and details
   */
  getJob(id: string): JobRecord | null {
    return this.jobs.get(id) || null;
  }

  /**
   * Worker loop
   */
  private async processNext(): Promise<void> {
    if (this.activeWorkers >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const jobId = this.queue.shift();
    if (!jobId) return;

    const job = this.jobs.get(jobId);
    if (!job) return;

    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'FAILED';
      job.error = `No worker handler registered for job type: ${job.type}`;
      return;
    }

    this.activeWorkers++;
    job.status = 'PROCESSING';
    job.startedAt = new Date().toISOString();

    const updateProgress = (percent: number) => {
      job.progressPercent = Math.min(100, Math.max(0, percent));
    };

    try {
      console.log(`[JobQueueService] Executing job ${job.id} [${job.type}]...`);
      const result = await handler(job.payload, updateProgress);
      job.status = 'COMPLETED';
      job.progressPercent = 100;
      job.result = result;
      job.completedAt = new Date().toISOString();
      console.log(`[JobQueueService] Job ${job.id} [${job.type}] completed successfully.`);
    } catch (err: any) {
      console.error(`[JobQueueService] Job ${job.id} failed:`, err);
      job.retries++;
      if (job.retries <= job.maxRetries) {
        console.log(`[JobQueueService] Re-enqueuing job ${job.id} (Retry ${job.retries}/${job.maxRetries})...`);
        this.queue.push(job.id);
      } else {
        job.status = 'FAILED';
        job.error = err?.message || String(err);
        job.completedAt = new Date().toISOString();
      }
    } finally {
      this.activeWorkers--;
      // Process remaining jobs
      if (this.queue.length > 0) {
        setImmediate(() => {
          this.processNext();
        });
      }
    }
  }

  /**
   * Diagnostic statistics for dashboard
   */
  getQueueStats(): {
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    let queued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      if (job.status === 'QUEUED') queued++;
      else if (job.status === 'PROCESSING') processing++;
      else if (job.status === 'COMPLETED') completed++;
      else if (job.status === 'FAILED') failed++;
    }

    return {
      total: this.jobs.size,
      queued,
      processing,
      completed,
      failed,
    };
  }
}

export const jobQueueService = new JobQueueService();
