/* Réglages communs aux landings MonChauffagistePrivé.
   Tout ce qui contient REMPLACER est un réglage à poser avant le Go Live. */
window.MCP_CONFIG = {
  /* Numéro affiché sur les pages (appel direct). Vide tant que Nexa n'a pas
     fourni le numéro de call tracking : les boutons d'appel renvoient alors
     vers le formulaire. Format libre, ex. "03 20 00 00 00". */
  tel: '',
  /* Webhook Make (ou autre) qui reçoit chaque lead en JSON. Tant que la valeur
     contient REMPLACER, l'envoi est simulé et le payload s'affiche dans la
     console du navigateur. Peut être surchargé page par page via l'attribut
     data-endpoint du formulaire. */
  endpoint: 'REMPLACER',
  /* Départements couverts : Hauts-de-France et Grand Est. Un lead hors zone
     part quand même, mais vers une page de remerciement distincte (donc une
     conversion distincte côté Google Ads). */
  zone: ['02','59','60','62','80','08','10','51','52','54','55','57','67','68','88'],
  /* Préfixe des pages de remerciement, relatif à chaque landing. */
  merci: '../merci/',
  merciHorsZone: '../merci-hors-zone/',
  merciNonEligible: '../merci-non-eligible/'
};
