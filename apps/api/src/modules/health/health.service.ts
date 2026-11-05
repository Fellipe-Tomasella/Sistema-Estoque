import type { MediaStorage } from '../../shared/media-storage'
import type { HealthRepository } from './health.repository'

export class HealthService {
  constructor(
    private readonly repo: HealthRepository,
    private readonly version: string,
    private readonly media: MediaStorage,
  ) {}

  async check() {
    const db = await this.repo.ping().then(
      () => true,
      () => false,
    )
    // fotos fora do ar não derrubam o sistema (ok depende só do banco), mas aparecem aqui
    return { ok: db, db, media: await this.media.writable(), version: this.version }
  }
}
