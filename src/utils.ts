import { ActionRowData, Guild, MessageActionRowComponentData, User } from "discord.js";
import { client } from "./client.js";
import { VACATIONS } from "./consts.js";

export function cacheChannel(id: string) {
    return client.channels.fetch(id, { cache: true });
}

export function getToday() {
    const TODAY_PRECISE = new Date();

    return new Date(TODAY_PRECISE.getFullYear(), TODAY_PRECISE.getMonth(), TODAY_PRECISE.getDate());
}

export async function userToMember(guild: Guild, user: User) {
    return await guild?.members?.fetch?.({ user: user.id });
}

export function isStringNullable(str: string) {
    return isNull(str) || str.trim().length == 0;
}

export function isNull(obj: any) {
    return typeof obj == 'undefined' || obj === null;
}

export function addDays(date: Date, days: number) {
    const new_date = new Date(date.valueOf());

    new_date.setDate(new_date.getDate() + days);

    return new_date;
}

export function addMonths(date: Date, months: number) {
    const new_date = new Date(date.valueOf());

    new_date.setMonth(new_date.getMonth() + months);

    return new_date;
}

export function isDateBeetween(test: Date, min: Date, max: Date) {
    return test.valueOf() >= min.valueOf() && test.valueOf() < max.valueOf();
}

export function action(user: User, action: string, ignore_default: boolean = false) {
    return `${encodeURIComponent(action)}-${user.id}-${ignore_default ? 'y' : 'n'}`;
}

export function parseAction(action: string): [User, string, boolean] {
    const [raw_action, raw_id, raw_ignore_default] = action.split(/-/g);

    return [
        client.users.cache.get(raw_id),
        decodeURIComponent(raw_action.replace(/%-/g, '-')),
        raw_ignore_default == 'y' ? true : false
    ];
}

export function isWeekend(date: Date) {
    return [0, 6].includes(date.getDay());
}

export function isInVacations(date: Date) {
    for (const vacation of VACATIONS) {
        if (isNull(vacation[0]) && date.valueOf() < vacation[1].valueOf())
            return null;

        if (isNull(vacation[1]) && date.valueOf() >= vacation[0].valueOf())
            return null;

        if (!isNull(vacation[0]) && !isNull(vacation[1]) && isDateBeetween(date, vacation[0], vacation[1]))
            return true;
    }

    return false;
}

export function formatDateRelative(date: Date) {
    let today = getToday();
    let t1 = addDays(today, 1);
    let t_1 = addDays(today, -1);
    let t2 = addDays(today, 2);
    let t_2 = addDays(today, -2);

    if (date.valueOf() == today.valueOf())
        return "aujourd'hui";

    if (date.valueOf() == t1.valueOf())
        return 'demain';

    if (date.valueOf() == t_1.valueOf())
        return 'hier';

    if (date.valueOf() == t2.valueOf())
        return 'après-demain';

    if (date.valueOf() == t_2.valueOf())
        return 'avant-hier';

    return null;
}

/**
 * @param {string} dateOption 
 */
export function parseDate(dateOption: string) {
    const TODAY_PRECISE = new Date();
    const TODAY = new Date(TODAY_PRECISE.getFullYear(), TODAY_PRECISE.getMonth(), TODAY_PRECISE.getDate());

    if (isStringNullable(dateOption) || dateOption.trim().toLocaleLowerCase() == 'demain')
        return addDays(TODAY, 1);

    if (dateOption.trim().toLocaleLowerCase() == 'aujourd\'hui')
        return TODAY;

    if (dateOption.trim().toLocaleLowerCase() == 'hier')
        return addDays(TODAY, -1);

    if (dateOption.trim().toLocaleLowerCase().startsWith('dans')) {
        const match = dateOption.match(/^dans\s(\d*)\s(jours?|mois?)\.?$/i);

        if (match) {
            if (!match[2].toLocaleLowerCase().endsWith('s'))
                match[2] += 's';

            if (match[2].toLocaleLowerCase() == 'jours')
                return addDays(TODAY, parseInt(match[1]))

            if (match[2].toLocaleLowerCase() == 'mois')
                return addMonths(TODAY, parseInt(match[1]))
        }
    }

    if (dateOption.trim().toLocaleLowerCase().startsWith('ilya')) {
        const match = dateOption.match(/^il\sy\sa\s(\d*)\s(jours?|mois?)\.?$/i);

        if (match) {
            if (!match[2].toLocaleLowerCase().endsWith('s'))
                match[2] += 's';

            if (match[2].toLocaleLowerCase() == 'jours')
                return addDays(TODAY, -parseInt(match[1]))

            if (match[2].toLocaleLowerCase() == 'mois')
                return addMonths(TODAY, -parseInt(match[1]))
        }
    }

    let date = new Date(dateOption);

    if (date.toJSON() === null) // Check for invalid date
        return null;
    else
        return date
}

export function chunk<T>(arr: T[], size: number): T[][] {
    return arr.reduce((all, one, i) => {
        const ch = Math.floor(i / size);
        all[ch] = [].concat((all[ch] || []), one);
        return all
    }, [])
}

export function swapsKeysValues(obj: any): any {
    return Object.fromEntries(Object.entries(obj).map(x => x.reverse()));
}

export function disableAll(rows: ActionRowData<MessageActionRowComponentData>[]) {
    return rows.map(x => {
        x.components = x.components.map(x => ({ ...x, disabled: true }));

        return x;
    });
}

export class VectoredArray<T> {
    private array: T[] = null;
    private pointer: number = 0;

    constructor(values?: Iterable<T>) {
        if (values[Symbol.iterator])
            this.array = [...values];
    }

    public seek(pos: number) {
        this.pointer = Math.max(0, Math.min(this.array.length, pos));

        return this;
    }

    public pos() {
        return this.pointer;
    }

    public size() {
        return this.array.length;
    }

    public remove() {
        this.array.splice(this.pointer, 1);
        this.seek(this.pointer);

        return this;
    }

    /**
     * Don't advance pointer.
     */
    public read() {
        return this.array[this.pointer];
    }

    /**
     * Don't advance pointer.
     */
    public write(chunk: T) {
        this.array[this.pointer] = chunk;

        return this;
    }

    public advance(by: number = 1): this {
        return this.seek(this.pointer + by);
    }

    /**
     * Increase the size of the buffer by creating a new space.
     * Move the pointer the newly create cell.
     */
    public alloc() {
        return this.seek(this.array.length++);
    }
}
