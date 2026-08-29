# Bot Discord Mon Bureau Numérique

[🇬🇧🇺🇸🇦🇺](README-en.md)

**⚠️ Projet à l'abandon, l'API ne fonctionne plus et pas vraiment le temps, l'envie et le besoin de porter le bot pour
utiliser la nouvelle API Skolengo. Ce repository est archivé.**

Ce bot est un bot Discord qui permet de pouvoir interagir avec les données de Mon Bureau Numérique.

On peut:
 - Lire ses mails
 - Voir ses devoirs
 - Voir son emploi du temps
 - Voir ses notes

Il se connect à Mon Bureau Numérique en utilisant l'API de téléphone. Il se faisait passé pour un téléphone pour se
connecter et accéder aux données.

Pour qu'un utilisateur se connecte, il doit donner son identifiant et mot de passe temporaire générés par le site Mon
Bureau Numérique avec `/se-connecter <identifiant> <mot-de-passe>`. Le bot se connecte et stock le ticket de connexion
généré par l'API dans sa base de données. L'identifiant et mot de passe ne sont pas conservés une fois connecté.
