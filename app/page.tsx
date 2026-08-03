"use client";

import { FormEvent, useState } from "react";

type Source = {
  title: string;
  domain: string;
  url: string;
  excerpt: string;
  type: string;
  position?: number;
};

type Theme = {
  label: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
};

type Analysis = {
  brand: string;
  context: string;
  verdict: string;
  verdictTone: "positive" | "mixed" | "negative" | "neutral";
  confidence: string;
  summary: string;
  positives: string;
  frictions: string;
  themes: Theme[];
  sources: Source[];
  queries: string[];
  sourceCount: number;
  mode: "demo" | "live";
  generatedAt: string;
};

const demoAnalysis: Analysis = {
  brand: "Vela Studio",
  context: "servizi creativi",
  verdict: "Misto, con segnali incoraggianti",
  verdictTone: "mixed",
  confidence: "media",
  summary:
    "Le fonti descrivono un’attività percepita come attenta e competente, soprattutto quando il rapporto è diretto. Le criticità ricorrenti riguardano invece i tempi di risposta e la chiarezza dei preventivi: il quadro è positivo, ma non ancora uniforme.",
  positives:
    "Le persone apprezzano la cura del lavoro, il tono disponibile e la capacità di seguire il progetto anche dopo la consegna.",
  frictions:
    "I segnali meno favorevoli parlano di attese, passaggi poco chiari e differenze tra l’esperienza promessa e quella ricevuta.",
  themes: [
    {
      label: "Cura e relazione",
      detail: "Il contatto umano è il tratto più riconoscibile nelle opinioni positive.",
      tone: "positive",
    },
    {
      label: "Tempi di risposta",
      detail: "Quando il flusso rallenta, la percezione del brand si indebolisce rapidamente.",
      tone: "negative",
    },
    {
      label: "Valore percepito",
      detail: "Il prezzo viene accettato quando il risultato e le fasi del lavoro sono espliciti.",
      tone: "neutral",
    },
  ],
  sources: [
    {
      title: "Discussione della community",
      domain: "forum.example",
      url: "https://example.com/vela-studio-community",
      excerpt: "Esempio demo: il tono delle risposte viene percepito come attento e concreto.",
      type: "Forum",
    },
    {
      title: "Recensione del servizio",
      domain: "reviews.example",
      url: "https://example.com/vela-studio-review",
      excerpt: "Esempio demo: il risultato finale è apprezzato, ma i tempi vengono descritti come variabili.",
      type: "Recensione",
    },
    {
      title: "Articolo di settore",
      domain: "magazine.example",
      url: "https://example.com/vela-studio-article",
      excerpt: "Esempio demo: il brand viene associato a un approccio curato e collaborativo.",
      type: "Editoriale",
    },
  ],
  queries: [
    '"Vela Studio" recensioni',
    '"Vela Studio" opinioni',
    '"Vela Studio" esperienza',
    '"Vela Studio" problemi assistenza',
  ],
  sourceCount: 12,
  mode: "demo",
  generatedAt: "Anteprima",
};

