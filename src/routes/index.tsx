import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, CalendarDays, RotateCcw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IMPORTED_RACES } from "./-young-peloton-8000";
import { RaceSourceLinks } from "@/components/RaceSourceLinks";

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
  { id: "at-hungerburg-classics", name: "Hungerburg Classics", place: "Innsbruck", country: "Austria", categories: ["U19M", "U19Ž"], type: "Road race", month: 4, period: "early", label: AT_2027_LABEL },
  { id: "at-vicc-race-day-1", name: "VICC Race Day I", place: "Vienna", country: "Austria", categories: ["U19Ž"], type: "Criterium", month: 5, period: "early", label: AT_2027_LABEL },
  { id: "at-kindberger-bergrennen", name: "14. Kindberger Bergrennen", place: "Kindberg", country: "Austria", categories: ["U19M", "U19Ž"], type: "Road race", month: 5, period: "mid", label: AT_2027_LABEL },
  { id: "at-sportland-noe-women-tour", name: "Sportland NÖ women|kids tour", place: "Lower Austria", country: "Austria", categories: ["U19Ž"], type: "Stage race", month: 5, period: "late", label: AT_2027_LABEL },
  { id: "at-rlm-wien-race-day", name: "ARBÖ ASKÖ RLM Wien Race Day", place: "Vienna", country: "Austria", categories: ["U19M", "U19Ž"], type: "Criterium", month: 5, period: "late", label: AT_2027_LABEL },
  { id: "at-alois-kainer", name: "Alois Kainer Gedenkrennen", place: "Großhartmannsdorf", country: "Austria", categories: ["U19M", "U19Ž"], type: "Road race", month: 5, period: "late", label: AT_2027_LABEL },
  { id: "at-poestlingberg-classic", name: "Pöstlingberg Classic", place: "Linz", country: "Austria", categories: ["U19M", "U19Ž"], type: "Road race", month: 6, period: "early", label: AT_2027_LABEL },
  { id: "at-kriterium-grafenstein", name: "Kriterium Grafenstein", place: "Grafenstein", country: "Austria", categories: ["U19M", "U19Ž"], type: "Criterium", month: 6, period: "early", label: AT_2027_LABEL },
  { id: "at-oem-zeitfahren", name: "ÖM/ÖSTM Einzelzeitfahren Weißenbachtal", place: "Weißenbachtal / Bad Ischl", country: "Austria", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 6, period: "late", label: AT_2027_LABEL },
  { id: "at-juniorenrundfahrt", name: "51. Internationale Juniorenrundfahrt", place: "Upper Austria", country: "Austria", categories: ["U19M"], type: "Stage race", month: 7, period: "late", label: AT_2027_LABEL },
  { id: "at-kitzbuehler-horn", name: "46. Internationales Kitzbühler Horn Radrennen", place: "Kitzbühel", country: "Austria", categories: ["U19M", "U19Ž"], type: "Road race", month: 7, period: "late", label: AT_2027_LABEL },
  { id: "at-gaisberg-bergrennen", name: "Gaisberg Bergrennen", place: "Salzburg", country: "Austria", categories: ["U19M"], type: "Road race", month: 8, period: "mid", label: AT_2027_LABEL },
  { id: "at-internationale-alpe-adria-tour", name: "Internationale Alpe Adria Tour", place: "Villach / Kärnten (več etap)", country: "Austria", categories: ["U19M", "U19Ž"], type: "Stage race", month: 8, period: "mid", label: AT_2027_LABEL },
  { id: "at-afritz-verditz", name: "ARBÖ Helvetia Bergpreis Afritz–Verditz", place: "Afritz–Verditz", country: "Austria", categories: ["U19M", "U19Ž"], type: "Road race", month: 8, period: "late", label: AT_2027_LABEL },
  { id: "at-boa-sommercup-women", name: "BOA-Sommercup by RC Ovilava", place: "Marchtrenk", country: "Austria", categories: ["U19Ž"], type: "Criterium", month: 9, period: "early", label: AT_2027_LABEL },
  { id: "at-sophienalpenclassic", name: "Sophienalpenclassic", place: "Vienna Woods", country: "Austria", categories: ["U19M", "U19Ž"], type: "Road race", month: 9, period: "mid", label: AT_2027_LABEL },
  { id: "HU-013", name: "Hírös időfutam", place: "Kecskemét - Belváros", country: "Hungary", categories: ["U19M"], type: "Individual time trial", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "HU-018", name: "Utánpótlás Országúti OB", place: "Tamási - Coop parkoló", country: "Hungary", categories: ["U19M", "U19Ž"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "HU-020", name: "Időfutam OB", place: "Debrecen - Bocskaikert", country: "Hungary", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "HU-035", name: "Nation's Cup Hungary", place: "Tokaj – Ibrány; Vásárosnamény", country: "Hungary", categories: ["U19M"], type: "Stage race", month: 8, period: "mid", label: PROVISIONAL_LABEL },
  { id: "HU-047", name: "Budaörs Kritérium Gála", place: "Budaörs - BITEP", country: "Hungary", categories: ["U19M", "U19Ž"], type: "Criterium", month: 10, period: "early", label: PROVISIONAL_LABEL },
  { id: "CH-001", name: "9. Laufenburg City Run 38th Raiffeisen Fricktal Cup", place: "Laufenburg AG", country: "Switzerland", categories: ["U19M"], type: "Road race", month: 1, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-009", name: "59ème GP Berra Immobilier & 55ème Mémorial Jean Luisier", place: "Saillon VS", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 3, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-012", name: "45. GP Osterhas", place: "Affoltern am Albis ZH", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-013", name: "Swiss Road Series - 17th Grand Prix Mobiliar / GP RSC Aaretal", place: "Kiesen BE", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-014", name: "Ambrì criterion", place: "Quinto TI", country: "Switzerland", categories: ["U19Ž"], type: "Criterium", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-015", name: "Inferno di Cresciano", place: "Cresciano TI", country: "Switzerland", categories: ["U19Ž"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-016", name: "Inferno di Cresciano - Memorial Genini", place: "Cresciano TI", country: "Switzerland", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-021", name: "12e Prix du Sprinter club Lignon - Mémorial Jean-Marc Fortis / Duo Genevois", place: "Soral GE", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-023", name: "12e GP du VC Lancy / Duo Genevois", place: "Confignon GE", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-024", name: "KM cycling test Aarwangen (prologue time trial)", place: "Aarwangen BE", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-025", name: "CKW Cup Street Nunwil", place: "Hochdorf LU", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Criterium", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-027", name: "CRITERION \"AROUND THE POND RING\"", place: "Mauren FL", country: "Switzerland", categories: ["U19Ž"], type: "Criterium", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-028", name: "GP Cham Hagendorn", place: "Hagendorn ZG", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-029", name: "CKW Cup Road Oberkirch (Mountain Time Trial)", place: "Oberkirch LU", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-030", name: "Schaffhausen Evening Race", place: "Schaffhausen SH", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-033", name: "Tour of Bern", place: "Lyss BE", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-035", name: "CKW Cup Street Knutwil", place: "Knutwil LU", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-037", name: "Drive-up race in Diessenhofen", place: "Diessenhofen TG", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-038", name: "71. Silenen-Amsteg-Bristen hill climb", place: "Silenus UR", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-039", name: "CKW Cup Street Roggliswil", place: "Roggliswil LU", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-040", name: "60 Years of Brugger Evening Race (Season Start)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-041", name: "Schaffhausen Evening Race", place: "Schaffhausen SH", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-043", name: "Nat. Ehrendingen Whitsun Race", place: "Ehrendingen AG", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-045", name: "60 years of Brugger evening race (+1km sprint)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-046", name: "Schaffhausen Evening Race", place: "Schaffhausen SH", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-047", name: "Tour du Pays de Vaud", place: "Chamblon VD", country: "Switzerland", categories: ["U19M"], type: "Stage race", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-050", name: "Critérium cycliste Genevois - 6ème some", place: "Jussy GE", country: "Switzerland", categories: ["U19Ž"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-051", name: "60 years of Brugger evening races (extra women's races)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-052", name: "Schaffhausen Evening Race", place: "Hallau SH", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 5, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-055", name: "Axion Lugano Summer Ride 2026", place: "Lugano TI", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-056", name: "Hillclimb/time trial", place: "Zeihen AG", country: "Switzerland", categories: ["U19M"], type: "Individual time trial", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-057", name: "Critérium cycliste Genevois - 7ème some", place: "Jussy GE", country: "Switzerland", categories: ["U19Ž"], type: "Criterium", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-058", name: "60 years of Brugger evening race (+pursuit races)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-059", name: "Schaffhausen Evening Race", place: "Thayngen SH", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-061", name: "62. Cycling Days Gippingen", place: "Leuggern AG", country: "Switzerland", categories: ["U19Ž"], type: "Stage race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-064", name: "62. Cycling Days Gippingen", place: "Leuggern AG", country: "Switzerland", categories: ["U19M"], type: "Stage race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-065", name: "Blenio Cycling Festival", place: "Dongio TI", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-066", name: "60 Years of Brugger Evening Race (666 AR)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-067", name: "Schaffhausen Evening Race", place: "Wilchingen SH", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-071", name: "17. Nat. Individual time trial Thun", place: "Thun BE", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-072", name: "60 years of the Brugger evening race", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-073", name: "Schaffhausen Evening Race", place: "Schaffhausen SH", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-075", name: "Ch. suisse CLM / SM Time Trial", place: "Courtételle JU", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-076", name: "Ch. suisse en ligne / SM Strasse", place: "Courtételle JU", country: "Switzerland", categories: ["U19M", "U19Ž"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-077", name: "Schaffhausen Evening Race", place: "Merishausen SH", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-080", name: "Kaisten 38th Circuit Race, Raiffeisen Fricktal Cup", place: "Kaisten AG", country: "Switzerland", categories: ["U19M"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-081", name: "Winticrit", place: "Winterthur ZH", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-085", name: "60 Years of Brugger Evening Race (+Military Race)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: "Criterium", month: 7, period: "mid", label: PROVISIONAL_LABEL },
 { id: "CH-086", name: "Schaffhausen Evening Race", place: "Hallau SH", country: "Switzerland", categories: ["U19M"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-088", name: "60 years of Brugger evening racing (+handbike racing)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-089", name: "Schaffhausen Evening Race Final", place: "Schaffhausen SH", country: "Switzerland", categories: ["U19M"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-092", name: "55e Martigny-Mauvoisin", place: "Martigny VS", country: "Switzerland", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-093", name: "60 years of Brugger evening race (+1km sprint)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-096", name: "60 years of Brugger evening races (with extra women's races)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-099", name: "Swiss Road Series - Cycling.Race Basel", place: "Basel BS", country: "Switzerland", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-100", name: "60 Years of Brugger Evening Race (Final)", place: "Brugg AG", country: "Switzerland", categories: ["U19M"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-103", name: "RMVZOL Hill Climb Siebnen - Sattelegg", place: "Siebnen ZH", country: "Switzerland", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-104", name: "Lucerne Grand Prix road race", place: "Pfaffnau LU", country: "Switzerland", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-106", name: "Tour du Léman Juniors hommes et femmes U23,U19", place: "Carouge (GE) GE", country: "Switzerland", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-109", name: "50. Grand Prix Rüebliland", place: "Sulz AG AG", country: "Switzerland", categories: ["U19M"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-111", name: "Swiss Road Series - Cycling Days Gansingen", place: "Gansingen AG", country: "Switzerland", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-112", name: "Mountain time trial", place: "Gansingen AG", country: "Switzerland", categories: ["U19M"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-113", name: "Stabio Crit", place: "Stabio TI", country: "Switzerland", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "CH-114", name: "Chur-Arosa cycling classic - Swiss Mountain Championships 2026", place: "Chur GR", country: "Switzerland", categories: ["U19M", "U19Ž"], type: null, month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-pevele-carembault", name: "Pévèle Carembault Classic", place: "Hauts-de-France", country: "France", categories: ["U19M"], type: "Road race", month: 4, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-chrono-47", name: "Chrono 47", place: "Nouvelle-Aquitaine", country: "France", categories: ["U19M"], type: "Team time trial", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-frederic-moncassin", name: "Frédéric Moncassin Classic", place: "Cintegabelle / Occitanie", country: "France", categories: ["U19M"], type: "Individual time trial", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-tour-carmausin", name: "Tour du Carmausin Ségala U19", place: "Occitanie", country: "France", categories: ["U19M"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-classique-alpes", name: "La Classique des Alpes Juniors", place: "Auvergne-Rhône-Alpes", country: "France", categories: ["U19M"], type: "Road race", month: 6, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-puysaye-forterre", name: "Classique Puysaye Forterre", place: "Bourgogne-Franche-Comté", country: "France", categories: ["U19M"], type: "Circuit race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-route-eole", name: "La Route d'Éole U19", place: "Loir-et-Cher", country: "France", categories: ["U19M"], type: "Individual time trial", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-tour-eure", name: "Tour de l'Eure U19", place: "Eure", country: "France", categories: ["U19M"], type: "Stage race", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-sportbreizh", name: "La Sportbreizh U19", place: "Finistère / Bretagne", country: "France", categories: ["U19M"], type: "Stage race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-ronde-saone-loire", name: "Ronde de Saône-et-Loire U19", place: "Saône-et-Loire", country: "France", categories: ["U19M"], type: "Stage race", month: 7, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-tour-morbihan", name: "38ème Tour du Morbihan U19", place: "Morbihan / Bretagne", country: "France", categories: ["U19M"], type: "Road race", month: 9, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-tour-leman", name: "Tour du Léman Juniors – U19", place: "Haute-Savoie", country: "France", categories: ["U19M"], type: "Stage race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-champ-france-itt-h", name: "Championnats de France de l'Avenir — CLM U19 Hommes", place: "Chantonnay, Vendée", country: "France", categories: ["U19M"], type: "Individual time trial", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-champ-france-road-h", name: "Championnats de France de l'Avenir — course en ligne U19 Hommes", place: "Chantonnay, Vendée", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-champ-france-road-f", name: "Championnats de France de l'Avenir — course en ligne U19 Femmes", place: "Chantonnay, Vendée", country: "France", categories: ["U19Ž"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-champ-reg-hdf", name: "Championnat Régional HDF U19", place: "Somme / Hauts-de-France", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-champ-reg-aura", name: "Championnat Auvergne-Rhône-Alpes U19", place: "Rhône / Auvergne-Rhône-Alpes", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-champ-reg-pdl", name: "Beaumont-sur-Sarthe — Championnat régional U19", place: "Sarthe / Pays de la Loire", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-champ-reg-idf", name: "Sourdun — U19 Championnat Île-de-France", place: "Seine-et-Marne / Île-de-France", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-champ-reg-saintes", name: "Saintes — Championnat régional U19", place: "Charente-Maritime / Nouvelle-Aquitaine", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-neuville-ain", name: "Prix de Neuville s/Ain Classic Junior – U19", place: "Ain / Auvergne-Rhône-Alpes", country: "France", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-cote-or-classic", name: "La Côte d’Or Classic U19", place: "Côte-d’Or / Bourgogne-Franche-Comté", country: "France", categories: ["U19M"], type: "Stage race", month: 6, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-causses-aigoual", name: "Tour U19 Causses-Aigoual-Cévennes et Pays de Sommières", place: "Gard / Occitanie", country: "France", categories: ["U19M"], type: "Stage race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-tour-landes", name: "Tour des Landes U19 – 37ème édition", place: "Landes / Nouvelle-Aquitaine", country: "France", categories: ["U19M"], type: "Stage race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-regional-hdf-women", name: "Championnat Régional HDF U19-U23 & Plus Femmes", place: "Somme / Hauts-de-France", country: "France", categories: ["U19Ž"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-champ-france-clm-u19f", name: "Championnats de France de l’Avenir — CLM U19 Femmes", place: "Chantonnay / Vendée", country: "France", categories: ["U19Ž"], type: "Individual time trial", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-marenla-u19f", name: "Marenla — Journée vélo Femmes U19 & plus", place: "Marenla / Pas-de-Calais", country: "France", categories: ["U19Ž"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-fresnes-u19f", name: "Fresnes — Souvenir Alexis Chartrain (Femmes U19+)", place: "Fresnes / Loir-et-Cher", country: "France", categories: ["U19Ž"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-achards-clm-u19m", name: "Les Achards — CLM individuel U19", place: "Les Achards / Vendée", country: "France", categories: ["U19M"], type: "Individual time trial", month: 9, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-achards-clm-u19f", name: "Les Achards — CLM départemental Femmes U19", place: "Les Achards / Vendée", country: "France", categories: ["U19Ž"], type: "Individual time trial", month: 9, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-route-ouest-femmes-u19", name: "Château-Thébaud — Finale de la Route de l’Ouest Féminine", place: "Château-Thébaud / Loire-Atlantique", country: "France", categories: ["U19Ž"], type: "Road race", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-callac-coupe-bzh-avenir-u19", name: "Callac — Coupe BZH de l’Avenir U19 H", place: "Côtes-d’Armor, Bretagne", country: "France", categories: ["U19M"], type: "Road race", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-plouguernevel-bretagne-u19h", name: "Plouguernevel — Championnat de Bretagne de l’Avenir U19 H", place: "Côtes-d’Armor, Bretagne", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-plouguernevel-bretagne-u19f", name: "Plouguernevel — Championnat de Bretagne de l’Avenir U19 F", place: "Côtes-d’Armor, Bretagne", country: "France", categories: ["U19Ž"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-normandie-avenir-u19", name: "L’Étang-Bertrand — Championnat de Normandie de l’Avenir U19", place: "Manche, Normandie", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-labastide-clermont-hg-u19", name: "Labastide-Clermont — Championnat Haute-Garonne U19", place: "Haute-Garonne, Occitanie", country: "France", categories: ["U19M"], type: "Road race", month: 6, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-essarts-en-bocage-open-u19", name: "Essarts-en-Bocage — Open 1-2-3 (U19 classification)", place: "Vendée, Pays de la Loire", country: "France", categories: ["U19M"], type: "Road race", month: 3, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-pouant-open-u19", name: "Pouant — Open 2-3 + Access 1-4 (U19 classification)", place: "Vienne, Nouvelle-Aquitaine", country: "France", categories: ["U19M"], type: "Road race", month: 4, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-prix-urzy-u19", name: "Prix d’Urzy — Open 2/3 Access (U19 classification)", place: "Nièvre, Bourgogne-Franche-Comté", country: "France", categories: ["U19M"], type: "Road race", month: 4, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-chemery-open-u19f", name: "Chémery — Open 2-3-Access + Femmes U19 et plus", place: "Loir-et-Cher, Centre-Val de Loire", country: "France", categories: ["U19Ž"], type: "Road race", month: 4, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-moncontour-pentecote-u19", name: "Moncontour — Circuit de la Pentecôte (U19 classification)", place: "Côtes-d’Armor, Bretagne", country: "France", categories: ["U19M"], type: "Road race", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-st-philibert-tregunc-u19", name: "Saint-Philibert-en-Trégunc — Challenge Sud Océane #2 (U19 classification)", place: "Finistère, Bretagne", country: "France", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-noyal-vilaine-u19", name: "Noyal-sur-Vilaine — Finale Coupe de Bretagne des Clubs (U19 classification)", place: "Ille-et-Vilaine, Bretagne", country: "France", categories: ["U19M"], type: "Road race", month: 9, period: "mid", label: PROVISIONAL_LABEL },
  { id: "fr-ardentes-open-f-u19", name: "Ardentes — Open + Femmes U19 et plus", place: "Indre, Centre-Val de Loire", country: "France", categories: ["U19Ž"], type: "Road race", month: 5, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-nanteuil-open-u19", name: "Prix de la municipalité de Nanteuil — Open 1-2-3 U19", place: "Deux-Sèvres, Nouvelle-Aquitaine", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-longueau-open-u19", name: "Longueau — Prix de la ville Elite/Open 1-2-3 U19", place: "Somme, Hauts-de-France", country: "France", categories: ["U19M"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-ballots-open-u19", name: "Ballots — Prix de Ballots (U19 classification)", place: "Mayenne, Pays de la Loire", country: "France", categories: ["U19M"], type: "Road race", month: 8, period: "late", label: PROVISIONAL_LABEL },
  { id: "fr-saint-jean-de-monts-u19", name: "Saint-Jean-de-Monts — Open 1-2-3 (U19 classification)", place: "Vendée, Pays de la Loire", country: "France", categories: ["U19M"], type: "Road race", month: 8, period: "early", label: PROVISIONAL_LABEL },
  { id: "fr-maze-milon-u19", name: "Mazé-Milon — Open 2-3 + A1-A2 (U19 classification)", place: "Maine-et-Loire, Pays de la Loire", country: "France", categories: ["U19M"], type: "Road race", month: 7, period: "mid", label: PROVISIONAL_LABEL },
  { id: "ee-elva-criterium-2027", name: "Eesti meistrivõistlused kriteeriumis / 68. Elva Tänavasõit", place: "Elva", country: "Estonia", categories: ["U19M", "U19Ž"], type: "Criterium", month: 5, period: "late", label: PROVISIONAL_LABEL },
  { id: "ee-tt-championships-2027", name: "Columbia-Kivi Eesti meistrivõistlused eraldistardis", place: "Juuru, Rapla maakond", country: "Estonia", categories: ["U19M", "U19Ž"], type: "Individual time trial", month: 6, period: "mid", label: PROVISIONAL_LABEL },
  { id: "ee-road-championships-2027", name: "Eesti meistrivõistlused grupisõidus / Balti MV grupisõidus", place: "Panevėžys", country: "Lithuania (Estonian/Baltic Championships)", categories: ["U19M", "U19Ž"], type: "Road race", month: 6, period: "late", label: PROVISIONAL_LABEL },
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
  const RACES_PER_PAGE = 25;
const [currentPage, setCurrentPage] = useState(1);

const races: Race[] = [...RACES, ...IMPORTED_RACES];

const filteredRaces = races
  .filter((r) =>
    (country === "all" || r.country === country) &&
    (category === "all" || r.categories.includes(category)) &&
    (raceType === "all" || r.type === raceType) &&
    (dateMonth === null || r.month === dateMonth)
  )
  .sort(compareRaces);

const totalPages = Math.ceil(filteredRaces.length / RACES_PER_PAGE);

const paginatedRaces = filteredRaces.slice(
  (currentPage - 1) * RACES_PER_PAGE,
  currentPage * RACES_PER_PAGE
);

  function resetFilters() {
  setCountry("all");
  setCategory("all");
  setDate("");
  setRaceType("all");
  setCurrentPage(1);
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
            <span>{filteredRaces.length} provisional {races.length === 1 ? "entry" : "entries"} · 0 officially confirmed</span>
            <Button variant="ghost" size="sm" disabled={!filtered} onClick={resetFilters}><RotateCcw aria-hidden="true" />Reset filters</Button>
          </div>
          <div role="status" aria-live="polite" className="mt-5">
            {races.length > 0 ? (
              <>
                <p className="border-y border-border bg-lime/30 px-4 py-3 text-xs font-medium">{PROVISIONAL_LABEL}. Dates are approximate windows based on the 2026 calendar pattern and are not confirmed. The official race notice will be authoritative.</p>
                <ul className="divide-y divide-border border-b border-border">
                  {paginatedRaces.map((r) => (
                    <li key={r.id} className="grid gap-2 py-5 sm:grid-cols-[11rem_1fr_auto] sm:items-baseline sm:gap-6">
                      <div className="text-sm">
                        <span className="font-medium">Approx.: {windowLabel(r)}</span>
                        {r.extraTentative && <span className="mt-1 block text-xs text-muted-foreground">Highly tentative — date unknown</span>}
                      </div>
                      <div>
                        <h3 className="font-serif text-xl font-medium">{r.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{r.place}, {r.country} · {r.categories.map((c) => CATEGORIES.find((x) => x.value === c)?.label ?? c).join(" / ")} · {r.type ?? "Race type not yet confirmed"}</p>
                        <RaceSourceLinks raceId={r.id} />
                      </div>
                      <span className="w-fit border border-border px-2 py-1 text-xs text-muted-foreground">{PROVISIONAL_LABEL}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-center gap-4 py-6">
  <button
    type="button"
    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
    disabled={currentPage === 1}
    className="rounded border px-4 py-2 disabled:opacity-40"
  >
    Previous
  </button>

  <span>
    Page {currentPage} of {Math.max(1, totalPages)}
  </span>

  <button
    type="button"
    onClick={() =>
      setCurrentPage((page) => Math.min(totalPages, page + 1))
    }
    disabled={currentPage >= totalPages}
    className="rounded border px-4 py-2 disabled:opacity-40"
  >
    Next
  </button>
</div>
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
