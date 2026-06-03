// ── Données fictives réalistes pour FasoData (Burkina Faso) ──────────────────

export const REGIONS = [
  { name: "Sahel",            chef: "Dori",           beneficiaires: 3214, prix_mais: 342, indicateur: 82, objectif: 90 },
  { name: "Centre",           chef: "Ouagadougou",    beneficiaires: 2876, prix_mais: 320, indicateur: 78, objectif: 85 },
  { name: "Est",              chef: "Fada N'Gourma",  beneficiaires: 1987, prix_mais: 328, indicateur: 71, objectif: 80 },
  { name: "Hauts-Bassins",    chef: "Bobo-Dioulasso", beneficiaires: 1532, prix_mais: 295, indicateur: 86, objectif: 90 },
  { name: "Nord",             chef: "Ouahigouya",     beneficiaires: 1421, prix_mais: 318, indicateur: 75, objectif: 85 },
  { name: "Centre-Nord",      chef: "Kaya",           beneficiaires:  712, prix_mais: 305, indicateur: 77, objectif: 82 },
  { name: "Boucle du M.",     chef: "Dédougou",       beneficiaires:  856, prix_mais: 298, indicateur: 68, objectif: 78 },
  { name: "Plateau Central",  chef: "Ziniaré",        beneficiaires:  601, prix_mais: 294, indicateur: 73, objectif: 80 },
  { name: "Centre-Ouest",     chef: "Koudougou",      beneficiaires:  748, prix_mais: 288, indicateur: 79, objectif: 85 },
  { name: "Centre-Sud",       chef: "Manga",          beneficiaires:  523, prix_mais: 280, indicateur: 65, objectif: 75 },
  { name: "Centre-Est",       chef: "Tenkodogo",      beneficiaires:  634, prix_mais: 285, indicateur: 70, objectif: 78 },
  { name: "Sud-Ouest",        chef: "Diébougou",      beneficiaires:  389, prix_mais: 278, indicateur: 62, objectif: 72 },
  { name: "Cascades",         chef: "Banfora",        beneficiaires:  445, prix_mais: 270, indicateur: 84, objectif: 88 },
];

export const COMMODITIES = [
  { name: "Maïs",      price: 325, change: +8.4,  color: "#E04E2F", data: [265,272,280,291,298,310,318,325] },
  { name: "Mil",       price: 370, change: +5.1,  color: "#1A2C42", data: [340,344,348,352,356,360,366,370] },
  { name: "Sorgho",    price: 312, change: +3.2,  color: "#16A34A", data: [295,298,300,303,306,308,310,312] },
  { name: "Riz local", price: 520, change: +12.7, color: "#F59E0B", data: [445,458,470,480,490,502,510,520] },
  { name: "Haricot",   price: 780, change: -2.1,  color: "#8B5CF6", data: [810,806,802,798,794,790,784,780] },
];

// Évolution mensuelle prix maïs par région
export const PRICE_EVOLUTION = [
  { month: "M44", sahel: 240, centre: 235, hauts: 228, cascades: 222 },
  { month: "M52", sahel: 248, centre: 240, hauts: 232, cascades: 226 },
  { month: "W8",  sahel: 258, centre: 248, hauts: 238, cascades: 232 },
  { month: "W16", sahel: 272, centre: 258, hauts: 246, cascades: 238 },
  { month: "W24", sahel: 285, centre: 268, hauts: 254, cascades: 248 },
  { month: "W32", sahel: 305, centre: 285, hauts: 264, cascades: 256 },
  { month: "W40", sahel: 328, centre: 305, hauts: 278, cascades: 262 },
  { month: "W42", sahel: 342, centre: 320, hauts: 285, cascades: 270 },
];

export const ALERTS = [
  {
    id: 1,
    title: "Prix du mil > seuil critique",
    location: "Sahel · Dori",
    time: "il y a 32 min",
    value: "+24% en 7j",
    severity: "critical" as const,
  },
  {
    id: 2,
    title: "Couverture vaccinale en baisse",
    location: "Est · Fada",
    time: "il y a 2h",
    value: "-3.2 pts",
    severity: "warning" as const,
  },
  {
    id: 3,
    title: "Dataset partenaire mis à jour",
    location: "INSD · IPC",
    time: "il y a 4h",
    value: "nouvelle version",
    severity: "info" as const,
  },
  {
    id: 4,
    title: "Précipitations exceptionnelles",
    location: "Cascades · Banfora",
    time: "hier",
    value: "+180 mm/24h",
    severity: "warning" as const,
  },
];

export const REPORTS = [
  { id: 1, title: "Reporting trimestriel · T1 2025", desc: "Synthèse de 47 indicateurs", date: "08 avr.", size: "2.4 Mo", format: "PDF" },
  { id: 2, title: "Cartographie écoles équipées",    desc: "Sahel + Nord · export SIG",  date: "02 avr.", size: "1.1 Mo", format: "GeoJSON" },
  { id: 3, title: "Bilan financier programmes",      desc: "12 487 bénéficiaires",        date: "28 mars", size: "380 Ko", format: "XLSX" },
  { id: 4, title: "Note méthodologique enquête",     desc: "Sécurité alimentaire",        date: "21 mars", size: "620 Ko", format: "PDF" },
  { id: 5, title: "Export brut · données terrain",   desc: "Toutes régions",              date: "15 mars", size: "8.2 Mo", format: "CSV" },
];

