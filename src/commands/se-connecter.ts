import type { ChatInputCommandInteraction } from "discord.js";

import { db } from "../connector.js";
import { isNull } from "../utils.js";

export async function handle(i: ChatInputCommandInteraction) {
    const token = await db.token(i.user);

    if (!isNull(token)) {
        i.reply({
            ephemeral: true,
            embeds: [{
                title: 'Vous êtes déjà connecté',
                description: "Si vous voulez vous connecter à un autre compte, déconnectez-vous d'abord avec `/se-deconnecter`.",
                color: 0xff0000
            }]
        });

        return;
    }

    await i.deferReply({ ephemeral: true });

    try {
        const session = await db.login(
            i.user,
            String(i.options.get('identifiant', true)?.value),
            String(i.options.get('mot-de-passe-temporaire', true)?.value)
        );
        const info = await session.getInfoUtilisateur();

        await i.editReply({
            embeds: [{
                title: 'Connecté !',
                description: `Vous maintenant connecté en tant que ${info.nom}.`,
                color: 0x00ff00
            }]
        });
    } catch (e) {
        await i.editReply({
            embeds: [{
                title: e.message,
                description: 'Vérifier vos identifiants',
                color: 0xff0000
            }]
        })
    }
}