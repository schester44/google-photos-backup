import { v4 } from 'uuid';

export class Queue {
  private queue;
  private processing;

  constructor() {
    this.queue = [];
    this.processing = [];
  }

  add(data) {
    this.queue.push({ id: v4(), data });

    this.processQueue();
  }

  processJob(job) {
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

  async process(cb) {
    this.callback = cb;
  }
}
