import type { HealthRepository } from './health.repository'

export class HealthService {
  constructor(
    private readonly repo: HealthRepository,
    private readonly version: string,
  ) {}

  async check() {
    const db = await this.repo.ping().then(
      () => true,
      () => false,
    )
    return { ok: db, db, version: this.version }
  }
}
