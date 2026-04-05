import type { ChatInputCommandInteraction } from "discord.js";

import { Kdecole } from "kdecole-api";
import { db } from "../connector.js";
import { API_URL, API_VERSION } from "../consts.js";
import { isNull } from "../utils.js";

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

    await i.deferReply({ ephemeral: true });

    const kdecole = new Kdecole(token, API_VERSION, 0, API_URL);

    const infos = await kdecole.getInfoUtilisateur();
    const absences = await kdecole.getAbsences();
    const msg_infos = await kdecole.getMessagerieInfo();

    i.editReply({
        embeds: [{
            title: infos.nom,
            description: `Vous être scolarisé au **${infos.etabs.find(x => x.active).nom}**.`,
            color: 0x00ff00,
            fields: [{
                name: 'Absences',
                value: `Vous avez ${absences.listeAbsences.length} absence(s), dont ${absences.listeAbsences.filter(x => !x.justifiee).length} non justifiée(s).`,
                inline: true
            }, {
                name: 'Messages',
                value: `Vous avez ${msg_infos.nbMessagesNonLus} message(s) non lu(s).`,
                inline: true
            }]
        }]
    })
}
