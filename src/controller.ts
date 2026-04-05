import type { ChatInputCommandInteraction } from "discord.js";

import { logger } from "./logger.js";

import { handle as commentSeConnecterHandle } from "./commands/comment-se-connecter.js";
import { handle as seConnecterHandle } from "./commands/se-connecter.js";
import { handle as seDeconnecterHandle } from "./commands/se-deconnecter.js";
import { handle as devoirsHandle } from "./commands/devoirs.js";
import { handle as informationsHandle } from "./commands/informations.js";
import { handle as notesHandle } from "./commands/notes.js";
import { handle as edtHandle } from "./commands/edt.js";
import { handle as adminConnectionsHandle } from "./commands/admin-connections.js";
import { handle as messagerieHandle } from "./commands/messagerie.js";

export const controller_logger = logger('controller');

controller_logger.info('Controller ready');

export function handleCommand(i: ChatInputCommandInteraction) {
    controller_logger.debug(`${i.channelId} ${i.user.id} /${i.commandName}`);

    if (i.commandName == 'comment-se-connecter')
        commentSeConnecterHandle(i);

    if (i.commandName == 'se-connecter')
        seConnecterHandle(i);

    if (i.commandName == 'se-deconnecter')
        seDeconnecterHandle(i);

    if (i.commandName == 'devoirs')
        devoirsHandle(i);

    if (i.commandName == 'informations')
        informationsHandle(i);

    if (i.commandName == 'notes')
        notesHandle(i);

    if (i.commandName == 'edt')
        edtHandle(i);

    if (i.commandName == 'admin-connections')
        adminConnectionsHandle(i);

    if (i.commandName == 'messagerie')
        messagerieHandle(i);
}
