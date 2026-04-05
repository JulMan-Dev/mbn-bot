import { Awaitable } from "discord.js";

export interface CacheSynchronizer<K extends string | number, T> {
    cache(key: K, value: T): Awaitable<void>;
    remove(key: K): Awaitable<void>;
    values(): Awaitable<[K, T][]>;
}

export class CacheManager<K extends string | number, T> {
    private collection: Map<K, T>;
    private synchronizer: CacheSynchronizer<K, T>;

    constructor(values?: Iterable<readonly [K, T]>) {
        this.collection = new Map(values);
    }

    public static async fromSynchronizer<K extends string | number, T>(synchronizer: CacheSynchronizer<K, T>): Promise<CacheManager<K, T>> {
        return new CacheManager(await synchronizer.values()).setSynchronizer(synchronizer);
    }

    public resolve(key: K): T | null {
        if (this.collection.has(key))
            return this.collection.get(key);
        else
            return null;
    }

    public hasKey(key: K) {
        return this.collection.has(key);
    }

    public cache(key: K, value: T) {
        this.collection.set(key, value);

        if (this.synchronizer)
            this.synchronizer.cache(key, value);

        return value;
    }

    public outdate(key: K) {
        const value = this.collection.delete(key);

        if (this.synchronizer)
            this.synchronizer.remove(key);

        return value;
    }

    public clear() {
        this.collection.clear();

        if (this.synchronizer)
            for (const key of this.keys())
                this.synchronizer.remove(key);

        return this;
    }

    public keys() {
        return this.collection.keys();
    }

    public values() {
        return this.collection.values();
    }

    public entries() {
        return this.collection.entries();
    }

    public each(cb: (value: T, key: K) => void) {
        for (const [k, v] of this.entries())
            cb(v, k);
    }

    public setSynchronizer(synchronizer: CacheSynchronizer<K, T>) {
        this.synchronizer = synchronizer;

        return this;
    }
}
