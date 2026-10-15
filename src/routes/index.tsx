import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, CalendarDays, RotateCcw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SITE = {
  brand: "Young Peloton",
  title: "Young Peloton — European U19 Road Race Calendar",
  description: "A European road cycling race calendar for U19 Men and U19 Women. We add and verify races country by country, based on official race notices.",
  intro: "A European road cycling race calendar for U19 Men and U19 Women. All in one place, with official race notices as the source.",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: SITE.title },
      { name: "description", content: SITE.description },
      { property: "og:title", content: SITE.title },
      { property: "og:description", content: SITE.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://oskar-osebna.lovable.app/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://oskar-osebna.lovable.app/" }],
  }),
  component: Index,
});

// Filter options are not race data or confirmation of country coverage.
const COUNTRIES = ["Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland", "Portugal", "Romania", "Russia", "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Turkey", "Ukraine", "United Kingdom", "Vatican City"];
const CATEGORIES = [{ value: "U19M", label: "U19 Men" }, { value: "U19Ž", label: "U19 Women" }];
const RACE_TYPES = ["Road race", "Stage race", "Individual time trial", "Team time trial", "Criterium", "Circuit race"];

const PROVISIONAL_LABEL = "Approximate date — awaiting official confirmation";
const AT_2027_LABEL = "Approximate 2027 date — based on 2026 edition; awaiting official confirmation";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PERIOD_LABEL = { early: "Early", mid: "Mid", late: "Late", "mid-late": "Mid/late", any: "" } as const;
const PERIOD_ORDER = { early: 0, mid: 1, "mid-late": 2, late: 3, any: 4 } as const;

// Provisional (unofficial) entries. No exact days — only an approximate window within the month.
// Corrected once official dates are published.
type Race = {
  id: string; name: string; place: string; country: string; categories: string[];
  type: string | null; month: number; period: keyof typeof PERIOD_LABEL; extraTentative?: boolean; label?: string;
};
const U19 = ["U19M", "U19Ž"];
const at = (id: string, name: string, place: string, type: string | null, month: number, period: Race["period"]): Race =>
  ({ id, name, place, country: "Austria", categories: U19, type, month, period, label: AT_2027_LABEL });
