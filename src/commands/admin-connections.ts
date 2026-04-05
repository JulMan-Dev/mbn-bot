import { APIEmbed, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType } from "discord.js";

import { db } from '../connector.js';
import { action, chunk, parseAction } from "../utils.js";

export async function handle(i: ChatInputCommandInteraction) {
    let defer = await i.deferReply({ ephemeral: true });

    let entries = [...await db.entries()];
    let texts: string[] = [];

    for (const [user, token] of entries) {
        const name = await db.nameFromCache(token);

        texts.push(`${user} en tant que \`${name}\``);
    }

    let pages = chunk(texts, 8);
    let current_page = 0;

    async function update_page(btn?: ButtonInteraction) {
        let page = pages[current_page];

        let has_previous = current_page > 0;
        let has_next = current_page < pages.length - 1;

        let embed: APIEmbed = {
            title: "Voici la liste des personnes sur le serveur qui se sont connectés",
            footer: {
                text: i.user.tag,
                icon_url: i.user.avatarURL()
            },
            description: page.join('\n'),
        };

        if (btn)
            await btn.deferUpdate();

        await i.editReply({
            embeds: [embed],
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.Button,
                    style: ButtonStyle.Secondary,
                    label: '⬅',
                    custom_id: action(i.user, 'previous', true),
                    disabled: !has_previous
                }, {
                    type: ComponentType.Button,
                    style: ButtonStyle.Secondary,
                    label: '➡',
                    custom_id: action(i.user, 'next', true),
                    disabled: !has_next
                }]
            }]
        });
    }

    let collector = defer.createMessageComponentCollector({ componentType: ComponentType.Button });

    collector.on('collect', btn => {
        let [_, action] = parseAction(btn.customId);

        if (action == 'previous')
            current_page -= 1;
        else
            current_page += 1;

        update_page();
    });

    await update_page();
}
