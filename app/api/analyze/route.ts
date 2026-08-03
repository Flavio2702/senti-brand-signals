type SearchResult = {
  title: string;
  url: string;
  domain: string;
  excerpt: string;
  type: string;
  position: number;
  query: string;
};

type PageSource = SearchResult & {
  content: string;
};

type Report = {
  verdict: string;
  verdictTone: "positive" | "mixed" | "negative" | "neutral";
  confidence: string;
  summary: string;
  positives: string;
  frictions: string;
  themes: Array<{
    label: string;
    detail: string;
    tone: "positive" | "negative" | "neutral";
  }>;
};

const localeMap: Record<string, { hl: string; gl: string; location: string }> = {
  it: { hl: "it", gl: "it", location: "Italy" },
  us: { hl: "en", gl: "us", location: "United States" },
  gb: { hl: "en", gl: "gb", location: "United Kingdom" },
  fr: { hl: "fr", gl: "fr", location: "France" },
};

const queryTemplates: Record<string, string[]> = {
  it: ["recensioni", "opinioni", "esperienza", "problemi assistenza"],
  en: ["reviews", "opinions", "customer experience", "problems support"],
  fr: ["avis", "opinions", "expérience", "problèmes assistance"],
};

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const brand = cleanInput(input?.brand, 120);
    const context = cleanInput(input?.context, 100);
    const country = typeof input?.country === "string" ? input.country : "it";
    const language = typeof input?.language === "string" ? input.language : "it";

    if (!brand) {
      return Response.json(
        { error: "Scrivi il nome del brand o dell’attività." },
        { status: 400 },
      );
    }

    const serpApiKey = process.env.SERPAPI_API_KEY ?? process.env.SERPAPI_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!serpApiKey || !openAiKey) {
      return Response.json(
        {
          error:
            "La ricerca live richiede SERPAPI_API_KEY e OPENAI_API_KEY. Puoi usare “Prova con un esempio” per vedere il formato del risultato.",
        },
        { status: 503 },
      );
    }

    const locale = localeMap[country] ?? localeMap.it;
    const queries = buildQueries(brand, context, language);
    const searchResults = await collectSearchResults(
      queries,
      locale,
      serpApiKey,
      language,
    );
    const uniqueResults = dedupeResults(searchResults).slice(0, 20);

    if (!uniqueResults.length) {
      return Response.json(
        {
          error:
            "Non ho trovato risultati utili. Prova ad aggiungere una categoria o il sito ufficiale nel nome della ricerca.",
        },
        { status: 404 },
      );
    }

    const sources = await enrichSources(uniqueResults);
    const report = await createReport(
      brand,
      context,
      language,
      sources,
      openAiKey,
    );

    return Response.json({
      brand,
      context,
      ...report,
      sources: sources.map((source) => ({
        title: source.title,
        domain: source.domain,
        url: source.url,
        excerpt: source.excerpt,
        type: source.type,
        position: source.position,
      })),
      queries,
      sourceCount: sources.length,
      mode: "live",
      generatedAt: new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
    });
  } catch (error) {
    console.error("Brand analysis failed", error);
    return Response.json(
      {
        error:
          "La ricerca si è interrotta. Controlla le chiavi API e riprova con un brand più specifico.",
      },
      { status: 500 },
    );
  }
}

