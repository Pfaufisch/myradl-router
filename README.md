# MyRadl Router

Eine mobile Web-App, die verfügbare MyRadl-Rückgabestationen nahe einem Ziel findet und mit einem Kompasspfeil dorthin führt.

## Entwicklung

```bash
npm install
npm run dev
```

Für Standort und Gerätekompass ist in Produktion HTTPS erforderlich. `localhost` gilt für die lokale Entwicklung als sicherer Kontext.

## Prüfung

```bash
npm test
npm run build
```

Die App verwendet ausschließlich öffentliche, CORS-fähige Endpunkte von nextbike (GBFS) und Photon. Es gibt kein Backend und keine Verbindung zu einem nextbike- oder MVGO-Konto.