const languageOptions = [
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

const countryOptions = [
  { value: "it", label: "Italia" },
  { value: "us", label: "Stati Uniti" },
  { value: "gb", label: "Regno Unito" },
  { value: "fr", label: "Francia" },
];

export default function Home() {
  const [brand, setBrand] = useState("");
  const [context, setContext] = useState("");
  const [country, setCountry] = useState("it");
  const [language, setLanguage] = useState("it");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBrand = brand.trim();

    if (!trimmedBrand) {
      setError("Scrivi il nome del brand o dell’attività.");
      return;
    }

    setError("");
    setAnalysis(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: trimmedBrand,
          context: context.trim(),
          country,
          language,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "La ricerca non è andata a buon fine.");
      }

      setAnalysis(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "La ricerca non è andata a buon fine.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function loadDemo() {
    setBrand(demoAnalysis.brand);
    setContext(demoAnalysis.context);
    setCountry("it");
    setLanguage("it");
    setError("");
    setAnalysis(demoAnalysis);
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Senti home">
          <span className="wordmark-mark">S</span>
          <span>Senti</span>
        </a>
        <div className="topbar-note">
          <span className="signal-dot" aria-hidden="true" />
          Brand perception, on demand
        </div>
      </header>

      <div className="page-grid" id="top">
        <section className="intro-panel" aria-labelledby="page-title">
          <div className="eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            <span>WEB SIGNALS / 01</span>
          </div>
          <h1 id="page-title">
            Cosa si dice davvero di <em>un brand?</em>
          </h1>
          <p className="intro-copy">
            Una lettura rapida delle conversazioni pubbliche: recensioni,
            forum, articoli e opinioni che una persona incontrerebbe cercando
            online.
          </p>

          <div className="principles" aria-label="Principi della ricerca">
            <div className="principle">
              <span className="principle-mark">01</span>
              <span>
                <strong>Fonti vere</strong>
                <small>Link e contesto, non impressioni isolate.</small>
              </span>
            </div>
            <div className="principle">
              <span className="principle-mark">02</span>
              <span>
                <strong>Niente falso punteggio</strong>
                <small>Il sentiment resta una fotografia, non una pagella.</small>
              </span>
            </div>
          </div>

          <p className="intro-footnote">
            Pensato per ricerche occasionali. Una domanda, una fotografia del
            web.
          </p>
        </section>

        <section className="command-panel" aria-labelledby="command-title">
          <div className="panel-meta">
            <span className="panel-index">A / INPUT</span>
            <span className="panel-mode">ON DEMAND · 2 PAGINE</span>
          </div>
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Nuova lettura</p>
              <h2 id="command-title">Cerca un brand</h2>
            </div>
            <span className="panel-arrow" aria-hidden="true">
              ↗
            </span>
          </div>

          <form className="research-form" onSubmit={handleSubmit}>
            <label className="field field-wide">
              <span>Brand o attività</span>
              <input
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="es. Patagonia"
                autoComplete="organization"
              />
            </label>

            <label className="field field-wide">
              <span>Contesto <small>facoltativo</small></span>
              <input
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="es. abbigliamento outdoor"
              />
            </label>

            <div className="field-pair">
              <label className="field">
                <span>Paese</span>
                <select value={country} onChange={(event) => setCountry(event.target.value)}>
                  {countryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Lingua</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error ? (
              <div className="form-error" role="alert">
                <span className="error-mark" aria-hidden="true">
                  !
                </span>
                <span>{error}</span>
              </div>
            ) : null}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    Sto leggendo…
                  </>
                ) : (
                  <>
                    Analizza il web <span aria-hidden="true">↗</span>
                  </>
                )}
              </button>
              <button className="demo-button" type="button" onClick={loadDemo} disabled={isLoading}>
                Prova con un esempio
              </button>
            </div>
          </form>

          <div className="panel-note">
            <span className="note-icon" aria-hidden="true">i</span>
            <p>
              La ricerca genera query su recensioni, opinioni, esperienza e
              assistenza. Le fonti vengono deduplicate prima della sintesi.
            </p>
          </div>
        </section>
      </div>

      <section className="results-section" aria-labelledby="results-title">
        <div className="section-rule">
          <span>LETTURA DELLE FONTI</span>
          <span className="section-rule-line" aria-hidden="true" />
          <span>{analysis ? "RISULTATO" : "IN ATTESA"}</span>
        </div>

        {!analysis ? (
          <div className="empty-state">
            <span className="empty-orbit" aria-hidden="true">○</span>
            <div>
              <h2 id="results-title">Il web lascia tracce.</h2>
              <p>
                Inserisci un nome sopra per trasformarle in una lettura breve,
                con temi ricorrenti e fonti da aprire.
              </p>
            </div>
            <span className="empty-arrow" aria-hidden="true">↓</span>
          </div>
        ) : (
          <div className="report-layout">
            <article className="report-main">
              <div className="report-topline">
                <span>{analysis.mode === "demo" ? "ANTEPRIMA" : "LIVE RESEARCH"}</span>
                <span>{analysis.generatedAt}</span>
              </div>
              <div className="report-title-row">
                <div>
                  <p className="report-kicker">Percezione complessiva</p>
                  <h2 id="results-title">{analysis.brand}</h2>
                </div>
                <span className={`verdict verdict-${analysis.verdictTone}`}>
                  <span className="verdict-dot" aria-hidden="true" />
                  {analysis.verdict}
                </span>
              </div>

              <div className="summary-block">
                <p className="summary-label">In breve</p>
                <p className="summary-copy">{analysis.summary}</p>
                <p className="confidence-note">
                  Confidenza {analysis.confidence.toLowerCase()} · basata sulla
                  varietà e sulla coerenza delle fonti raccolte
                </p>
              </div>

              <div className="insight-grid">
                <article className="insight-card insight-positive">
                  <p className="insight-label">Segnali favorevoli</p>
                  <h3>Cosa apprezzano</h3>
                  <p>{analysis.positives}</p>
                </article>
                <article className="insight-card insight-negative">
                  <p className="insight-label">Punti di attrito</p>
                  <h3>Cosa ritorna</h3>
                  <p>{analysis.frictions}</p>
                </article>
              </div>
            </article>

            <aside className="report-side">
              <div className="stats-card">
                <div className="stat-item">
                  <span>Fonti</span>
                  <strong>{analysis.sourceCount}</strong>
                </div>
                <div className="stat-item">
                  <span>Query</span>
                  <strong>{analysis.queries.length}</strong>
                </div>
                <div className="stat-item">
                  <span>Lingua</span>
                  <strong>{language.toUpperCase()}</strong>
                </div>
              </div>

              <div className="themes-card">
                <div className="card-heading-row">
                  <p className="card-kicker">Pattern ricorrenti</p>
                  <span className="card-count">{analysis.themes.length}</span>
                </div>
                <div className="theme-list">
                  {analysis.themes.map((theme) => (
                    <div className="theme-item" key={theme.label}>
                      <span className={`theme-dot theme-${theme.tone}`} aria-hidden="true" />
                      <div>
                        <strong>{theme.label}</strong>
                        <p>{theme.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sources-card">
                <div className="card-heading-row">
                  <p className="card-kicker">Fonti da aprire</p>
                  <span className="card-count">{analysis.sources.length}</span>
                </div>
                <div className="source-list">
                  {analysis.sources.map((source) => (
                    <a className="source-item" href={source.url} target="_blank" rel="noreferrer" key={`${source.domain}-${source.title}`}>
                      <div className="source-meta">
                        <span>{source.type}</span>
                        <span>{source.domain}</span>
                      </div>
                      <strong>{source.title}</strong>
                      <p>{source.excerpt}</p>
                      <span className="source-arrow" aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>SENTI / WEB SIGNALS</span>
        <span>Una fotografia, non una sentenza.</span>
      </footer>
    </main>
  );
}