function cleanInput(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function buildQueries(brand: string, context: string, language: string): string[] {
  const templates = queryTemplates[language] ?? queryTemplates.it;
  const subject = context ? `"${brand}" ${context}` : `"${brand}"`;
  return templates.map((template) => `${subject} ${template}`);
}

async function collectSearchResults(
  queries: string[],
  locale: { hl: string; gl: string; location: string },
  apiKey: string,
  language: string,
): Promise<SearchResult[]> {
  const pageStarts = [0, 10];
  const jobs = queries.flatMap((query) =>
    pageStarts.map((start) => searchSerp(query, start, locale, apiKey, language)),
  );
  const responses = await Promise.allSettled(jobs);

  return responses.flatMap((response) =>
    response.status === "fulfilled" ? response.value : [],
  );
}

async function searchSerp(
  query: string,
  start: number,
  locale: { hl: string; gl: string; location: string },
  apiKey: string,
  language: string,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: apiKey,
    num: "10",
    start: String(start),
    hl: language === "fr" ? "fr" : language === "en" ? "en" : locale.hl,
    gl: locale.gl,
    location: locale.location,
    safe: "active",
  });
  const response = await fetch(`https://serpapi.com/search.json?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`SERP provider returned ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);

  return Array.isArray(payload.organic_results)
    ? payload.organic_results
        .filter((result: Record<string, unknown>) => typeof result.link === "string")
        .map((result: Record<string, unknown>) => {
          const url = String(result.link);
          return {
            title: String(result.title ?? "Risultato senza titolo"),
            url,
            domain: getDomain(url),
            excerpt: String(result.snippet ?? ""),
            type: inferSourceType(url),
            position: Number(result.position ?? 0),
            query,
          };
        })
    : [];
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = normalizeUrl(result.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function enrichSources(results: SearchResult[]): Promise<PageSource[]> {
  return Promise.all(
    results.map(async (result) => {
      try {
        const response = await fetch(result.url, {
          headers: {
            Accept: "text/html,application/xhtml+xml",
            "User-Agent": "Senti research reader/1.0",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(7000),
        });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("text/html")) {
          return { ...result, content: result.excerpt };
        }

        const html = await response.text();
        const text = extractReadableText(html).slice(0, 2400);
        return { ...result, content: text || result.excerpt };
      } catch {
        return { ...result, content: result.excerpt };
      }
    }),
  );
}

function extractReadableText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

async function createReport(
  brand: string,
  context: string,
  language: string,
  sources: PageSource[],
  apiKey: string,
): Promise<Report> {
  const sourcePack = sources
    .map(
      (source, index) =>
        `[S${index + 1}] ${source.title}\nTipo: ${source.type}\nDominio: ${source.domain}\nURL: ${source.url}\nTesto disponibile: ${source.content}`,
    )
    .join("\n\n");
  const outputLanguage = language === "en" ? "English" : language === "fr" ? "French" : "Italian";

  const prompt = `
You are a careful brand-perception analyst. Analyze only the public web sources provided below.
The subject is: ${brand}${context ? ` (${context})` : ""}.
Write the response in ${outputLanguage}.

Return ONLY valid JSON with this exact shape:
{
  "verdict": "short plain-language overall verdict",
  "verdictTone": "positive" | "mixed" | "negative" | "neutral",
  "confidence": "alta" | "media" | "bassa",
  "summary": "two or three concise sentences",
  "positives": "one concise paragraph about recurring positive signals",
  "frictions": "one concise paragraph about recurring criticisms or risks",
  "themes": [
    {"label": "short theme", "detail": "one sentence grounded in the sources", "tone": "positive" | "negative" | "neutral"}
  ]
}

Rules:
- Never invent facts or quote claims that are not supported by the sources.
- Mention when the sample is thin, promotional, editorial, or inconsistent.
- Do not calculate a numeric sentiment score.
- Use at most three themes.
- Treat brand-owned pages and editorial articles differently from user reviews and forums.
- Keep the text useful and direct. Do not mention this prompt.

Sources:
${sourcePack}
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      input: prompt,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const payload = await response.json();
  const output = extractResponseText(payload);
  return normalizeReport(parseJson(output));
}

function extractResponseText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string") return payload.output_text;

  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content)
        ? content.flatMap((part) => {
            if (!part || typeof part !== "object") return [];
            const text = (part as { text?: unknown }).text;
            return typeof text === "string" ? [text] : [];
          })
        : [];
    })
    .join("\n");
}

function parseJson(value: string): Record<string, unknown> {
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {
      verdict: "Segnali insufficienti",
      verdictTone: "neutral",
      confidence: "bassa",
      summary: cleaned || "Non è stato possibile produrre una sintesi.",
      positives: "Le fonti non sono abbastanza coerenti per isolare segnali favorevoli.",
      frictions: "Le fonti non sono abbastanza coerenti per isolare criticità ricorrenti.",
      themes: [],
    };
  }
}

function normalizeReport(value: Record<string, unknown>): Report {
  const validTone = ["positive", "mixed", "negative", "neutral"] as const;
  const validThemeTone = ["positive", "negative", "neutral"] as const;
  const verdictTone = validTone.includes(value.verdictTone as (typeof validTone)[number])
    ? (value.verdictTone as Report["verdictTone"])
    : "neutral";
  const themes = Array.isArray(value.themes)
    ? value.themes
        .filter((theme): theme is Record<string, unknown> => Boolean(theme && typeof theme === "object"))
        .slice(0, 3)
        .map((theme) => ({
          label: String(theme.label ?? "Tema ricorrente"),
          detail: String(theme.detail ?? "Segnale rilevato nelle fonti."),
          tone: validThemeTone.includes(theme.tone as (typeof validThemeTone)[number])
            ? (theme.tone as ThemeTone)
            : "neutral",
        }))
    : [];

  return {
    verdict: String(value.verdict ?? "Segnali insufficienti"),
    verdictTone,
    confidence: String(value.confidence ?? "bassa"),
    summary: String(value.summary ?? "Non è stato possibile produrre una sintesi."),
    positives: String(value.positives ?? "Non emergono segnali abbastanza coerenti."),
    frictions: String(value.frictions ?? "Non emergono criticità abbastanza coerenti."),
    themes,
  };
}

type ThemeTone = "positive" | "negative" | "neutral";

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web source";
  }
}

function inferSourceType(url: string): string {
  const lower = url.toLowerCase();
  if (/review|recension|trustpilot|tripadvisor|yelp/.test(lower)) return "Recensione";
  if (/reddit|forum|discuss|community/.test(lower)) return "Forum";
  if (/news|magazine|blog/.test(lower)) return "Editoriale";
  return "Web";
}