export const RACES: Race[] = [
  { id: "piran", name: "Piran", place: "Piran", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 3, period: "late" },
  { id: "kamnik", name: "Kamnik", place: "Kamnik", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid" },
  { id: "domzale", name: "Domžale", place: "Domžale", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid" },
  { id: "ptuj", name: "Ptuj", place: "Ptuj", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 5, period: "any", extraTentative: true },
  { id: "maribor", name: "Maribor", place: "Maribor", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 6, period: "early" },
  { id: "dptt", name: "DPTT — Slovenian National Time Trial Championships", place: "Slovenia", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 6, period: "late" },
  { id: "dproad", name: "DProad — Slovenian National Road Race Championships", place: "Slovenia", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Road race", month: 6, period: "late" },
  { id: "gorje", name: "Gorje", place: "Gorje", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 7, period: "mid" },
  { id: "pokljuka", name: "Pokljuka", place: "Pokljuka", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 7, period: "mid-late" },
  { id: "kriterij-tp", name: "Kriterij Tadeja Pogačarja (Tadej Pogačar Criterium)", place: "Slovenia", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Criterium", month: 7, period: "late" },
  { id: "sencur", name: "Šenčur", place: "Šenčur", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 8, period: "late" },
  { id: "kranj-kriterij", name: "Kranj Criterium", place: "Kranj", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Criterium", month: 8, period: "late" },
  { id: "kranj-cestna", name: "Kranj Road Race", place: "Kranj", country: "Slovenia", categories: ["U19M", "U19Ž"], type: "Road race", month: 8, period: "late" },
  { id: "vn-dm", name: "VN DM", place: "Slovenia", country: "Slovenia", categories: ["U19M", "U19Ž"], type: null, month: 10, period: "any" },
  // Austria — 2027 windows derived from 2026 editions (2026 date in comment).
  at("at-leonding", "65. Cycling Season Opening Race Leonding", "Leonding", null, 3, "late"), // 2026-03-22
  at("at-st-marein", "St. Marein-Feistritz Road Race", "St. Marein-Feistritz", "Road race", 4, "mid"), // 2026-04-12
  at("at-soell", "38. Ernst Feuchtner Memorial Race in Söll", "Söll", null, 4, "mid"), // 2026-04-19
  at("at-walding", "Walding Circuit Race", "Walding", "Circuit race", 4, "late"), // 2026-04-25
  at("at-wels", "64. International Raiffeisen Cherry Blossom Race Wels", "Wels", null, 4, "late"), // 2026-04-26
  at("at-simonsfeld", "Simonsfeld AG Steinbergrennen Wind Power", "Location per official calendar", null, 5, "early"), // 2026-05-01
  at("at-erlauftal", "53. International Erlauftal Cycling Days", "Purgstall/Erlauftal", null, 5, "early"), // 2026-05-03
  at("at-oem", "Austrian National Road Championships (ÖM/ÖSTM Straße)", "Schwanenstadt", "Road race", 6, "late"), // 2026-06-28
  at("at-villach", "Circuit Racing – Alpenarena Villach Racing Series", "Villach", "Circuit race", 7, "early"), // 2026-07-01
  at("at-biedermeier", "Biedermeier Valley Tour", "Pernitz/Biedermeiertal", null, 7, "early"), // 2026-07-05
  at("at-krappfeld", "Krappfeld Circuit Race", "Krappfeld", "Circuit race", 7, "mid"), // 2026-07-12
  at("at-muehlviertel", "7. Mühlviertel Hill World Classic", "Königswiesen/Mühlviertel", null, 9, "mid"), // 2026-09-13
  at("at-boa", "BOA Youth Road Race", "Steinhaus bei Wels", "Road race", 9, "mid"), // 2026-09-20
  { id: "it-fci-179377", name: "59° COPPA BELRICETTO", place: "BELRICETTO DI LUGO", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178894", name: "G.P. GIULIANO BARONTI", place: "LOC. CERBAIA", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179267", name: "M.O. SPORTIVI LA RIZZA - TR. EX CORRIDORI GS LA RIZZA", place: "RIZZA", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179352", name: "TROFEO TECNOMECCANICA", place: "VOLTA MANTOVANA", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178895", name: "67° CIRCUITO DELLE CONCHE", place: "SILVELLA DI CORDIGNANO", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179378", name: "GP CITTA' DI NONANTOLA", place: "NONANTOLA", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179379", name: "GP CITTA' DI NONANTOLA", place: "NONANTOLA", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 3, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179597", name: "MEMORIAL CLARA E FALIERO VANGI", place: "CALENZANO", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180242", name: "4^ CRONOVERSILIA", place: "LIDO DI CAMAIORE", country: "Italy", categories: ["U19M"], type: "Individual time trial", month: 3, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178696", name: "13° PICCOLO TROFEO ALFREDO BINDA - VALLI DEL VERBANO", place: "LUINO - CITTIGLIO", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 3, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179354", name: "46^ PICCOLA SAN GEO- 29° TROFEO.MARA", place: "BUSTO ARSIZIO", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179929", name: "COPPA CITTA' DI GENOVA", place: "GENOVA - CORSO ITALIA", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-180538", name: "LA GARIBALDINA", place: "MENTANA", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179319", name: "22° TROFEO RISTORANTE ALLA COLOMBERA G.P.V IERRE ARREDAMENTI TROFEO FRASSON ROTTAMI", place: "ALTIVOLE", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179380", name: "73° COPPA SENIO", place: "CASSANIGO DI COTIGNOLA (RA)", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180008", name: "35º NOVARA SUNO - 12° MEMORIAL TOSI", place: "NOVARA-SUNO", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179332", name: "64° GP RINASCITA-JUNIORES", place: "RONCADELLE", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179384", name: "GP FIORITURA", place: "VIGNOLA", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180606", name: "GRANPREMIO MARCELLO FALCONE", place: "TERRACINA", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181232", name: "TROFEO IREN", place: "TERMO (SP)", country: "Italy", categories: ["U19M"], type: "Road race", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179026", name: "TROFEO MICHELE SCARPONI - DUE GIORNI", place: "CAMERINO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178896", name: "TROFEO MICHELE SCARPONI - DUE GIORNI", place: "CAMERINO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179444", name: "71° GRAN PREMIO MARTIRI DELLA LIBERTA'", place: "SAN BELLINO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179981", name: "COPPA PALAZZOLO 2026 TROFEO TERRE DI AQUINUM - PROVA VALIDA COME CAMPIONATO REGIONALE", place: "CASTROCIELO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178907", name: "GRAN PREMIO DEL PERDONO", place: "MELEGNANO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179114", name: "62° GIRO DELLA CASTELLANIA", place: "PETTENASCO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179394", name: "25° G.P. COLLI MARIGNANESI - JUNIORES", place: "SAN GIOVANNI IN MARIGNANO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181466", name: "4° MEMORIAL GERMANO VITTONI_PROVA VALIDA CAMPIONATO PROVINCIALE", place: "PIEDIMULERA VB", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178908", name: "4° PICCOLA LIEGI DELLE BREGONZE – CASA ENRICO", place: "THIENE", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179447", name: "GP DI VIGONZA STRADE DE GIARA ( MEMORIAL LUIGI MARCHIORO)", place: "VIGONZA", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179396", name: "TROFEO BUSSOLATI ASFALTI", place: "BIANCONESE", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179450", name: "1° GRAN PREMIO JUNIORES SANT'ANNA", place: "SANT'ANNA DI ROSà", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-180578", name: "23° GIRO DELLA VALDIGREVE-TR. ALFREDO BARBIERI-COPPA MAURIZIO DINI-TR. SIMONE CAMICIOTTI", place: "GREVE IN CHIANTI (FI)", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178909", name: "3° TROFEO PROTECH - MEM. RODOLFO BARDELLONI", place: "REZZATO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179550", name: "COPPA SPORTIVI COMUNE DI TRICESIMO", place: "TRICESIMO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179397", name: "V TROFEO CITTÀ DI GOSSOLENGO-IIIVII TROFEO ALBERTO BIONDI-V MEMORIAL RINO ANDRINA", place: "GOSSOLENGO", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178677", name: "LIBERAZIONE JUNIOR", place: "ROMA", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181567", name: "1° TROFEO DELLA LIBERAZIONE COMUNE DI COLLESALVETTI", place: "COLLESALVETTI (LI)", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 4, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-178911", name: "50° GRAN PREMIO LIBERAZIONE CITTA' DI MASSA", place: "MASSA", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180187", name: "62° TROFEO CADUTI E DISPERSI COMUNE DI PASSIRANO - 41° TROFEO ERNESTO VALLONCINI A.M. -", place: "CAMIGNONE", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-178678", name: "71^ COPPA MONTES - GRAN PREMIO DELLA RESISTENZA", place: "MONFALCONE - GORIZIA", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-178679", name: "15° GIRO DI PRIMAVERA - 2° TROFEO \"GINO MAZZER\"", place: "SAN VENDEMIANO - TREVISO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181666", name: "4° G.P. SAN LEOLINO - 2° MEMORIAL RONDONI ROMANO", place: "BUCINE (AR) - FRAZ. SAN LEOLINO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179244", name: "COPPA 1° MAGGIO DEL CERAMISTA", place: "PONZANO", country: "Italy", categories: ["U19M"], type: "Road race", month: 4, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179762", name: "GIORNATA ROSA G.P.PRIMAVERA 5° TROFEO AGENZIA IMMOBILIARE VERDE CASA", place: "CRESPIGNAGA DI MASER", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 4, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180790", name: "\"38° GRAN PREMIO BCC CANTÙ - 46^ COPPA CITTÀ DI CANTÙ\" - CAMP. PROV. COMO E MILANO", place: "CANTU'", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180785", name: "\"4° TROFEO ROSA CITTÀ DI CANTÙ\" - CAMPIONATO PROVINCIALE", place: "CANTU'", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179452", name: "57° GRAN PREMIO SPORTIVI DI BADOERE", place: "BADOERE", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179404", name: "69° G. P. DI SAN PROSPERO", place: "SAN MARTINO SUL SECCHIA", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180026", name: "67° GP U.C.A.T.", place: "PAESANA CN", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180843", name: "2° TROFEO EDIL GROUP COSTRUZIONI - PICCOLO FIANDRE", place: "CASTIGLIONE DELLE STIVIERE", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179457", name: "10° GP AMICI DEL CICLISMO", place: "SAN PIETRO IN CARIANO", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179411", name: "40° MEMORIAL SAURO DREI", place: "REDA", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180517", name: "G.P. CITTA' DI CORTONA - 25° TR. VAL DI PIERLE - GARA VALIDA COME CAMPIONATO REGIONALE", place: "MERCATALE DI CORTONA (AR)", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180352", name: "G.P. MAGGIO FIASCHETTANO - MEM. IVO FRESCHI - ASSEGNAZIONE MAGLIA CAMPIONATO REGIONALE", place: "FIASCHETTI DI CANEVA", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178914", name: "DUE GIORNI DI BRESCIA E BERGAMO", place: "ROVATO", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178915", name: "DUE GIORNI DI BRESCIA E BERGAMO", place: "GRUMELLO DEL MONTE", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179458", name: "GRAN PREMIO SAN MICHELE", place: "SAN PIETRO DI FELETTO", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179459", name: "65° VITTORIO VENETO - CANSIGLIO", place: "VITTORIO VENETO", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180334", name: "TUSCANY CYCLING ACADEMY JUNIORES", place: "SANTA FIORA", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179482", name: "27° TROFEO SPORTIVI DI SAN MARTINO", place: "SAN BIAGIO DI CALLALTA", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181602", name: "3° TROFEO OMNIA 6° MEMORIAL MICHAEL ANTONELLI - AUTODROMO ENZO E DINO FERRARI IMOLA", place: "AUTODROMO ENZO E DINO FERRARI IMOLA", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180879", name: "45° TROFEO PISTOLESI - 29° MEMORIAL ANGELO E SERGIO", place: "FAGNANO OLONA", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-178681", name: "EROICA JUNIORES COPPA ANDREA MENEGHELLI", place: "SIENA", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180888", name: "4° TROFEO AVIS CITTA' DI CODOGNO", place: "CODOGNO", country: "Italy", categories: ["U19M"], type: "Road race", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181213", name: "39° BRESCIA - MONTE MAGNO", place: "BRESCIA MONTEMAGNO", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179891", name: "56^ COPPA SPORTIVI DI BAGNOLO", place: "MONTEMURLO (PO) - FRAZ. BAGNOLO", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180046", name: "MEMORIAL ALBERTO GIACCARDI_ PROVA VALIDA CAMP. REG. JUNIORES", place: "CASTELLAR SALUZZO CN", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181345", name: "13° MEMORIAL PIETRO ZIPPONI", place: "BRIONE", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179483", name: "2° G.P. CITTA' DEL MANDORLATO DI COLOGNA VENETA", place: "COLOGNA VENETA", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181588", name: "6° MEMORIAL MAURIZIO BRESCI - PICCOLA LIEGI", place: "PRATO - FRAZ. GALCIANA", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178680", name: "6° TROFEO EMOZIONE", place: "VIVARO - PORDENONE", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181283", name: "TROFEO ROBERTI", place: "PUEGNAGO DEL GARDA BS", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179484", name: "13 MEMORIAL GUIDO CARTA - 50 ANNI DI CICLISMO A SAN PIETRO IN GU", place: "SAN PIETRO IN GU", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181348", name: "23° GIRO DELLA BRIANZA MEMORIAL DARIO E GERMANO CORBETTA", place: "OLGIATE MOLGORA", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179692", name: "33° MEMORIAL DIEGO SCHIAROLI", place: "PIANELLO DI OSTRA", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178683", name: "38° TROFEO GD DORIGO - 15^ M.O. SOGNO VENETO - 4° TROFEO MEROTTO SPUMANTI", place: "PIEVE DI SOLIGO - TREVISO", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181261", name: "68^ COPPA VALLE GRANA", place: "CARAGLIO CN", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-180373", name: "54°COPPA FRATELLI GRANZOTTO - ASSEGNAZIONE MAGLIA PROVINCIALE UD", place: "CORNO DI ROSAZZO", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179214", name: "CAMPIONATO ITALIANO STRADA DONNE JUNIORES", place: "SORA", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179765", name: "70ª COPPA VALSENIO JUNIORES", place: "CASTEL BOLOGNESE", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179215", name: "CAMPIONATO ITALIANO STRADA JUNIORES", place: "SORA", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179562", name: "SCANDOLARA -PIANEZZE 1° GP KRELAMP - BROFER - MEMORIAL S SCHIAVON", place: "SCANDOLARA", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181367", name: "5° TROFEO ALLIANZ BANK", place: "CASATICO DI MARCARIA", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179797", name: "25° GRAN PREMIO ADALBERTO GABRIELLONI", place: "CAMPOCAVALLO DI OSIMO", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-182267", name: "2° TROFEO KUBABA VIAGGI DALL'ERBALUCE AL PARADISO", place: "CALUSO TO", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181374", name: "4° GP CITTA' DI MORBEGNO", place: "MORBEGNO", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180875", name: "5^ COPPA GIUDICARIE CENTRALI - CAMPIONATO TRENTINO DONNE JUNIOR", place: "CAMPO SPORTIVO SESENA", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179487", name: "VITTORIO VENETO - SAN BOLDO", place: "VITTORIO VENETO", country: "Italy", categories: ["U19M"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179430", name: "11° GRAN PREMIO TEAM9", place: "MASSA FINALESE", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178921", name: "29° GRAN PREMIO DELL'ARNO", place: "SOLBIATE ARNO", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179553", name: "2° TROFEO TERRA DEI FORTI - B.I.M. ADIGE", place: "RIVOLI VERONESE", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181597", name: "82^ COPPA GIULIO BURCI", place: "POGGIO A CAIANO (PO)", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179799", name: "9° TROFEO GIOVANI PROMESSE", place: "PIANA DI TALACCHIO - COLBORDOLO", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179824", name: "1^ BREGANZE-MONTE CORNO, 9° M. \"VALERIA CAPPELLOTTO\" 1° M. KEVIN BONALDO", place: "BREGANZE-MONTE CORNO", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178922", name: "49^ PICCOLA TRE VALLI VARESINE JUNIORES", place: "CASALE LITTA", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179554", name: "67° PIVA JUNIOR DAY", place: "COL SAN MARTINO", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-180574", name: "8° MEDAGLIA D’ORO ANTONIO BUSICO", place: "SANTA MARIA CAPUA VETERE", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181426", name: "28° GRAN PREMIO MAP - MEMORIAL GIACOMO E CARLO SCIOLA", place: "OSIO SOTTO", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178924", name: "48^ SANDRIGO - MONTE CORNO", place: "SANDRIGO", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-180087", name: "58^ CIRIE'-PIAN DELLA MUSSA", place: "CIRIE' (TO)", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181600", name: "30° G.P. NERI SOTTOLI.IT - 19° MEMORIAL CLAUDIO CECCONI", place: "VINCI (FI)", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-178684", name: "55° GRAN PREMIO SPORTIVI LORIA", place: "LORIA", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179432", name: "6° TROFEO PAR I VIUL DELLA BASSA ROMAGNA", place: "LUGO FRAZ. Cà DI LUGO (RA)", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180885", name: "TROFEO CANTINE MOSER - CAMPIONATO TRENTINO", place: "GIOVO", country: "Italy", categories: ["U19M"], type: "Road race", month: 7, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180566", name: "GIRO DELL' AGLIANICO DEL VULTURE", place: "BANZI", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178925", name: "22° MEMORIAL ANTONIO COLO'", place: "BRUGNATO (SP)", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180104", name: "4° MEMORIAL \"PIPPO FALLARINI\"", place: "VAPRIO D'AGOGNA NO", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179555", name: "53° GIRO DEL PONTE", place: "FAè DI ODERZO", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180567", name: "GIRO DELL' AGLIANICO DEL VULTURE", place: "FORENZA - MASCHITO", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178926", name: "11 GRAN PREMIO DELLA GARFAGNANA-MEMORIAL GINO BARTALI", place: "SAN ROMANO IN GARFAGNANA", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180113", name: "5° MEMORIAL PAOLO SALVATICO - Prova valida Camp. Prov. Cuneo", place: "PIASCO CN", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180107", name: "7° TROFEO SANTUARIO MADONNA DEL BODEN", place: "ORNAVASSO VB", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181605", name: "\"1° MEMORIAL GUERRINO COMINOTTI 2°MEMORIAL MARCELLO & SILVANA MAFFIETTI\"", place: "AGNOSINE", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180985", name: "18° TROFEO BALACCO PAPONI", place: "PETRITOLI", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-182678", name: "33^ TROFEO MAIONCHI NEVIO ALLA MEMORIA -12^MEMORIAL MAIONCHI NILVIO", place: "CHIESINA UZZANESE FRAZIONE CHIESANUOVA UZZANESE", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181606", name: "46° TROFEO COMUNE DI PIAN CAMUNO", place: "PIAN CAMUNO (BS)", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178928", name: "80° GP INDUSTRIA DEL CUOIO E DELLE PELLI", place: "SANTA CROCE SULL'ARNO", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179777", name: "4° TROFEO IRRIDUCIBILI - MEMORIAL CADUTI SUL LAVORO", place: "TERRICCIOLA (PI) - FRAZ. LA ROSA", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178929", name: "64^ COPPA PIETRO LINARI", place: "BUGGIANO", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178930", name: "3° G.P. CAFFE' BORBONE", place: "FAENZA", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181031", name: "36° GIRO DELLA VALLATA FELTRINA - TROFEO DBS", place: "CESIOMAGGIORE", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180764", name: "57° GRAN PREMIO MOCAIANA - TR. CHIROFISIOGEN CENTER - MEMORIAL MARTINO PROCACCI", place: "MOCAIANA", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181794", name: "GP TERRA DEL CESANESE-Prova Valida per il Campionato Provinciale Roma", place: "OLEVANO ROMANO", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-182716", name: "TRITTICO ROSA ALTA MARCA TREVIGIANA - STRADA", place: "VALDOBBIADENE", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-178686", name: "28° TROFEO COMUNE DI VERTOVA - 23° MEM. PIETRO - GIOVANNI MERELLI", place: "VERTOVA - BG", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181795", name: "GP MADONNA DELLE GRAZIE", place: "ALLUMIERE", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181613", name: "11° M.O. ALBA ROSA", place: "CALVAGESE DELLA RIVIERA", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-178687", name: "54° TROFEO EMILIO PAGANESSI", place: "VERTOVA - BG", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179557", name: "CASTELFRANCO VENETO - MONTE TOMBA 1° GP MARDEGAN LEGNO", place: "CASTELFRANCO VENETO", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179877", name: "TRITTICO ROSA ALTA MARCA TREVIGIANA - STRADA", place: "VALDOBBIADENE", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180581", name: "XXIV MEMORIAL PAOLO BATIGNANI - XXIX MEMORIAL NATALINO CRINI", place: "LOC. DONNINI", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-179941", name: "56° CLASSICO GIRO DEL MEDIO PO", place: "CASTEL SAN GIOVANNI", country: "Italy", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-178931", name: "80° G.P. COMUNE DI CERRETO GUIDI", place: "CERRETO GUIDI (FI)", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181420", name: "10^ EDIZIONE LA CORSA DEL DOTTOR CARLO", place: "CEPAGATTI", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-182637", name: "PICCOLA VUELTA DEL CANAVESE- TROFEO ANGELO CONTERNO", place: "PERTUSIO (TO)", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-178932", name: "28° TROFEO SAN ROCCO", place: "FABBRICA DI PECCIOLI", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181626", name: "7° TROFEO ART COSMETIC CAMPIONATO REGIONALE", place: "FORNOVO SAN GIOVANNI", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 9, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181631", name: "CRITERIUM 648 - 9° TROFEO DANILO FIORINA A.M. - CAMPIONATO PROVINCIALE", place: "CLUSONE", country: "Italy", categories: ["U19M"], type: "Criterium", month: 9, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179203", name: "5° GIRO DELLA LUNIGIANA DONNE JUNIORES", place: "MARINELLA DI SARZANA", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 9, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179204", name: "5° GIRO DELLA LUNIGIANA DONNE JUNIORES", place: "ARCOLA", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 9, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180463", name: "85° TROFEO OTTAVIO BOTTECCHIA - MEMORIAL WALTER GUERRA", place: "PIANCAVALLO", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179558", name: "1° GP SICC TECH - 47° GP COMUNE VILLADOSE - 8° MEMORIAL E. BETTONTE - 2° MEMORIAL TITA G.", place: "VILLADOSE", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181642", name: "35° MEMORIAL ANNIBALE FRANCHINI", place: "PROVEZZE", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178689", name: "57° TROFEO BUFFONI", place: "CINQUALE - FORTE DEI MARMI - MONTIGNOSO - MS", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181647", name: "4°TROFEO ZAZA'", place: "GORLA MAGGIORE", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-178691", name: "6° TROFEO TOP AUTOMAZIONI - 3° MEMORIAL DAVIDE BERTOZZI", place: "POGGIO TORRIANA (RN)", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181705", name: "G.P. SPORTIVI VISANESI", place: "VISANO", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179559", name: "ORSAGO-COL ALT - MEM. MAZZA", place: "ORSAGO", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-179814", name: "\"PAPÀ ELIO\" GRAN PREMIO GIORGIO MARE", place: "URBISAGLIA", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-181725", name: "11° OLGIATE - GHISALLO, 45° TROFEO GIUSEPPE ROSANNA E MARIA LUISA VISMARA", place: "OLGIATE MOLGORA", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-182846", name: "27° TROFEO INDUSTRIA COMMERCIO ARTIGIANATO RIGNANESE", place: "RIGNANO SULL'ARNO", country: "Italy", categories: ["U19M"], type: "Road race", month: 9, period: "late", label: PROVISIONAL_LABEL },
  { id: "it-fci-180930", name: "22° GIRO DEI PAESI DEL COMUNE DI CITERNA", place: "FIGHILLE DI CITERNA", country: "Italy", categories: ["U19M"], type: "Road race", month: 10, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181817", name: "38° TROFEO COMUNE DI MALEO", place: "MALEO", country: "Italy", categories: ["U19M"], type: "Road race", month: 10, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-179561", name: "68° COPPA BORGO PANICA 25° TROFEO UNIPOLSAI 4° TROFEO MUBRE", place: "MAROSTICA", country: "Italy", categories: ["U19M"], type: "Road race", month: 10, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-181812", name: "9° MEMORIAL FABRIZIO AFFINI", place: "BUSCOLDO DI CURTATONE", country: "Italy", categories: ["U19M"], type: "Road race", month: 10, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-182804", name: "GIRO DELLE VALLI ARETINE JUNIORES-21° TR. BUTINTORO-13° TR. CAV UFF. MARIO GIACCHERINI", place: "RIGUTINO", country: "Italy", categories: ["U19M"], type: "Road race", month: 10, period: "early", label: PROVISIONAL_LABEL },
  { id: "it-fci-180469", name: "13° GRAN PREMIO VALLI DEL NATISONE", place: "SAN PIETRO AL NATISONE", country: "Italy", categories: ["U19M"], type: "Road race", month: 10, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181818", name: "1° GP DAIRAGO IN ROSA", place: "DAIRAGO", country: "Italy", categories: ["U19Ž"], type: "Road race", month: 10, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181823", name: "PICCOLO LOMBARDIA JUNIORES", place: "SENAGO", country: "Italy", categories: ["U19M"], type: "Road race", month: 10, period: "mid", label: PROVISIONAL_LABEL },
  { id: "it-fci-181825", name: "32° TROFEO POLISPORTIVA CAMIGNONE - 18ª M.ORO GIUSEPPE PRESTI A.M.", place: "CAMIGNONE", country: "Italy", categories: ["U19M"], type: "Road race", month: 10, period: "mid", label: PROVISIONAL_LABEL },
];

function windowLabel(race: Race) {
  const p = PERIOD_LABEL[race.period];
  const m = MONTHS[race.month - 1];
  return p ? `${p} ${m}` : m;
}

// Display order only — never by country, so entries from different countries
// interleave through the season. Chronological first: month, then the
// approximate window inside it ("any" means no window was given, so it sorts
// after the dated windows of that month). Same month and window sort by name,
// then by id, so the result is identical in the browser and on the server.
function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Locale-free name key: lowercased, diacritics stripped, whitespace collapsed.
function nameKey(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function compareRaces(a: Race, b: Race) {
  return (
    a.month - b.month ||
    PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period] ||
    compareText(nameKey(a.name), nameKey(b.name)) ||
    compareText(a.id, b.id)
  );
}


function FilterSelect({ id, label, value, onChange, allLabel, options }: {
  id: string; label: string; value: string; onChange: (value: string) => void; allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 shadow-none"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Index() {
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState("all");
  const [date, setDate] = useState("");
  const [raceType, setRaceType] = useState("all");
  const filtered = country !== "all" || category !== "all" || date !== "" || raceType !== "all";
  const dateMonth = date ? Number(date.slice(5, 7)) : null;
  const races = RACES
  .filter((r) =>
    (country === "all" || r.country === country) &&
    (category === "all" || r.categories.includes(category)) &&
    (raceType === "all" || r.type === raceType) &&
    (dateMonth === null || r.month === dateMonth)
  )
  .sort(compareRaces);

  function resetFilters() {
    setCountry("all"); setCategory("all"); setDate(""); setRaceType("all");
  }

  return (
    <div id="vrh" className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5 px-6 py-6 sm:py-8">
        <a href="#vrh" className="font-serif text-xl font-medium transition-colors hover:text-lime-foreground">{SITE.brand}</a>
        <nav aria-label="Main navigation" className="flex gap-5 text-sm text-muted-foreground sm:gap-8">
          <a href="#koledar" className="underline-offset-4 hover:text-foreground hover:underline hover:decoration-lime">Calendar</a>
          <a href="#viri" className="underline-offset-4 hover:text-foreground hover:underline hover:decoration-lime">Sources & verification</a>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="border-b border-border py-14 sm:py-20">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-medium">
            <span className="bg-lime px-2.5 py-1 text-lime-foreground">In progress</span>
            <span className="text-muted-foreground">Europe · Road cycling · U19</span>
          </div>
          <h1 className="font-serif text-5xl leading-tight font-medium sm:text-7xl">{SITE.brand}</h1>
          <p className="mt-6 max-w-2xl font-serif text-2xl leading-snug sm:text-3xl">The next race starts here.</p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{SITE.intro}</p>
          <Button asChild variant="link" className="mt-7 h-11 px-0 text-foreground underline decoration-lime decoration-2 underline-offset-8">
            <a href="#koledar">View the calendar <ArrowDown aria-hidden="true" /></a>
          </Button>
        </section>

        <section id="koledar" className="scroll-mt-6 border-b border-border py-12 sm:py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-3xl font-medium sm:text-4xl">Race calendar</h2>
            <span className="text-xs text-muted-foreground">U19 Men / U19 Women</span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">We add and verify races country by country. Provisional entries without exact dates are listed for Slovenia — all approximate dates will be corrected once official dates are published.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-4">
            <FilterSelect id="drzava" label="Country" value={country} onChange={setCountry} allLabel="All countries" options={COUNTRIES.map((value) => ({ value, label: value }))} />
            <FilterSelect id="kategorija" label="Category" value={category} onChange={setCategory} allLabel="Both categories" options={CATEGORIES} />
            <div className="space-y-2">
              <label htmlFor="datum" className="text-xs font-medium">Date</label>
              <Input id="datum" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 min-w-0 shadow-none" />
            </div>
            <FilterSelect id="tip-dirke" label="Race type" value={raceType} onChange={setRaceType} allLabel="All types" options={RACE_TYPES.map((value) => ({ value, label: value }))} />
          </div>
          <div className="mt-4 flex min-h-9 items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{races.length} provisional {races.length === 1 ? "entry" : "entries"} · 0 officially confirmed</span>
            <Button variant="ghost" size="sm" disabled={!filtered} onClick={resetFilters}><RotateCcw aria-hidden="true" />Reset filters</Button>
          </div>
          <div role="status" aria-live="polite" className="mt-5">
            {races.length > 0 ? (
              <>
                <p className="border-y border-border bg-lime/30 px-4 py-3 text-xs font-medium">{PROVISIONAL_LABEL}. Dates are approximate windows based on the 2026 calendar pattern and are not confirmed. The official race notice will be authoritative.</p>
                <ul className="divide-y divide-border border-b border-border">
                  {races.map((r) => (
                    <li key={r.id} className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr_auto] sm:items-baseline sm:gap-6">
                      <div className="text-sm">
                        <span className="font-medium">Approx.: {windowLabel(r)}</span>
                        {r.extraTentative && <span className="mt-1 block text-xs text-muted-foreground">Highly tentative — date unknown</span>}
                      </div>
                      <div>
                        <h3 className="font-serif text-xl font-medium">{r.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{r.place}, {r.country} · {r.categories.map((c) => CATEGORIES.find((x) => x.value === c)?.label ?? c).join(" / ")} · {r.type ?? "Race type not yet confirmed"}</p>
                      </div>
                      <span className="w-fit border border-border px-2 py-1 text-xs text-muted-foreground">{PROVISIONAL_LABEL}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="border-y border-border py-14 text-center sm:py-16">
                <CalendarDays aria-hidden="true" className="mx-auto mb-5 size-8 text-muted-foreground" strokeWidth={1.25} />
                <h3 className="font-serif text-2xl font-medium">No entries match the selected filters.</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">We don’t show sample or made-up data. Provisional entries are currently available for Slovenia only.</p>
              </div>
            )}
          </div>
        </section>

        <section id="viri" className="scroll-mt-6 grid gap-6 py-12 sm:grid-cols-[1fr_1.5fr] sm:gap-16 sm:py-16">
          <h2 className="font-serif text-3xl font-medium">Official sources.<br />Verified data.</h2>
          <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
            <p>Our data will come from official race notices published by organisers and cycling federations. Every published race will link to its official notice.</p>
            <p>We add countries gradually. Before publishing, we check the date, location, category and race type. A country appearing in the filter doesn’t mean its races have been verified or added yet.</p>
            <p>For final details on the event and registration, the organiser’s official race notice always takes precedence.</p>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-6 text-xs text-muted-foreground">
        <span className="font-serif text-base text-foreground">{SITE.brand}</span>
        <span>European U19 road race calendar</span>
        <a href="#vrh" aria-label="Back to top" className="inline-flex min-h-11 items-center gap-1 hover:text-foreground">Back to top <ArrowUpRight className="size-3.5" aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
