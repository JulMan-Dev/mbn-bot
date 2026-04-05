import { ActivityType, Client, IntentsBitField } from "discord.js";
import { logger } from "./logger.js";

export const bot_logger = logger('bot');

export const client = new Client({
    intents: [
        IntentsBitField.Flags.DirectMessages
    ],
    presence: {
        activities: [{
            type: ActivityType.Streaming,
            name: 'Mon Bureau Numerique',
            url: 'https://www.twitch.tv/monbureaunumerique'
        }]
    }
});

client.once('ready', () => {
    bot_logger.info('Bot ready');
});

client.on('error', e => {
    bot_logger.error(e);
});

client.on('debug', msg => {
    bot_logger.debug(msg);
});
