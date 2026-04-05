import { ButtonStyle, ChatInputCommandInteraction, ComponentType, Message } from "discord.js";

import { Kdecole } from "kdecole-api";
import { db } from "../connector.js";
import { Paginator } from "../paginator.js";
import { action, cacheChannel, isNull, parseAction } from "../utils.js";
import he from "he";
import TurndownService from "turndown";
import { CacheManager } from "../cache.js";
import Communication from "kdecole-api/types/entities/Messagerie/Communication.js";
import { API_URL, API_VERSION } from "../consts.js";
import { readFile } from 'fs/promises';

const mimeDescriptions = JSON.parse(await readFile('./mime.json', { encoding: 'utf-8' }));

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

    const service = new TurndownService({
        bulletListMarker: '-',
        linkStyle: 'inlined',
        strongDelimiter: '**'
    });

    const kdecole = new Kdecole(token, API_VERSION, 0, API_URL);

    if (i.options.getSubcommand(true) == 'reception') {
        const result = await i.deferReply();
        const buttonCollector = result.createMessageComponentCollector({ componentType: ComponentType.Button });

        await cacheChannel(i.channelId);

        const { communications } = await kdecole.getMessagerieBoiteReception(-1);

        const communicationsCache = new CacheManager<number, Communication>();

        const paginator = new Paginator({
            msg: i,
            raw: communications,
            user: i.user,
            embed: {
                color: 0x00ff00,
                footer: {
                    text: i.user.tag,
                    icon_url: i.user.avatarURL()
                }
            },
            handler: buttonCollector
        });

        paginator
            .setEmbedTransformer(async ({ id }) => {
                const conv = communicationsCache.resolve(id) ?? communicationsCache.cache(id, await kdecole.getCommunication(id));

                const mail = conv.participations[conv.nbParticipations - 1];

                return {
                    author: {
                        name: conv.expediteurInitial.libelle
                    },
                    title: conv.objet,
                    description: service.turndown(he.decode(mail.corpsMessage))
                        .split('\n')
                        .map(x => x.replace(/^>\s>\s/, ''))
                        .join('\n'),
                    fields: [
                        {
                            name: 'Informations',
                            value: `Écrit le ${mail.dateEnvoi.toLocaleDateString('fr-FR', { dateStyle: 'medium' })} à ${mail.dateEnvoi.toLocaleTimeString('fr-FR', { timeStyle: 'short' })} - ${paginator.getCurrentPage() + 1} / ${paginator.getPageCount()}`
                        },
                        {
                            name: 'Pièce(s)-jointe(s)',
                            value: conv.pieceJointe ? mail.pjs.map(x => `[${x.name}](${new URL(`/lectureFichierGlobale.do?ID_FICHIER=${x.idRessource}`, process.env.MBN_ROOT).href})`).join('\n') : '*Aucune pièces-jointes*'
                        }
                    ]
                }
            })
            .setComponentTransformer(({ id }) => {
                const conv = communicationsCache.resolve(id);
                const mail = conv.participations[conv.nbParticipations - 1];

                return [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Link,
                                url: new URL(
                                    `/sg.do?PROC=MESSAGERIE&ACTION=CONSULTER_COMMUNICATION&ID_COMMUNICATION=${conv.id}`,
                                    process.env.MBN_ROOT
                                ).href,
                                label: 'Ouvrir sur le site'
                            },
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Danger,
                                customId: action(i.user, 'destroy', true),
                                label: "Supprimer"
                            },
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Danger,
                                customId: action(i.user, 'report', true),
                                label: 'Signaler',
                                disabled: !conv.signalable
                            }
                        ]
                    },
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                style: ButtonStyle.Primary,
                                customId: action(i.user, 'reply-all'),
                                label: "Répondre à tous le monde",
                                emoji: '📨',
                                disabled: conv.type == 'COMMUNICATION_MASSE'
                            }
                        ]
                    }
                ];
            });

        paginator.render();

        buttonCollector.on('collect', async btn => {
            const [user, action] = parseAction(btn.customId);

            if (user?.id != i.user.id)
                return;

            if (action == 'destroy') {
                const page_id = paginator.getCurrentPage();

                await btn.deferReply({ ephemeral: true });

                const result = await btn.followUp({
                    ephemeral: true,
                    embeds: [{
                        title: 'Confirmation',
                        description: "Êtes-vous sûre de ce que vous faite ? Cette action est irréversible.",
                        color: 0xff0000
                    }],
                    components: [{
                        type: ComponentType.ActionRow,
                        components: [{
                            type: ComponentType.Button,
                            style: ButtonStyle.Danger,
                            label: 'Oui',
                            customId: 'yes'
                        }, {
                            type: ComponentType.Button,
                            style: ButtonStyle.Danger,
                            label: 'Annuler',
                            customId: 'cancel'
                        }]
                    }]
                });

                const collector1 = result.createMessageComponentCollector({ componentType: ComponentType.Button });

                collector1.on('collect', async btn1 => {
                    const [_, action1] = parseAction(btn1.customId);

                    if (action1 == 'yes') {
                        await kdecole.deleteCommunication(page_id);

                        communicationsCache.outdate(page_id);

                        if (paginator.getCurrentPage() == page_id)
                            paginator
                                .removePage(page_id)
                                .render();
                        else
                            paginator.removePage(page_id);

                        await btn.editReply({
                            embeds: [{
                                title: 'Conversation supprimé',
                                color: 0xff0000
                            }],
                            components: []
                        });
                    } else
                        await btn.editReply({
                            embeds: [{
                                title: "Rien n'à été effectué",
                                description: "L'opération a été annulée par l'utilisateur.",
                                color: 0x00ff00
                            }],
                            components: []
                        });
                });
            }
        });
    }
}
