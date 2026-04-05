import 'dotenv/config';

import { ButtonStyle, ComponentType, PermissionFlagsBits } from 'discord.js';
import { handleCommand } from './controller.js';
import { client, bot_logger } from "./client.js";
import { action as createAction, cacheChannel, isNull, parseAction, userToMember } from './utils.js';
import { db } from './connector.js';

client.on('interactionCreate', async i => {
    if (i.isButton()) {
        const [user, action, ignore_default] = parseAction(i.customId);

        if (ignore_default) return;

        await cacheChannel(i.channelId); // Cache current channel, avoid cache error

        if (action == 'delete')
            try {
                if (user.id == i.user.id || (await userToMember(i.guild, i.user))?.permissions?.has?.(PermissionFlagsBits.ManageMessages))
                    return void await i.message.delete();
                else
                    return void await i.reply({
                        ephemeral: true,
                        content: "Vous ne pouvez pas intéragir avec un message qui ne vous est pas destiné."
                    });
            } catch (e) {
                bot_logger.error(String(e));
            }

        if (action == 'logout') {
            const token = await db.token(i.user);

            if (user.id != i.user.id)
                return void await i.reply({
                    ephemeral: true,
                    content: "Vous ne pouvez pas intéragir avec un message qui ne vous est pas destiné."
                });

            if (isNull(token)) {
                i.reply({
                    ephemeral: true,
                    embeds: [{
                        title: 'Merci de vous connecter',
                        description: 'Merci de connecter pour pouvoir continuer, voir `/comment-se-connecter` pour plus d\'informations.',
                        color: 0xff0000
                    }]
                });

                return;
            }

            i.deferUpdate();

            await db.logout(i.user);

            i.message.edit({
                embeds: [{
                    title: 'Déconnecté !',
                    description: "La déconnection à été effectuer avec succès.",
                    color: 0x00ff00
                }],
                components: [{
                    type: ComponentType.ActionRow,
                    components: [{
                        type: ComponentType.Button,
                        style: ButtonStyle.Danger,
                        emoji: '🔥',
                        customId: createAction(i.user, 'delete')
                    }]
                }]
            });
        }

        if (action == 'cancel_logout') {
            if (user.id != i.user.id)
                return void await i.reply({
                    ephemeral: true,
                    content: "Vous ne pouvez pas intéragir avec un message qui ne vous est pas destiné."
                });

            i.deferUpdate();

            try {
                await i.message.edit({
                    embeds: [{
                        title: "Rien n'à été effectué",
                        description: "L'opération a été annulée par l'utilisateur.",
                        color: 0x00ff00
                    }],
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.Button,
                            style: ButtonStyle.Danger,
                            emoji: '🔥',
                            customId: createAction(i.user, 'delete')
                        }]
                    }]
                });
            } catch (e) {
                console.error(e);
            }
        }
    }

    if (i.isChatInputCommand())
        return handleCommand(i);
});

bot_logger.debug('Connecting...');

client.login(process.env.DISCORD_TOKEN);
