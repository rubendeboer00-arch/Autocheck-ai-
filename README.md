# AutoCheck AI – definitieve GitHub-set

Deze set bevat de volledige huidige demo voor AutoCheck AI:

- `index.html` – frontend, één zoekbalk met EU VIN / NL Kenteken, gratis preview, demo-betaalmuur en betaald AI-webonderzoek.
- `server.js` – Express backend met RDW, GetCarAPI en OpenAI Responses API + web search.
- `package.json` – Node/Express/CORS/OpenAI dependencies.
- `.env.example` – environment variables.

## GitHub vervangen

Vervang in je repository deze 5 bestanden:

1. `index.html`
2. `server.js`
3. `package.json`
4. `.env.example`
5. `README.md`

Laat in GitHub geen echte API-sleutels staan.

## Render environment variables

Gebruik op Render:

- `GETCARAPI_API_KEY` = je bestaande GetCarAPI sleutel
- `OPENAI_API_KEY` = je OpenAI API-sleutel
- `OPENAI_MODEL` = `gpt-6-luna` (of een ander model dat in jouw API-project beschikbaar is)

## Render commands

Build command:

`npm install`

Start command:

`npm start`

## AI-webonderzoek

Het AI-webonderzoek wordt pas na de demo-betaalstap gestart in de huidige testversie. Voor echte betalingen moet de betaalstatus later server-side worden gecontroleerd (bijvoorbeeld via WooCommerce/Mollie/Stripe webhook) voordat `/api/web-intel` toegang geeft.

De AI zoekt voor Nederlandse kentekens onder andere op kentekenvarianten, schade, onderhoud, kilometerstanden, APK, advertenties, veilingen, foto's, import, recalls en Nederlandse kenteken-/historiewebsites. Voor VIN's zoekt hij daarnaast internationaal en in meerdere Europese talen.

De AI moet brongebonden blijven: geen gevonden schade of onderhoud mag als feit worden verzonnen. Persoonsgegevens van eigenaren worden niet gezocht of weergegeven.
