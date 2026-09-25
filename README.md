# PIPE RADAR v2.4

PIPE RADAR publikuje ostatni zwalidowany snapshot ofert jako statyczny plik `data/jobs.json`. GitHub Actions uruchamia skan co sześć godzin, a Cloudflare Pages publikuje stronę. Statyczna strona zachowuje 13 rekordów v2.3.1 jako awaryjną bazę lokalną.

## Uruchomienie lokalne

```bash
npm install
npm run seed
npm run build
```

Kontrola jakości:

```bash
npm run check
npm run acceptance
```

Stabilny `NAV_FEED_TOKEN` trzeba uzyskać zgodnie z aktualnymi warunkami NAV; token eksperymentalny nie jest pobierany automatycznie. Jeśli token jest używany, przechowuj go wyłącznie jako sekret repozytorium GitHub.

Przycisk „Pobierz najnowszą bazę” pobiera ostatni zapisany snapshot, ale sam nie uruchamia skanu. Ręczny skan można uruchomić w GitHub Actions przez workflow `Scan job offers`. Szczegóły źródeł opisuje [polityka źródeł](docs/operations/source-policy.md).

Ustawienia Cloudflare Pages:

- komenda budowania: `npm run build`
- katalog wynikowy: `dist`
- Node.js: `22`
