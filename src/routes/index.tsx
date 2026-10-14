import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOJE IME® — Prostor za ideje in projekte" },
      {
        name: "description",
        content:
          "Osebna spletna stran: prostor za moje ideje, projekte in stvari, ki jih ustvarjam. Projekti, o meni in kontakt.",
      },
      { property: "og:title", content: "MOJE IME® — Prostor za ideje in projekte" },
      {
        property: "og:description",
        content:
          "Osebna spletna stran: prostor za moje ideje, projekte in stvari, ki jih ustvarjam.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

/* ------------------------------------------------------------------ */
/*  VSEBINA — tukaj enostavno spreminjaj besedila, projekte in kontakt */
/* ------------------------------------------------------------------ */

const SITE = {
  brand: "MOJE IME®",
  headline: "Prostor za moje ideje, projekte in stvari, ki jih ustvarjam.",
  intro:
    "To je moj osebni kotiček na spletu — zbirka projektov, misli in stvari, ki jih ustvarjam. Preprosto, brez hrupa, s poudarkom na vsebini.",
  nav: [
    { label: "Projekti", href: "#projekti" },
    { label: "O meni", href: "#o-meni" },
    { label: "Kontakt", href: "#kontakt" },
  ],
};

const PROJECTS = [
  {
    index: "01",
    name: "KlientFlow",
    description:
      "Orodje za prodajna sporočila, ki pomaga ekipam hitreje pisati jasne, osebne in učinkovite odzive strankam.",
  },
  {
    index: "02",
    name: "Projekt št. 2",
    description:
      "Kratek opis projekta — kaj je, za koga je namenjen in zakaj je nastal. Besedilo enostavno zamenjaj v kodi.",
  },
  {
    index: "03",
    name: "Projekt št. 3",
    description:
      "Kratek opis projekta — kaj je, za koga je namenjen in zakaj je nastal. Besedilo enostavno zamenjaj v kodi.",
  },
];

const ABOUT = {
  title: "O meni",
  paragraphs: [
    "Sem ustvarjalec, ki rad gradi preproste, uporabne stvari. Zanimajo me orodja, ki ljudem prihranijo čas, in dizajn, ki ne kriči, ampak deluje.",
    "Ta stran je moj delovni prostor — mesto, kjer zbiram projekte, ideje in stvari, ki jih ustvarjam.",
  ],
};

const CONTACT = {
  title: "Kontakt",
  // NADOMESTNO BESEDILO — zamenjaj s pravim e-poštnim naslovom
  email: "pozdrav@example.com",
  note: "Nadomestni e-poštni naslov — zamenjaj s svojim.",
};

/* ------------------------------------------------------------------ */

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Glava */}
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <a
          href="#"
          className="font-serif text-sm font-semibold tracking-wide transition-colors hover:text-lime-foreground"
        >
          {SITE.brand}
        </a>
        <nav aria-label="Glavna navigacija">
          <ul className="flex items-center gap-6 text-sm">
            {SITE.nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline hover:decoration-lime hover:decoration-2"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6">
        {/* Uvod */}
        <section className="border-b border-border py-20 sm:py-28">
          <h1 className="max-w-2xl font-serif text-4xl leading-tight font-medium tracking-tight sm:text-5xl md:text-6xl">
            {SITE.headline}
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {SITE.intro}
          </p>
        </section>

        {/* Projekti */}
        <section id="projekti" className="border-b border-border py-16 sm:py-20">
          <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Projekti
          </h2>
          <ul className="mt-8 divide-y divide-border">
            {PROJECTS.map((project) => (
              <li key={project.index} className="group py-8 first:pt-0">
                <div className="flex items-baseline gap-4 sm:gap-6">
                  <span className="shrink-0 font-serif text-sm text-muted-foreground transition-colors group-hover:text-lime-foreground">
                    {project.index}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-serif text-2xl font-medium tracking-tight transition-colors group-hover:text-lime-foreground sm:text-3xl">
                      {project.name}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {project.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* O meni */}
        <section id="o-meni" className="border-b border-border py-16 sm:py-20">
          <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {ABOUT.title}
          </h2>
          <div className="mt-8 max-w-xl space-y-5">
            {ABOUT.paragraphs.map((paragraph, i) => (
              <p key={i} className="text-base leading-relaxed sm:text-lg">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      </main>

      {/* Noga / Kontakt */}
      <footer id="kontakt" className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {CONTACT.title}
        </h2>
        <a
          href={`mailto:${CONTACT.email}`}
          className="mt-6 inline-block font-serif text-2xl font-medium tracking-tight underline decoration-lime decoration-2 underline-offset-8 transition-colors hover:text-lime-foreground sm:text-4xl"
        >
          {CONTACT.email}
        </a>
        <p className="mt-4 text-xs text-muted-foreground italic">{CONTACT.note}</p>
        <div className="mt-16 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <span>{SITE.brand}</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
