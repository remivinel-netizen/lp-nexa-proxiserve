# Landings MonChauffagistePrivé par Proxiserve

Quatre landings Google Ads / Meta pour le dispositif Nexa x Proxiserve (Hauts-de-France et Grand Est), en marque blanche. Site statique, sans build, hébergé sur GitHub Pages dans un premier temps.

## Pages

| URL | Campagne | Formulaire |
|---|---|---|
| `/pompe-a-chaleur/` | Search PAC, lancement | 8 étapes, locataire et logement < 15 ans écartés |
| `/entretien-chaudiere/` | Search Entretien, lancement | 5 étapes, pas de prix affiché |
| `/depannage-chauffage/` | Search Dépannage (appels), lancement | appel direct + 4 étapes |
| `/simulateur-aides/` | Meta + Demand Gen | 8 étapes, pré-qualification |
| `/merci/`, `/merci-hors-zone/`, `/merci-non-eligible/` | pages de remerciement, une conversion distincte chacune | |
| `/mentions-legales/`, `/confidentialite/` | crochets `[…]` à compléter par Proxiserve | |
| `/` | index interne de validation, non indexé | |

Une cinquième landing (chaudière, remplacement) est prévue pour les mois 2 à 3 : même structure que la page PAC, sans mise en avant des aides.

## Fichiers

- `assets/style.css` : feuille commune. Charte : bleu nuit `#184562`, rouge `#FF4A56`, bleu `#4E94E3`, orange `#F38F35`, vert `#5DC44E`, Roboto.
- `assets/app.js` : moteur du questionnaire (étapes, validation, commune par code postal, envoi, redirection) et suivi dataLayer. Un seul script pour toutes les pages.
- `assets/config.js` : réglages à poser avant le Go Live (voir ci-dessous).
- Fonds : direction artistique « lames de radiateur » (doc Claude Design du 28/10/2026). Héros bleu nuit `#184562` à plat avec lames en bleu charte `#4E94E3` translucide et une lame rouge charte `#FF4A56` (`.lames`, `.lame-rouge`), sections claires à anneaux (`.sec--rings`), motif de lames (`.sec--dots`), thermostat (`.sec--thermo`, anneau avec segment rouge), plan technique (`.sec--grid`, grille fine et repère rouge) ou blocs (`.sec--blocs`, aplats arrondis), déclinés aussi en bleu nuit (`.sec--navy.sec--thermo`, etc.), bandeau CTA rouge `#FF4A56` (`.final--lames`), pied bleu nuit `#184562` à motif. Accent orange `#F38F35` dans les titres du héros, vert `#5DC44E` pour les coches. Toutes les couleurs viennent de la charte MonChauffagistePrivé, le rouge `#C22A37` de la DA n'est pas utilisé.
- `assets/icons.svg` : pictos. Le logo est écrit en HTML (`.brand`) pour rester net ; `img/logo-source.png` est le fichier fourni par Nexa.

## À régler avant le Go Live

1. **Numéro de call tracking** : `tel` dans `assets/config.js`. Tant qu'il est vide, les boutons d'appel renvoient vers le formulaire et affichent « Être rappelé ».
2. **Webhook des leads** : `endpoint` dans `assets/config.js`, ou `data-endpoint` sur le `<form>` de chaque page. Tant que la valeur contient `REMPLACER`, l'envoi est simulé et le payload s'affiche dans la console.
3. **GTM** : décommenter le snippet dans le `<head>` de chaque page et remplacer `GTM-XXXXXXX`.
4. **Bandeau cookies IwlCMP** : créer un site dans le CMP, remplacer `data-site-id="REMPLACER"` et décommenter.
5. **Montant des aides** : 10 900 € est affiché (angle de la proposition Nexa). À confirmer avec Nexa (10 800 ou 10 900). Chercher `10&nbsp;900` dans les pages PAC et simulateur.
6. **Mentions légales et confidentialité** : compléter les crochets (raison sociale, RCS, RGE, médiateur, organisme prêteur, DPO).
7. **Photos** : dans les sections uniquement (`.photo`), pas dans les héros (choix de la DA). Sources : proxiserve.fr et proxiserve.fr/monchauffagisteprive (techniciens, pompe à chaleur), plus deux images générées avec Higgsfield (technicien PAC, chaudière neuve). Faire confirmer par Nexa que Proxiserve détient les droits des photos du site pour un usage publicitaire.
8. **Polices** : Roboto chargé depuis Google Fonts. À auto-héberger avant le Go Live si on veut la même rigueur que mon-bilan-solaire.
9. **Hébergement** : GitHub Pages expose l'URL `remivinel-netizen.github.io`, visible dans la barre d'adresse. Prévoir un domaine (type monchauffagisteprive.fr) ou un Worker Cloudflare avant diffusion, comme pour les autres landings.

## Règle d'écriture

Aucun texte ni chiffre inventé. Tout vient de la feuille de route, du contrat, de la proposition Nexa, de la fiche Atlantic ou du site Proxiserve. Les seuls éléments issus de règles publiques : obligation d'entretien annuel (décret 2009-649), attestation remise sous 15 jours, TVA à 5,5 % (affichée aussi sur le site MonChauffagistePrivé), fin des chaudières fioul neuves depuis juillet 2022, numéro Urgence Sécurité Gaz, répartition locataire / propriétaire pour l'entretien.

## Payload envoyé

JSON en POST : `source`, `thematique`, `priorite` (chaud / tiède / froid, règle par page dans `window.MCP_PRIORITE`), toutes les réponses du questionnaire (nom du champ = `data-step`), `adresse`, `code_postal`, `commune`, `departement`, `zone` (couverte / hors zone), `prenom`, `nom`, `email`, `telephone`, `telephone_e164`, `consentement_contact`, `consentement_texte`, `consentement_horodatage`, `date_envoi`, `page_url`, `referrer`, `user_agent`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `utm_*`, `premiere_visite`.

Zone couverte : départements 02, 59, 60, 62, 80 (Hauts-de-France) et 08, 10, 51, 52, 54, 55, 57, 67, 68, 88 (Grand Est). Modifiable dans `config.js`.

## Événements dataLayer

`quiz_start`, `quiz_step`, `quiz_non_eligible`, `generate_lead` (avec `user_data` pour les conversions améliorées), `cta_click`, `call_click`, `lead_confirmed` (page merci, avec `lead_id` à utiliser comme `transaction_id`), `non_eligible_view`.

## Tester en local

```bash
python3 -m http.server 8765
```

puis ouvrir http://127.0.0.1:8765/

## Déployer

Pousser sur `main` : GitHub Pages publie la racine du dépôt.
