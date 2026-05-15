export interface KnownSlot {
  id: string;
  label: string;
  page: string;
}

export const KNOWN_SLOTS: ReadonlyArray<KnownSlot> = [
  { id: "hero-portrait", label: "Portrait — fondatrice", page: "Accueil" },
  { id: "about-portrait", label: "Atelier — bloc À propos", page: "Accueil" },
  { id: "apropos-hero", label: "Portrait au bureau", page: "À propos" },
  { id: "ressources-hero", label: "Tablette & cahier", page: "Ressources" },
  { id: "processus-hero", label: "Carnet de travail", page: "Processus" },
  { id: "contact-hero", label: "Portrait — accueil", page: "Contact" },
  { id: "services-hero", label: "Portrait de la fondatrice", page: "Services" },
  { id: "services-accompagnement-juridi", label: "Portrait formel", page: "Services · Juridique" },
  { id: "juridique-photo", label: "Bibliothèque juridique", page: "Services · Juridique" },
  { id: "services-evenementiel-html", label: "Portrait — événementiel", page: "Services · Événementiel" },
  { id: "event-photo", label: "Table dressée", page: "Services · Événementiel" },
  { id: "event-mood-1", label: "Détail floral", page: "Services · Événementiel" },
  { id: "event-mood-2", label: "Bougies & lumière", page: "Services · Événementiel" },
  { id: "event-mood-3", label: "Couverts & verres", page: "Services · Événementiel" },
  { id: "event-case", label: "Mariage — étude de cas", page: "Services · Événementiel" },
  { id: "services-gestion-administrativ", label: "Portrait — bureau", page: "Services · Gestion administrative" },
  { id: "gestion-photo", label: "Classeurs et bureau", page: "Services · Gestion administrative" },
  { id: "services-creation-sites-web-ht", label: "Portrait — sites web", page: "Services · Sites web" },
  { id: "sites-web-photo", label: "Laptop et lampe", page: "Services · Sites web" },
  { id: "sites-web-case", label: "Capture du site livré", page: "Services · Sites web" },
];
