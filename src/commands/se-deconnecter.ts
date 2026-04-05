import type { ChatInputCommandInteraction } from "discord.js";

import { ComponentType, ButtonStyle } from "discord.js";
import { db } from "../connector.js";
import { action, isNull } from "../utils.js";

export async function handle(i: ChatInputCommandInteraction) {
    const token = await db.token(i.user);

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

    await i.reply({
        embeds: [{
            title: 'Vraiment ?',
            description: "Si vous vous déconnecter, vous ne pourrez plus accès à Mon Bureau Numerique à partir de Discord.",
            color: 0xff0000,
            footer: {
                text: i.user.tag,
                icon_url: i.user.avatarURL()
            }
        }],
        components: [{
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Danger,
                    label: 'Me déconnecter',
                    customId: action(i.user, 'logout')
                },
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Success,
                    label: 'Annuler',
                    customId: action(i.user, 'cancel_logout')
                }
            ]
        }]
    });
}
