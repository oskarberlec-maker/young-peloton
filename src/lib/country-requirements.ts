/** 2026 U19 domestic-entry summary, conservatively condensed from the user's
 * 'Pogoji po državah' worksheet (53 rows, last checked 2026-11-07).
 * Unknown means NOT established — never the same as a confirmed prohibition.
 * Every event may impose additional age, citizenship, team and registration rules.
 */
export type FederationEmailGuidance = {
  status: 'allowed-with-exceptions' | 'conditional' | 'unconfirmed';
  details: string;
  replyDate: string;
  calendarUrl?: string;
};
export type CountryRequirement = {club: 'required'|'usually'|'optional'|'conditional'|'uncertain'|'unknown'; solo:'possible'|'conditional'|'club-route'|'unconfirmed'; licence:string; note:string; source:string; federationEmail?:FederationEmailGuidance};
const data: [string,CountryRequirement['club'],CountryRequirement['solo'],string,string,string][] = [
 [
  "AL",
  "unknown",
  "unconfirmed",
  "National junior licence / registration not yet verified",
  "Health certificate required; confirm with federation.",
  "https://arsimi.gov.al/qendra-e-sherbimit-te-sportit/"
 ],
 [
  "AD",
  "required",
  "club-route",
  "FAC Junior competition licence",
  "Join an FAC-recognised club and supply medical clearance.",
  "https://faciclisme.com/ca/documentacio/"
 ],
 [
  "AM",
  "unknown",
  "unconfirmed",
  "Junior national licence details unverified",
  "Medical permission required for minors; federation registration needs confirmation.",
  "https://www.arlis.am/hy/acts/198725/print/act"
 ],
 [
  "AT",
  "usually",
  "unconfirmed",
  "Cycling Austria licence for Junior",
  "Normally via club / regional federation; signed medical and parental documents.",
  "https://cyclingaustria.at/infocenter/lizenzen"
 ],
 [
  "AZ",
  "unknown",
  "unconfirmed",
  "Junior licence process unverified",
  "Medical clearance required for youth riders.",
  "https://meclis.gov.az/news-qanun.php?id=1066&lang=az"
 ],
 [
  "BE",
  "optional",
  "possible",
  "Regional Junior racing licence",
  "Individual licensing exists; interclub races may require teams.",
  "https://cycling.vlaanderen/jeugd/jeugdgids"
 ],
 [
  "BY",
  "unknown",
  "unconfirmed",
  "Valid junior licence rules unverified",
  "The discovered licence document was only a draft.",
  "http://www.test.cycling.by/dokumenty"
 ],
 [
  "BG",
  "optional",
  "possible",
  "BFC Junior 17–18 competition licence",
  "Official register lists individual Men U19 riders; race restrictions vary.",
  "https://new.bgcf.bg/лицензиране/"
 ],
 [
  "BA",
  "required",
  "club-route",
  "BSBiH Junior competition licence",
  "Club submits the licence application.",
  "https://bisabih.ba/wp-content/uploads/2021/03/Pravilnik-o-licenciranju.pdf"
 ],
 [
  "CY",
  "unknown",
  "unconfirmed",
  "CCF race registration/licence",
  "Open recreational categories are not proof of junior race eligibility.",
  "https://www.cypruscycling.org/news/ccfann0704"
 ],
 [
  "DK",
  "required",
  "club-route",
  "DCU U19 competition licence",
  "DCU licence requires membership in an affiliated elite club.",
  "https://www.cyklingdanmark.dk/medlemmer/om-licens"
 ],
 [
  "EE",
  "unknown",
  "unconfirmed",
  "EJL U19 competition licence",
  "Club membership for Junior licence not established.",
  "https://ejl.ee/rattapere/litsentsid/litsentsi-info/"
 ],
 [
  "FO",
  "unknown",
  "unconfirmed",
  "U19 annual/day licence requirement unverified",
  "Local SST races may use specific entry rules.",
  "https://www.sst.fo/kalendari-sst-kappingar/"
 ],
 [
  "FI",
  "unknown",
  "unconfirmed",
  "Finnish Cycling national/international junior licence",
  "Check whether a domestic or international licence is required.",
  "https://pyoraily.fi/materiaalipankki/lisenssimateriaalit/"
 ],
 [
  "FR",
  "conditional",
  "conditional",
  "FFC race licence matching Access / Open / Elite level",
  "Individual Access licence is available from age 17; Open/Elite rules differ.",
  "https://velo.ffc.fr/se-licencier/tarifs/"
 ],
 [
  "GE",
  "unknown",
  "unconfirmed",
  "Junior racing licence process unverified",
  "Confirm requirements with federation and organiser.",
  "https://www.matsne.gov.ge/en/document/view/31552"
 ],
 [
  "GR",
  "usually",
  "unconfirmed",
  "EOP youth competition registration",
  "The published licence system is club-oriented.",
  "https://hellenic-cycling.gr/"
 ],
 [
  "HR",
  "required",
  "club-route",
  "HBS Junior competition licence",
  "The 2026 federation system licenses riders through clubs.",
  "https://www.hbs.hr/licenciranje-2026/"
 ],
 [
  "IE",
  "optional",
  "possible",
  "Cycling Ireland Junior Competition licence",
  "Unattached membership allowed; Limited Competition is insufficient for open road races.",
  "https://www.cyclingireland.ie/get-involved/membership/"
 ],
 [
  "IS",
  "uncertain",
  "unconfirmed",
  "HRÍ Junior 17–18 racing status",
  "Older rules refer to clubs; current Junior exception unknown.",
  "https://hri.is/keppni/672"
 ],
 [
  "IT",
  "required",
  "club-route",
  "FCI Juniores / Donna Junior membership (tessera)",
  "Standard Junior registration goes through an affiliated club.",
  "https://www.federciclismo.it/federazione/societaetesserati/tesseramento/costi-di-tesseramento/"
 ],
 [
  "IL",
  "conditional",
  "conditional",
  "Israel Cycling Federation rider registration",
  "Independent 2026 route is age-dependent; younger Junior riders need federation check.",
  "https://israelcycling.org.il/נוהל-רישום/"
 ],
 [
  "KZ",
  "unknown",
  "unconfirmed",
  "KCF/KFVS participant passport",
  "Club, school and regional teams listed; solo entry not established.",
  "https://cycling.kz/"
 ],
 [
  "XK",
  "usually",
  "unconfirmed",
  "FÇK competition licence with UCI ID",
  "Regulations describe annual renewal through clubs.",
  "https://kosovacycling.org/wp-content/uploads/2025/08/Rregullore-per-lisencimin-e-Klubeve.pdf"
 ],
 [
  "LV",
  "unknown",
  "unconfirmed",
  "LRF Junior racing licence",
  "Club requirement not confirmed for Juniors.",
  "https://licences.lrf.lv/"
 ],
 [
  "LI",
  "conditional",
  "conditional",
  "Swiss Cycling day licence may include U19",
  "Day-licence route requires Swiss Cycling membership; regular licence rules unverified.",
  "https://www.swiss-cycling.ch/de/infocenter/lizenzen/"
 ],
 [
  "LT",
  "unknown",
  "unconfirmed",
  "LDSF Junior competition licence",
  "The licence portal lists a team/club field but obligation is unverified.",
  "https://ldsf.lt/dokumentai/licencijos/"
 ],
 [
  "LU",
  "usually",
  "unconfirmed",
  "FSCL Junior competition licence",
  "Club route is usual; individual exceptions unconfirmed.",
  "https://www.fscl.lu/"
 ],
 [
  "HU",
  "usually",
  "unconfirmed",
  "MKSZ junior competition licence",
  "Domestic club submits application; foreign-team arrangements differ.",
  "https://bringasport.hu/informacio/licencigenyles/"
 ],
 [
  "MT",
  "conditional",
  "conditional",
  "MCF season registration + race category",
  "Federation form has club and individual rates; clarify youth conditions.",
  "https://mostacyclingclub.com/"
 ],
 [
  "MD",
  "unknown",
  "unconfirmed",
  "FCRM junior licence type to be confirmed",
  "Federation provides online licence information.",
  "https://fcrm.md/"
 ],
 [
  "MC",
  "unknown",
  "unconfirmed",
  "FMC licence for residents (FFC for some French residents)",
  "UC Monaco offers membership and licences; not necessarily the only route.",
  "https://www.ucmonaco.com/rejoignez-nous"
 ],
 [
  "DE",
  "usually",
  "unconfirmed",
  "German Cycling U19 competition licence",
  "Club / regional federation is the usual licence route.",
  "https://static.rad-net.de/html/verwaltung/formulare/faq-zu-lizenzen.pdf"
 ],
 [
  "NL",
  "conditional",
  "conditional",
  "KNWU junior competition licence",
  "Club or Direct membership may be possible; Junior race access depends on licence.",
  "https://www.knwu.nl/nieuws/licentieaanvragen-voor-2026-open"
 ],
 [
  "NO",
  "required",
  "club-route",
  "NCF active Junior annual licence",
  "Regular racing licence / insurance requires club membership.",
  "https://sykling.no/lisens/info-om-lisens/"
 ],
 [
  "PL",
  "usually",
  "unconfirmed",
  "PZKol/OZKol Junior licence",
  "Check club / regional application process.",
  "https://pzkol.pl/8%2Clicencje-kolarskie.html"
 ],
 [
  "PT",
  "conditional",
  "unconfirmed",
  "Portuguese Cycling Junior Sub19 competition licence",
  "Club and rider have separate registration paths; individual entry not established for all races.",
  "https://www.fpciclismo.pt/competicao"
 ],
 [
  "RO",
  "required",
  "club-route",
  "FRC-UCI annual U19 licence",
  "Junior requires club membership contract / statement.",
  "https://federatiadeciclism.ro/procedura-de-obtinere-a-licentei-frc-uci/"
 ],
 [
  "RU",
  "unknown",
  "unconfirmed",
  "FVSR athlete card / category licence",
  "Personal card portal exists; unaffiliated racing not confirmed.",
  "https://fvsr.ru/kartocka-sportsmena"
 ],
 [
  "SM",
  "unknown",
  "unconfirmed",
  "FSC Junior licence route unverified",
  "General sports law provides several membership routes, but no proven road U19 pathway.",
  "https://www.fsc.sm/it/federazione.php"
 ],
 [
  "MK",
  "conditional",
  "unconfirmed",
  "CFM Junior / Junior Women licence",
  "Hobby rider route is not equivalent to licensed Junior competition.",
  "https://cfm.org.mk/dokumenti"
 ],
 [
  "SK",
  "unknown",
  "unconfirmed",
  "SZC 2026 licence via Cyklopas",
  "Club and member registration exists; unaffiliated U19 route unconfirmed.",
  "https://www.cyklistikaszc.sk/sk/submenu/registracia-klubov-a-clenov-poplatky"
 ],
 [
  "SI",
  "required",
  "club-route",
  "KZS Junior / Junior Women annual competition licence",
  "Regular annual licence via club; one-day exceptions depend on event rules.",
  "https://kolesarska-zveza.si/licence/"
 ],
 [
  "RS",
  "usually",
  "unconfirmed",
  "BSS Junior / Junior Women licence",
  "2026 application instructions go through clubs.",
  "https://bss.rs/obavestenja-za-clanove-2/"
 ],
 [
  "TR",
  "conditional",
  "conditional",
  "Turkish Cycling junior racing licence / current visa",
  "Club and individual (ferdi) licences exist; road youth event rules decide eligibility.",
  "https://bisiklet.org.tr/yonetmelik-ve-talimatlar/"
 ],
 [
  "UA",
  "unknown",
  "unconfirmed",
  "UCF Junior licence application",
  "Portal has club/team fields; unaffiliated U19 route unconfirmed.",
  "https://ucf.com.ua/uk/license"
 ],
 [
  "VA",
  "unknown",
  "unconfirmed",
  "No publicly verified U19 road racing licence route",
  "Membership and events have limited special eligibility.",
  "https://www.dce.va/en/Culture/sports/ath-vat.html"
 ],
 [
  "GB",
  "optional",
  "possible",
  "British Cycling Full Race Licence, appropriate membership",
  "Club is not a universal licence purchase prerequisite; team event rules vary.",
  "https://membership.britishcycling.org.uk/faqs"
 ],
 [
  "CZ",
  "unknown",
  "unconfirmed",
  "ČSC Junior/UCI licence",
  "Club requirement for unaffiliated Juniors unconfirmed.",
  "https://www.czechcyclingfederation.com/procleny/licence-csc/"
 ],
 [
  "ME",
  "required",
  "club-route",
  "BSCG Junior annual licence",
  "Club or organisation submits the licence application.",
  "https://biciklistickisavezcg.me/"
 ],
 [
  "ES",
  "conditional",
  "conditional",
  "RFEC / regional federation Junior competition licence",
  "Individual licences may exist; specific Junior series can impose team rules.",
  "https://www.rfec.com/"
 ],
 [
  "SE",
  "required",
  "club-route",
  "Swedish Cycling Junior Men/Women J licence",
  "Ordinary competition licence is linked to a club that verifies the application.",
  "https://scf.se/licenser/"
 ],
 [
  "CH",
  "unknown",
  "unconfirmed",
  "Valid UCI Junior racing licence for Swiss Road Series",
  "Team registration rules are event-specific; universal club requirement unconfirmed.",
  "https://swissroadseries.ch/anmeldung-teilnahme/"
 ]
];

