import { Cron } from 'croner'
import Elysia from 'elysia'

export class CronService {
  private cronJobs: Record<string, Cron> = {}
  constructor() {}

  addCronJob(name: string, expression: string, task: () => Promise<void>) {
    if (this.cronJobs[name]) this.cronJobs[name].stop()

    const cronJob = new Cron(expression, task)
    this.cronJobs[name] = cronJob
  }

  removeCronJob(name: string) {
    if (this.cronJobs[name]) {
      this.cronJobs[name].stop()
      delete this.cronJobs[name]
    }
  }

  stopAllJobs() {
    Object.values(this.cronJobs).forEach((job) => job.stop())
    this.cronJobs = {}
  }

  stopJob(name: string) {
    if (this.cronJobs[name]) {
      this.cronJobs[name].stop()
    }
  }
}

export const CronServicePlugin = new Elysia({ name: 'CronService' })
  .decorate(() => ({
    cronService: new CronService(),
  }))
  .as('global')
