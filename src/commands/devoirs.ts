import type { APIEmbed, ButtonInteraction, ChatInputCommandInteraction } from "discord.js";

import { ComponentType, ButtonStyle, PermissionFlagsBits } from "discord.js";
import { Kdecole } from "kdecole-api";
import { db } from "../connector.js";
import { API_URL, API_VERSION } from "../consts.js";
import { action, addDays, cacheChannel, formatDateRelative, isDateBeetween, isInVacations, isNull, isWeekend, parseAction, parseDate, userToMember } from "../utils.js";

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

    const kdecole = new Kdecole(token, API_VERSION, 0, API_URL);

    let parsed = parseDate(String(i.options.get('date')?.value ?? 'demain'));

    if (parsed === null) {
        i.reply({
            ephemeral: true,
            embeds: [{
                title: 'Date donnée non valide',
                description: "La date que vous avez donnée n'est pas valide, merci d'utiliser `dans X jours` (où X doit être numérique (1, 2, 3...)), `demain`, `aujourd'hui` ou une date sous le format `AAAA/MM/JJ`.",
                color: 0xff0000
            }]
        });

        return;
    }

    if (isInVacations(parsed) == null) {
        i.reply({
            ephemeral: true,
            embeds: [{
                title: "Plus dans l'année scolaire",
                description: "On dirait que la date donnée est en dehors de l'année scolaire.",
                color: 0xff0000
            }]
        });

        return;
    }

    while (isWeekend(parsed) || isInVacations(parsed))
        parsed = addDays(parsed, 1);

    await i.deferReply();

    try {
        const devoirs = await kdecole.getTravailAFaire(undefined, parsed);

        const max_date = addDays(parsed, 1);

        const date_str = `${parsed.toLocaleDateString('fr-fr', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${formatDateRelative(parsed) ? `, ${formatDateRelative(parsed)}` : ''}`;

        let embed: APIEmbed = {
            title: `Devoirs pour le ${date_str}`,
            description: `Rien n'a été marqué pour ce jour.`,
            color: 0x00ff00,
            footer: {
                text: 'Cliquer sur 🔥 pour supprimer le message. • ' + i.user.tag,
                icon_url: i.user.avatarURL()
            }
        };

        for (const { date: dateTaf, listTravail: listTaf } of devoirs.listeTravaux) {
            if (!isDateBeetween(dateTaf, parsed, max_date)) continue;

            delete embed.description;

            embed.fields = listTaf.map(taf => ({
                name: taf.matiere,
                value: `${taf.type} : ${taf.titre}\n\n**${taf.flagRealise ? 'Marqué comme fait' : 'Marqué comme non fait'}**`
            }));
        }

        i.editReply({
            embeds: [embed],
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.Button,
                    emoji: '⬅',
                    customId: action(i.user, 'previous_page', true),
                    style: ButtonStyle.Primary
                }, {
                    type: ComponentType.Button,
                    emoji: '🔥',
                    customId: action(i.user, 'delete'),
                    style: ButtonStyle.Danger
                }, {
                    type: ComponentType.Button,
                    emoji: '➡',
                    customId: action(i.user, 'next_page', true),
                    style: ButtonStyle.Primary
                }]
            }]
        });

        let msg = await i.fetchReply();

        const click_collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            async filter(i1: ButtonInteraction): Promise<boolean> {
                if (i1.user.id != i.user.id && !(await userToMember(i1.guild, i1.user))?.permissions?.has?.(PermissionFlagsBits.ManageMessages)) {
                    await i1.reply({
                        ephemeral: true,
                        content: "Vous ne pouvez pas intéragir avec un message qui ne vous est pas destiné."
                    });

                    return false;
                }

                return true;
            }
        });

        click_collector.on('collect', async i1 => {
            const [_, a] = parseAction(i1.customId);

            if (a == 'delete')
                return;

            parsed = addDays(parsed, (a == 'next_page') ? 1 : -1);

            if (isInVacations(parsed) == null) {
                parsed = addDays(parsed, (a == 'next_page') ? -1 : 1);

                i1.reply({
                    ephemeral: true,
                    embeds: [{
                        title: "Plus dans l'année scolaire",
                        description: "Je ne peux pas continuer, la date que vous avez demandé n'est pas dans l'année scolaire.",
                        color: 0xff0000
                    }]
                });

                return;
            }

            while (isWeekend(parsed) || isInVacations(parsed))
                parsed = addDays(parsed, (a == 'next_page') ? 1 : -1);

            const devoirs = await kdecole.getTravailAFaire(undefined, parsed);

            const max_date = addDays(parsed, 1);
            const date_str = `${parsed.toLocaleDateString('fr-fr', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${formatDateRelative(parsed) ? `, ${formatDateRelative(parsed)}` : ''}`;

            let embed: APIEmbed = {
                title: `Devoirs pour le ${date_str}`,
                description: `Rien n'a été marqué pour ce jour.`,
                color: 0x00ff00,
                footer: {
                    text: 'Cliquer sur 🔥 pour supprimer le message. • ' + i.user.tag,
                    icon_url: i.user.avatarURL()
                }
            };

            for (const { date: dateTaf, listTravail: listTaf } of devoirs.listeTravaux) {
                if (!isDateBeetween(dateTaf, parsed, max_date)) continue;

                delete embed.description;

                embed.fields = listTaf.map(taf => ({
                    name: taf.matiere,
                    value: `${taf.type} : ${taf.titre}\n\n**${taf.flagRealise ? 'Marqué comme fait' : 'Marqué comme non fait'}**`
                }));
            }

            await i1.deferUpdate();
            await cacheChannel(i1.channelId);

            await i1.message.edit({ embeds: [embed] });
        });
    } catch (e) {
        await i.editReply({
            embeds: [{
                title: 'Erreur interne détecté !',
                description: 'Merci de bien vouloir signaler cette erreur à <@774317138395529266>.',
                color: 0xff0000,
                fields: [{
                    name: "Code de l'erreur",
                    value: "`" + e.code + "`"
                }],
                footer: {
                    text: 'Cliquer sur 🔥 pour supprimer le message.'
                }
            }],
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.Button,
                    style: ButtonStyle.Danger,
                    emoji: '🔥',
                    customId: action(i.user, 'delete')
                }]
            }]
        })
    }
}
