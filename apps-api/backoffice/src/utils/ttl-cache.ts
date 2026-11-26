/**
 * A small per-pod, in-memory cache with a fixed time-to-live and a size cap.
 *
 * Each API pod holds its own copy, so a write on one pod cannot clear another
 * pod's entries: the TTL is the longest any pod may serve a stale answer. Pick
 * it with that in mind.
 *
 * When full, the oldest entry is dropped (a `Map` iterates in insertion order),
 * so memory stays bounded even if callers present unbounded distinct keys.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { expiresAt: number; value: V }>()

  constructor(
    private readonly options: {
      ttlMs: number
      maxEntries: number
      /** Injected so expiry is testable without a fake timer. */
      now?: () => number
    }
  ) {}

  private now() {
    return this.options.now?.() ?? Date.now()
  }

  get(key: string): V | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  set(key: string, value: V) {
    // Re-inserting moves the key to the back, so eviction stays oldest-first.
    this.entries.delete(key)
    if (this.entries.size >= this.options.maxEntries) {
      const oldest = this.entries.keys().next()
      if (!oldest.done) this.entries.delete(oldest.value)
    }
    this.entries.set(key, { expiresAt: this.now() + this.options.ttlMs, value })
  }

  delete(key: string) {
    this.entries.delete(key)
  }

  get size() {
    return this.entries.size
  }
}