export const MOCK_USERS = [
  { id: "1",  name: "Nathalie Kaboré",  email: "nathalie.k@aceedo.bf",        org: "ACEEDO",          role: "Contributeur",   status: "actif",      lastActivity: "il y a 5 min", initials: "NK", color: "#16A34A" },
  { id: "2",  name: "Adama Sanou",      email: "a.sanou@aceedo.bf",           org: "ACEEDO",          role: "Contributeur",   status: "actif",      lastActivity: "il y a 1h",    initials: "AS", color: "#475569" },
  { id: "3",  name: "Sory Traoré",      email: "sory.traore@insd.bf",         org: "INSD",            role: "Data Manager",   status: "actif",      lastActivity: "il y a 2h",    initials: "ST", color: "#0EA5E9" },
  { id: "4",  name: "Fatim Konaté",     email: "f.konate@minsante.gov.bf",    org: "Min. Santé",      role: "Producteur",     status: "actif",      lastActivity: "hier",          initials: "FK", color: "#8B5CF6" },
  { id: "5",  name: "Issa Bamba",       email: "issa.bamba@ouaga.bf",         org: "Ville Ouaga",     role: "Lecteur",        status: "en_attente", lastActivity: "il y a 3j",    initials: "IB", color: "#D97706" },
  { id: "6",  name: "Amina Yaméogo",    email: "a.yameogo@uniouaga.bf",       org: "Univ. Ouaga 1",   role: "Chercheur",      status: "actif",      lastActivity: "il y a 8j",    initials: "AY", color: "#F97316" },
  { id: "7",  name: "Kader Bocoum",     email: "k.bocoum@ext.fasodata.bf",    org: "—",               role: "Invité",         status: "suspendu",   lastActivity: "jamais",        initials: "KB", color: "#DC2626" },
  { id: "8",  name: "Mariam Diallo",    email: "m.diallo@ocha.org",           org: "OCHA",            role: "Contributeur",   status: "actif",      lastActivity: "il y a 15j",   initials: "MD", color: "#14B8A6" },
  { id: "9",  name: "Paul Somé",        email: "paul.some@minagri.bf",        org: "Min. Agriculture", role: "Producteur",    status: "inactif",    lastActivity: "il y a 30j",   initials: "PS", color: "#22C55E" },
  { id: "10", name: "Rasmané Zongo",    email: "rasmane@fasodata.bf",         org: "FasoData",        role: "Administrateur", status: "actif",      lastActivity: "maintenant",    initials: "RZ", color: "#E04E2F" },
];

export const ROLE_COUNTS = {
  Administrateurs:  { count: 4,    desc: "Accès complet",        color: "#DC2626" },
  "Data Managers":  { count: 12,   desc: "Valident les datasets", color: "#16A34A" },
  Producteurs:      { count: 142,  desc: "Soumettent données",    color: "#2563EB" },
  Contributeurs:    { count: 487,  desc: "Programmes & analyses", color: "#D97706" },
  Lecteurs:         { count: 1539, desc: "Consultation seule",    color: "#64748B" },
};

export const DATASETS_MOCK = [
  { id: "1", name: "Prix des céréales par marché · 2024", slug: "prix-cereales-marche-2024", category: "Sécurité alimentaire", rows: 287412, updated: "il y a 2h",   org: "INSD",            status: "published" },
  { id: "2", name: "Couverture vaccinale · District sanitaire", slug: "couverture-vaccinale", category: "Santé",  rows: 14820,  updated: "il y a 1j",  org: "Min. Santé",      status: "published" },
  { id: "3", name: "Effectifs scolaires · Primaire 2024-25",    slug: "effectifs-scolaires",  category: "Éducation", rows: 89430, updated: "il y a 3j",  org: "MENA",           status: "published" },
  { id: "4", name: "Pluviométrie stations synoptiques",          slug: "pluviometrie-synop",   category: "Environnement", rows: 52100, updated: "il y a 4h",  org: "ANAM",        status: "published" },
  { id: "5", name: "Enquête ménages sécurité alimentaire Q1",    slug: "enquete-menages-q1",   category: "Sécurité alimentaire", rows: 2847, updated: "hier",      org: "ACEEDO",   status: "draft" },
  { id: "6", name: "Marchés alimentaires géolocalisés",          slug: "marches-geo",          category: "Économie", rows: 4821, updated: "il y a 5j",  org: "FAO",           status: "published" },
];

// Sparkline data helpers
export function generateSparkline(base: number, trend: "up" | "down" | "flat", points = 8): number[] {
  const result: number[] = [];
  let val = base * (trend === "up" ? 0.75 : trend === "down" ? 1.25 : 0.95);
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * base * 0.05;
    const trendAdj = trend === "up" ? (i / points) * base * 0.25 :
                     trend === "down" ? -(i / points) * base * 0.25 : 0;
    result.push(Math.round(val + noise + trendAdj / points));
  }
  return result;
}

export const PROGRAM_KPIS = {
  beneficiaires:  { value: 12487, unit: "pers.",  change: +18, trend: "up"   as const, spark: [8200,8900,9400,10100,10800,11200,11800,12487] },
  ecoles:         { value: 238,   total: 350,     change: +24, trend: "up"   as const, spark: [160,172,184,196,205,215,226,238] },
  cout:           { value: 4320,  unit: "CFA",    change: -7,  trend: "down" as const, spark: [4800,4720,4650,4580,4510,4460,4390,4320] },
  completion:     { value: 67,    unit: "%",      change: +5,  trend: "up"   as const, spark: [52,55,57,59,61,63,65,67] },
};
