/* =====================================================================
   CONFIGURATION DU SITE — le seul fichier à modifier avant la mise en ligne
   Toutes les pages lisent ces informations automatiquement.
   ===================================================================== */
window.DEPANO_CONFIG = {
  marque: "Dépano",

  /* Coordonnées */
  whatsapp: "25377365678",             // indicatif 253 + 8 chiffres, sans + ni espaces
  whatsappAffiche: "+253 77 36 56 78",  // tel qu'il apparaît sur le site
  telephone: "+253 77 36 56 78",        // numéro à appeler
  email: "depano.dj@gmail.com",
  adresse: "Djibouti-ville, République de Djibouti",
  horaires: "Du samedi au jeudi, de 8 h à 20 h (fermé le vendredi)",

  /* Garantie : nombre de jours pendant lesquels l'artisan revient si le même problème réapparaît */
  garantieJours: 30,

  /* Réseaux sociaux : collez l'adresse de chaque page. Vide = non affiché. */
  reseaux: {
    facebook: "",
    instagram: "",
    linkedin: "",
    tiktok: "",
    youtube: ""
  },

  /* Prix affichés. Laissez vide pour afficher « Prix annoncé avant l'intervention ».
     Exemple : "entretien-climatiseur": "À partir de 5 000 FDJ"
     (les noms correspondent aux pages : entretien-climatiseur.html → "entretien-climatiseur") */
  prix: {
    /* Prix « à partir de » affichés sur l'accueil, par métier. Exemple :
       "climatisation": "Dès 5 000 FDJ" */
  },

  /* Avis clients RÉELS uniquement. Ils s'affichent sur l'accueil dès qu'il y en a un.
     Exemple : { nom: "Amina H.", quartier: "Haramous", note: 5, service: "Entretien clim", texte: "Technicien ponctuel et soigneux." } */
  avis: [
  ],

  /* Enregistrement des demandes dans Supabase (facultatif, voir LISEZMOI.md).
     Laissez vide pour n'utiliser que WhatsApp. */

  /* Candidatures en ligne (pages emploi-*.html) : base Supabase « depano »,
     table candidatures + dossier de fichiers candidatures. La clé ci-dessous
     est publique : elle permet seulement d'ENVOYER une candidature, pas de les lire. */
  recrutement: {
    url: "https://kltoidjepdmqmphbmlal.supabase.co",
    cle: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdG9pZGplcGRtcW1waGJtbGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODEyOTUsImV4cCI6MjEwODk1NzI5NX0.yLXn6l7K6xa1vmQ8qabCcavKjkUNnKVp4lFyKOpwT9k"
  },
  supabase: {
    url: "",
    cle: "",
    table: "demandes"
  }
};