/** Conditions for visiting riders, from direct replies received from national
 * cycling federations in 2026. These are summaries of correspondence, not
 * public legal rules or guarantees that a particular event accepts solo riders.
 * Do not expose private Gmail message links on the public website.
 */
const federationEmailGuidance: Partial<Record<string, FederationEmailGuidance>> = {
  NO: {
    status: 'allowed-with-exceptions',
    details: "The Norwegian Cycling Federation says foreign riders can enter its races except national championships. It did not specify whether a foreign U19 rider may register without a club or team.",
    replyDate: '2026-10-28',
    calendarUrl: 'https://sykling.no/sykkelritt/terminliste/',
  },
  CZ: {
    status: 'conditional',
    details: "For races in 2027, the federation requires a valid UCI racing licence and authorisation from the rider's home federation for each race. Contact the event organiser for entry details; solo/team eligibility was not specified.",
    replyDate: '2026-10-20',
    calendarUrl: 'https://portal.czechcyclingfederation.com/RaceCalendar',
  },
  GR: {
    status: 'conditional',
    details: "The federation requires home-federation authorisation, a valid 2027 cycling licence, a medical certificate and insurance valid in Greece. Solo/team entry was not confirmed.",
    replyDate: '2026-10-19',
    calendarUrl: 'https://www.hellenic-cycling.gr/',
  },
  IE: {
    status: 'conditional',
    details: "Cycling Ireland says visiting riders need their racing licence, a permission letter and the eligibility form linked on its website. Check the event regulations for individual or team entries.",
    replyDate: '2026-10-19',
    calendarUrl: 'https://www.cyclingireland.ie/events/find-an-event/',
  },
  DK: {
    status: 'conditional',
    details: "Foreign riders are generally welcome with a valid racing licence from their national federation. Some events may require further documentation or permission from the home federation. Club/team entry depends on the race.",
    replyDate: '2026-10-19',
    calendarUrl: 'https://www.cyklingdanmark.dk/',
  },
  CY: {
    status: 'conditional',
    details: "Register directly with the event organiser. Present a medical certificate and passport/ID; show a UCI licence if you have one. Riders registered with a home federation need permission to race abroad. Solo/team rules were not specified.",
    replyDate: '2026-10-19',
    calendarUrl: 'https://www.cypruscycling.org/articles/competition-schedule',
  },
  CH: {
    status: 'conditional',
    details: "Swiss Cycling requires a racing licence from the rider's country of residence and an international competition permit. The reply did not establish a universal club or solo-entry rule for visiting juniors.",
    replyDate: '2026-10-16',
    calendarUrl: 'https://www.swiss-cycling.ch/de/veranstaltungen/kalender/',
  },
  GB: {
    status: 'conditional',
    details: "British Cycling requires a home-federation licence with a UCI ID and a letter of authorisation. Enter and pay the organiser directly; other road/circuit races may be possible depending on the rider's racing history and event category.",
    replyDate: '2026-10-16',
    calendarUrl: 'https://www.britishcycling.org.uk/juniorroadseries/',
  },
  LT: {
    status: 'unconfirmed',
    details: "The Lithuanian federation only confirmed that its 2027 calendar was not yet available. It did not state whether foreign riders can enter or which documents they need.",
    replyDate: '2026-10-16',
    calendarUrl: 'https://www.ldsf.lt/',
  },
  MT: {
    status: 'unconfirmed',
    details: "The Maltese federation provided a seasonal overview (usually late January to July, with Tour of Malta in April), but did not confirm foreign U19 rider eligibility, licences, or solo/team entry rules.",
    replyDate: '2026-11-03',
  },
};

export const COUNTRY_REQUIREMENTS: Record<string,CountryRequirement> = Object.fromEntries(data.map(([code,club,solo,licence,note,source])=>[code,{club,solo,licence,note,source,...(federationEmailGuidance[code] ? {federationEmail:federationEmailGuidance[code]} : {})}]));
