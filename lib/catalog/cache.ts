export class BoundedLruCache<Key, Value> {
  readonly #maxEntries: number;
  readonly #entries = new Map<Key, Value>();

  constructor(maxEntries: number) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
      throw new Error("Catalog cache maxEntries must be a positive safe integer.");
    }
    this.#maxEntries = maxEntries;
  }

  get size(): number {
    return this.#entries.size;
  }

  has(key: Key): boolean {
    return this.#entries.has(key);
  }

  get(key: Key): Value | undefined {
    const value = this.#entries.get(key);
    if (value === undefined) {
      return undefined;
    }
    this.#entries.delete(key);
    this.#entries.set(key, value);
    return value;
  }

  set(key: Key, value: Value): this {
    this.#entries.delete(key);
    this.#entries.set(key, value);
    while (this.#entries.size > this.#maxEntries) {
      const oldest = this.#entries.keys().next().value as Key | undefined;
      if (oldest === undefined) {
        break;
      }
      this.#entries.delete(oldest);
    }
    return this;
  }

  delete(key: Key): boolean {
    return this.#entries.delete(key);
  }

  clear(): void {
    this.#entries.clear();
  }
}
