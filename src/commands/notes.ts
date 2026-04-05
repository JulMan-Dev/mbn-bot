import type { ChatInputCommandInteraction } from "discord.js";

import { Kdecole } from "kdecole-api";
import he from 'he';
import { db } from "../connector.js";
import { isNull } from "../utils.js";
import { API_URL, API_VERSION } from "../consts.js";

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

    await i.deferReply({ ephemeral: true });

    const releve = await kdecole.getReleve();
    const infos = await kdecole.getInfoUtilisateur();
    const trimestre_id = Number(i.options.get('trimestre', true).value) - 1;

    const trimestre = releve.trimestres[trimestre_id];

    if (i.options.get('matiere', false)?.value) {
        const m = trimestre.matieres.find(m => m.matiereLibelle == String(i.options.get('matiere', true).value));

        if (!m || m.devoirs.length == 0) {
            i.editReply({
                embeds: [{
                    title: `${infos.nom} • ${trimestre.periodeLibelle} • ${i.options.get('matiere', true)?.value}`,
                    description: `Il n'y a aucune notes pour cette matière dans ce trimestre.`,
                    color: 0xff0000,
                    footer: {
                        text: i.user.tag,
                        icon_url: i.user.avatarURL()
                    }
                }]
            });

            return;
        }

        i.editReply({
            embeds: [{
                title: `${infos.nom} • ${trimestre.periodeLibelle} • ${i.options.get('matiere', true)?.value}`,
                description: `Moyenne : **${m.moyenneEleve}/${m.bareme}**\nMoyenne classe : **${m.moyenneClasse}/${m.bareme}**`,
                fields: m.devoirs
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .map(d => {
                        Object.assign(d, {
                            moyenne: isNaN(d.moyenne) ? "???" : d.moyenne,
                            medianeClasse: isNaN(d.medianeClasse) ? "???" : d.medianeClasse,
                            noteMax: isNaN(d.noteMax) ? "???" : d.noteMax,
                            noteMin: isNaN(d.noteMin) ? "???" : d.noteMin,
                            note: (isNaN(d.note) || isNull(d.note)) ? "???" : d.note
                        });

                        return {
                            name: `${d.titreDevoir} • ${d.date.toLocaleDateString('fr-fr', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
                            value: `${d.commentaireDevoir ? `> *${he.decode(d.commentaireDevoir)}*\n\n` : ''}Votre note : **${d.note}/${d.bareme}**\n> Coefficient : **${d.coefficient}**\n> Moyenne : **${d.moyenne}/${d.bareme}**\n> Médiane : **${d.medianeClasse}/${d.bareme}**\n> ⬆ **${d.noteMax}** - ⬇ **${d.noteMin}**`,
                        };
                    }),
                color: 0x00ff00,
                footer: {
                    text: i.user.tag,
                    icon_url: i.user.avatarURL()
                }
            }]
        });
    } else {
        const average_student = trimestre.matieres.length == 0 ? "???" : (
            Math.round(trimestre.getMoyenneGenerale() * 10) / 10
        );
        const average_classe = trimestre.matieres.length == 0 ? "???" : (
            Math.round(
                trimestre.matieres
                    .filter(m => typeof m.moyenneClasse == 'number')
                    .map(m => m.moyenneClasse)
                    .reduce((x, acc) => x + acc) / trimestre.matieres.length
                * 10) / 10
        );

        i.editReply({
            embeds: [{
                title: `${infos.nom} • ${trimestre.periodeLibelle}`,
                description:
                    `Moyenne général : **${average_student}/${trimestre.bareme}**\nMoyenne général classe : **${average_classe}/${trimestre.bareme}**` +
                    (trimestre.matieres.length == 0 ? "\n\nIl n'y a pas de notes sur ce trimestre." : ''),
                fields: trimestre.matieres.map(m => ({
                    name: `${m.matiereLibelle} • ${m.enseignants.join()} • ${m.devoirs.length} note(s)`,
                    value: `Moyenne : **${m.moyenneEleve}/${m.bareme}**\nMoyenne classe : **${m.moyenneClasse}/${m.bareme}**`,
                    inline: false
                })),
                color: 0x00ff00,
                footer: {
                    text: i.user.tag,
                    icon_url: i.user.avatarURL()
                }
            }]
        });
    }
}
