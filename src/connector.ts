import type { Knex } from "knex";
import type { User } from "discord.js";

import { Kdecole } from "kdecole-api";
import knex from "knex";
import { logger } from "./logger.js";
import { client } from "./client.js";
import Utilisateur from "kdecole-api/types/entities/User/Utilisateur.js";
import { API_URL, API_VERSION } from "./consts.js";
import { CacheSynchronizer } from "./cache.js";
import { swapsKeysValues } from "./utils.js";

export const db_logger = logger('database');

export const raw_db = knex({
    client: 'sqlite3',
    connection: {
        filename: './data.db'
    },
    useNullAsDefault: true
});

export interface RawDatabase {
    ["logins"]: LoginsTableRaw;
}

export interface LoginsTableRaw {
    discord_id: string;
    mbn_auth: string;
    name?: string;
    mails_notifications: boolean;
    notifs_last_check: number;
};

async function initDatabase() {
    if (!await raw_db.schema.hasTable('logins')) {
        await raw_db.schema.createTable("logins", table => {
            table.string('discord_id');
            table.string('mbn_auth');
            table.string('name');
            table.boolean('mails_notifications');
            table.integer('notifs_last_check');
        });
    }

    db_logger.info('Database ready');
}

await initDatabase();

export class DatabaseInterface {
    private raw_db: Knex;

    constructor(raw_db: Knex) {
        this.raw_db = raw_db;
    }

    async login(duser: User, muser: string, mpass: string) {
        const { id: did } = duser;

        const db_res = await this.raw_db.select('*').from('logins').where(w => {
            w.where('discord_id', '=', did);
        });

        if (db_res.length == 1) {
            let [res] = db_res;

            return new Kdecole(res.mbn_auth, API_VERSION, 0, API_URL);
        }

        if (db_res.length > 1)
            throw Error("Illegal State");

        console.log(API_VERSION, API_URL);

        const token = await Kdecole.login(muser, mpass, API_VERSION, API_URL);

        await this.raw_db.insert({
            discord_id: did,
            mbn_auth: token,
            mails_notifications: false,
            notifs_last_check: 0
        }).into('logins');

        return new Kdecole(token, API_VERSION, 0, API_URL);
    }

    async logout(user: User) {
        const { id: did } = user;

        let auth = await this.raw_db.select('mbn_auth').from('logins').where(w => {
            w.where('discord_id', did);
        });

        if (auth.length != 1)
            return 0;

        const kdecole = new Kdecole(auth[0].mbn_auth, API_VERSION, 0, API_URL);

        await kdecole.logout();

        const db_res = await this.raw_db.delete().from('logins').where(w => {
            w.where('discord_id', did);
        });

        return db_res;
    }

    async token(user: User): Promise<string | null> {
        const { id: did } = user;

        const db_res = await this.raw_db.select('mbn_auth').from('logins').where(w => {
            w.where('discord_id', did);
        });

        if (db_res.length == 1) {
            const kdecole = new Kdecole(db_res[0].mbn_auth, API_VERSION, 0, API_URL);

            try {
                this.cacheName(db_res[0].mbn_auth, await kdecole.getInfoUtilisateur()); // Token checking.

                return db_res[0].mbn_auth;
            } catch { // Token revoked.
                this.logout(user);

                return null;
            }
        } else
            return null;
    }

    async entries(): Promise<Map<User, string>> {
        const db_res = await this.raw_db.select('*').from('logins');
        const map = new Map<User, string>();

        for (const { mbn_auth, discord_id } of db_res) {
            const user = await client.users.fetch(discord_id);

            map.set(user, mbn_auth);
        }

        return map;
    }

    async cacheName(token: string, user: Utilisateur): Promise<string> {
        await this.raw_db('logins')
            .update({
                name: user.nom
            }).where(w => {
                w.where('mbn_auth', '=', token);
            });

        return user.nom;
    }

    async nameFromCache(token: string): Promise<string> {
        const db_res = await this.raw_db.select('name')
            .from('logins')
            .where('mbn_auth', '=', token);

        return db_res?.[0]?.name ?? null;
    }
}

export type RawBindings<O, T> = {
    [_ in keyof O]?: keyof T;
};

export type SimpleObject = { [x: string]: string | number | boolean };

function applyBindings<T>(raw: SimpleObject, bindings: RawBindings<any, T>): T
function applyBindings<T>(raw: SimpleObject[], bindings: RawBindings<any, T>): T[];
function applyBindings<T>(raw: SimpleObject[] | SimpleObject, bindings: RawBindings<any, T>): T | T[] {
    if (!Array.isArray(raw)) {
        const entries = Object.entries(raw);

        return Object.fromEntries(
            entries.map(([k, v]) => [
                bindings[k] ?? k,
                v
            ])
        ) as any as T;
    }

    return raw.map(x => applyBindings(x, bindings));
}

function reverseBindings<T>(obj: T, bindings: RawBindings<any, T>): SimpleObject;
function reverseBindings<T>(obj: T[], bindings: RawBindings<any, T>): SimpleObject[];
function reverseBindings<T>(obj: T | T[], bindings: RawBindings<any, T>): SimpleObject | SimpleObject[] {
    if (!Array.isArray(obj)) {            
        const entries = Object.entries(obj);
        const reverse_binds = swapsKeysValues(bindings);

        return Object.fromEntries(
            entries.map(([k, v]) => [
                reverse_binds[k] ?? k,
                v
            ])
        ) as SimpleObject;
    }

    return obj.map(x => reverseBindings(x, bindings));
}

export class DatabaseCacheSynchronizer<T, K extends keyof RawDatabase = "logins"> implements CacheSynchronizer<string | number, T> {
    constructor(
        private db: Knex,
        private table: K,
        private index_column: string,
        private binds: RawBindings<RawDatabase[K], T>
    ) {
    }

    public async cache(key: string | number, value: T): Promise<void> {
        await this.db(this.table)
            .update({
                ...reverseBindings(value, this.binds)
            })
            .where(w => {
                w.where(this.index_column, '=', key);
            });
    }

    public async remove(key: string | number): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async values(): Promise<[string | number, T][]> {
        const res = await this.db
            .select(this.index_column, ...Object.values(this.binds))
            .from(this.table);

        return res.map(x => [x[this.index_column], applyBindings(x, this.binds)]);
    }
}

export const db = new DatabaseInterface(raw_db);
