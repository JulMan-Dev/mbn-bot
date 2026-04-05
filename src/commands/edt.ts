import type { ChatInputCommandInteraction } from "discord.js";

import { Kdecole } from "kdecole-api";
import { db } from "../connector.js";
import { API_URL, API_VERSION } from "../consts.js";
import { addDays, isDateBeetween, isInVacations, isNull, isWeekend, parseDate } from "../utils.js";

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

    let parsed = parseDate(String(i.options.get('date')?.value ?? "aujourd'hui"));

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

    await i.deferReply({ ephemeral: true });

    const kdecole = new Kdecole(token, API_VERSION, 0, API_URL);

    const edt = await kdecole.getCalendrier();

    const today = edt.listeJourCdt.find(x => isDateBeetween(x.date, parsed, addDays(parsed, 1)));
    const current = today.listeSeances.find(x => isDateBeetween(new Date(), x.hdeb, x.hfin));

    i.editReply({
        embeds: [{
            title: `Emploi du temps du ${today.date.toLocaleDateString('fr-fr', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
            description: `Il est actuellement **${new Date().toLocaleTimeString('fr-fr', { timeStyle: 'short' })}**${current ? ` et vous êtes en **${current.matiere}**.` : ''}.`,
            fields: today.listeSeances.map(s => {
                const value = `${s.heureDebut} - ${s.heureFin}`

                return {
                    name: `${s.matiere} • ${s.salle.split(' - ')[0]}`,
                    value: s.idSeance == current?.idSeance ? `❗ **${value}** *Cours actuel*` : value
                }
            }),
            color: 0x00ff00,
            footer: {
                text: i.user.tag,
                icon_url: i.user.avatarURL()
            }
        }]
    })
}
