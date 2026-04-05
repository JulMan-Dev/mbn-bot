import type { ChatInputCommandInteraction } from "discord.js";

export async function handle(i: ChatInputCommandInteraction) {
    i.reply({
        ephemeral: true,
        embeds: [
            {
                title: 'Étape n°1 • Se connecter à Mon Bureau Numerique',
                description: `Pour commencer, [accèdez à votre espace Mon Bureau Numérique](https://cas.monbureaunumerique.fr/saml/login?service=${encodeURIComponent(new URL("/sg.do?PROC=PAGE_ACCUEIL", process.env.MBN_ROOT).href)}).`,
                color: 0x44ff00
            },
            {
                title: "Étape n°2 • Activer l'accès à l'application mobile",
                description: `Allez dans [vos préférences](${new URL('/sg.do?PROC=PREFERENCES_UTILISATEUR', process.env.MBN_ROOT).href}) puis allez dans l'onglet \`Application mobile\`. Cliquez sur \`Activer mon accès\`.`,
                color: 0x22ff00
            },
            {
                title: 'Étape n°3 • Se connecter au bot',
                description: "Faite, dans le serveur, la commande `/se-connecter` et entrer l'identifiant et le mot de passe temporaire affichés. Et voilà !",
                color: 0x00ff00
            }
        ]
    })
}
