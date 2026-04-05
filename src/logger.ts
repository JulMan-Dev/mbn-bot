import chalk from "chalk";
import { createLogger, format, transports } from "winston";
import fs, { promises as pfs } from "fs";
import { resolve } from "path";
import pad from "pad";

export const FORMAT = format((info, { label, color = true }) => {
    const levels = {
        info: color ? chalk.blue : (x: string) => x,
        error: color ? chalk.red : (x: string) => x,
        warn: color ? chalk.rgb(255, 165, 0) : (x: string) => x,
        debug: color ? chalk.green : (x: string) => x,
        crit: color ? chalk.red.dim : (x: string) => x
    };

    const gray = color ? chalk.gray : (x: string) => x;

    const text = `${pad(`${gray(label)}:`, 13, { colors: true })} ${pad(levels[info.level](info.level) + ':', 8, { colors: true })} ${String(info.message)}`

    return {
        level: info.level,
        [Symbol.for("message")]: text,
        message: text,
    }
});

export const LOGS_DIRNAME = resolve('logs')
export const LOGS_PATH = resolve(LOGS_DIRNAME, 'current.log');

try {
    const stats = await pfs.stat(LOGS_PATH);

    await pfs.rename(LOGS_PATH, resolve(LOGS_DIRNAME, `logs-${stats.mtime.toDateString().replace(/\s/g, '_')}-${stats.mtime.toLocaleTimeString('en', { timeStyle: 'medium' }).replace(/[:\s]/g, '_')}.log`));
} catch (e) {
    console.error(e);
}

export const LOGS_STREAM = fs.createWriteStream(LOGS_PATH);

export function logger(label: string) {
    return createLogger({
        transports: [
            new transports.Console({
                format: FORMAT({ label, color: true }),
                level: 'debug'
            }),
            new transports.Stream({
                stream: LOGS_STREAM,
                format: FORMAT({ label, color: false }),
                level: 'debug'
            })
        ]
    })
}
