import { CacheManager } from '../cache.js';
import { Kdecole } from 'kdecole-api';
import { API_URL, API_VERSION } from '../consts.js';
import { DatabaseCacheSynchronizer, raw_db } from '../connector.js';

export interface NotificationsCache {
    user: string;
    token: string;
    enabled: boolean;
    last_check: number;
}

const cache: CacheManager<string | number, NotificationsCache> = await CacheManager.fromSynchronizer(
    new DatabaseCacheSynchronizer<NotificationsCache>(
        raw_db,
        'logins',
        'mbn_auth',
        {
            discord_id: 'user',
            mbn_auth: 'token',
            mails_notifications: 'enabled',
            notifs_last_check: 'last_check'
        }
    )
);

const interval = setInterval(async () => {
    for (const { enabled, token, user } of cache.values()) {
        if (!enabled) continue;

        const kdecole = new Kdecole(token, API_VERSION, 0, API_URL);


    }
}, 20_000);
