import 'dotenv/config';

import { PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

await rest.put(Routes.applicationCommands(process.env.APPLICATION_ID), {
    body: [
        new SlashCommandBuilder()
            .setName('comment-se-connecter')
            .setDMPermission(true)
            .setDescription("Affiche les étapes nécessaire pour se connecter.")
            .toJSON(),
        new SlashCommandBuilder()
            .setName('se-connecter')
            .setDMPermission(true)
            .setDescription('Se connecte à Mon Bureau Numérique.')
            .addStringOption(
                option => option
                    .setName('identifiant')
                    .setRequired(true)
                    .setDescription('Identifiant pour la connexion téléphone, pas identifiant EduConnect.')
            )
            .addStringOption(
                option => option
                    .setName('mot-de-passe-temporaire')
                    .setRequired(true)
                    .setDescription('Mot de passe temporaire pour la connexion téléphone, pas mot de passe EduConnect.')
            )
            .toJSON(),
        new SlashCommandBuilder()
            .setName('devoirs')
            .setDMPermission(true)
            .setDescription('Voir les devoirs pour la date donnée, ou, sinon, pour demain.')
            .addStringOption(
                option => option
                    .setName('date')
                    .setRequired(false)
                    .setDescription('Voir les devoirs pour cette date.')
            )
            .toJSON(),
        new SlashCommandBuilder()
            .setName('se-deconnecter')
            .setDMPermission(true)
            .setDescription("Se deconnecte de Mon Bureau Numerique.")
            .toJSON(),
        new SlashCommandBuilder()
            .setName('informations')
            .setDMPermission(true)
            .setDescription("Voir quelques informations que je peux voir de vous 👀.")
            .toJSON(),
        new SlashCommandBuilder()
            .setName('notes')
            .setDMPermission(true)
            .setDescription("Voir les notes sur un trimestre.")
            .addNumberOption(
                option => option
                    .setName('trimestre')
                    .setRequired(true)
                    .setDescription('Le trimestre')
                    .setChoices(
                        { name: 'Premier', value: 1 },
                        { name: 'Deuxième', value: 2 },
                        { name: 'Troisième', value: 3 }
                    )
            )
            .addStringOption(
                option => option
                    .setName('matiere')
                    .setRequired(false)
                    .setDescription("Voir les notes d'un matière en particulier.")
                    .setChoices(
                        ...[
                            "FRANCAIS",
                            "SCIENCES VIE & TERRE",
                            "PHYSIQUE-CHIMIE",
                            "ALLEMAND LV2",
                            "ESPAGNOL LV2",
                            "HISTOIRE-GEOGRAPHIE",
                            "LCA LATIN",
                            "ITALIEN LV3",
                            "MATHEMATIQUES",
                            "ENS. MORAL & CIVIQUE",
                            "ANGLAIS LV1",
                            "SC. ECONO.& SOCIALES",
                            "ED.PHYSIQUE & SPORT.",
                            "SC.NUMERIQ.TECHNOL.",
                            "ACCOMPAGNEMT. PERSO.",
                            "VIE DE CLASSE"
                        ].map(x => ({ name: x, value: x }))
                    )
            )
            .toJSON(),
        new SlashCommandBuilder()
            .setName('edt')
            .setDMPermission(true)
            .setDescription('Affiche votre emploi du temps')
            .addStringOption(
                option => option
                    .setName('date')
                    .setRequired(false)
                    .setDescription("Voir l'emploi du temps de cette date.")
            )
            .toJSON(),
        new SlashCommandBuilder()
            .setName('admin-connections')
            .setDMPermission(false)
            .setDescription("Affiche les personnes qui se sont connectées")
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
            .toJSON(),
        new SlashCommandBuilder()
            .setName('messagerie')
            .setDMPermission(true)
            .setDescription('Gérer votre messagerie Mon Bureau Numérique')
            .addSubcommand(
                builder => builder
                    .setName('notifications')
                    .setDescription('Active/désactive la notification de la messagerie sur Discord.')
                    .addBooleanOption(
                        option => option
                            .setName('activer')
                            .setDescription('Active/désactive les notifications')
                            .setRequired(false)
                    )
            )
            .addSubcommand(
                builder => builder
                    .setName('reception')
                    .setDescription('Affiche tous vos mails')
            )
            .toJSON()
    ]
});
