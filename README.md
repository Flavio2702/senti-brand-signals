# Senti

Mini-tool personale per leggere la percezione pubblica di un brand attraverso
recensioni, forum, articoli e altre fonti web.

## Avvio

1. Copia `.env.example` in `.env.local`.
2. Inserisci una chiave [SerpApi](https://serpapi.com/) e una chiave OpenAI.
3. Avvia il progetto con `npm run dev`.

Senza chiavi API puoi usare il pulsante **Prova con un esempio** per vedere il
formato del report. La modalità live usa SerpApi per le SERP localizzate, apre
solo le pagine pubbliche accessibili e invia alla sintesi AI esclusivamente il
testo raccolto da quelle fonti.

La v1 non salva ricerche, non ha dashboard e non calcola un punteggio numerico:
restituisce un giudizio qualitativo, temi ricorrenti e link alle fonti.
