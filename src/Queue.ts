import { v4 } from 'uuid';

type Job = {
  id: string;
  data: Record<string, unknown>;
};

export class Queue {
  private queue: Job[];
  private processing: Job[];
  private callback: (job: Job) => Promise<unknown>;

  constructor() {
    this.queue = [];
    this.processing = [];
    this.callback = () => Promise.resolve();
  }

  add(data: Job['data']) {
    this.queue.push({ id: v4(), data });

    this.processQueue();
  }

  processJob(job: Job) {
    this.processing.push(job);

    this.callback(job)
      .then(console.log)
      .catch(console.log)
      .finally(() => {
        this.processing = this.processing.filter(({ id }) => id !== job.id);

        this.processQueue();
      });
  }

  processQueue() {
    if (!this.queue.length) return;

    if (this.processing.length > 5) return;

    const totalInProgress = this.processing.length;

    const jobsToProcess = this.queue.slice(0, 5 - totalInProgress);

    this.queue.splice(0, 5 - totalInProgress);

    jobsToProcess.forEach(job => this.processJob(job));
  }

  async process(cb: (job: Job) => Promise<unknown>) {
    this.callback = cb;
  }
}
