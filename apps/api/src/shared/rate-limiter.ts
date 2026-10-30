/** Limite de tentativas em memória (a API roda em uma instância só). */
export class RateLimiter {
  private readonly attempts = new Map<string, number[]>()

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {}

  isBlocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.maxAttempts
  }

  hit(key: string, now = Date.now()): void {
    this.attempts.set(key, [...this.recent(key, now), now])
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }

  private recent(key: string, now: number): number[] {
    const list = (this.attempts.get(key) ?? []).filter((time) => now - time < this.windowMs)
    if (list.length === 0) this.attempts.delete(key)
    return list
  }
}
