# Runbook wdrożenia Netlify

## Podgląd

1. Uruchom `npx netlify status` i potwierdź zalogowane konto oraz połączenie z istniejącą witryną `pipe-radar`. Nie twórz zastępczej witryny.
2. Opcjonalnie ustaw `NAV_FEED_TOKEN`, aby włączyć oficjalny feed NAV. Automatyczny harmonogram nie wymaga `SCAN_TRIGGER_TOKEN`; token zabezpiecza wyłącznie ręczne wywołanie endpointu tła. Nie zapisuj wartości w repozytorium ani logach.
3. Uruchom `npm ci`, `npm run check` i `npm run acceptance`.
4. Wykonaj `npx netlify deploy`.
5. Skopiuj dokładny URL zwróconego podglądu:

   ```bash
   export PIPE_RADAR_PREVIEW_URL='https://adres-podgladu.netlify.app'
   node scripts/verify-deploy.mjs "$PIPE_RADAR_PREVIEW_URL"
   ```

6. Uruchom `scan-schedule` przyciskiem **Run now** w panelu funkcji Netlify. Sprawdź `/api/jobs`, status ogólny i liczbę zdrowych źródeł. Chroniony endpoint tła służy tylko do ręcznych operacji administracyjnych, jeśli skonfigurowano `SCAN_TRIGGER_TOKEN`.
7. Promuj dopiero po poprawnym podglądzie, zachowaniu poprzedniego snapshotu przy awarii oraz ręcznym sprawdzeniu widoku mobilnego i desktopowego.

## Produkcja

Uruchom `npx netlify deploy --prod`, a następnie:

```bash
node scripts/verify-deploy.mjs https://pipe-radar.netlify.app/
```

Harmonogram `0 */6 * * *` działa tylko na opublikowanej produkcji.

## Wycofanie

W panelu Netlify ponownie opublikuj poprzedni znany dobry deploy. Dane nie wymagają natychmiastowego cofnięcia: Blob `snapshots/previous` pozostaje dostępny, a `snapshots/latest` wolno zmienić tylko po zbadaniu błędu. Po rollbacku ponownie uruchom weryfikator produkcji.
