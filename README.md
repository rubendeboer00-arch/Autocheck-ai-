# AutoCheck AI v17 — echte API-koppeling

Deze versie bevat:
- dezelfde ene VIN/kenteken zoekbalk;
- RDW kentekencheck;
- beveiligde backend voor GetCarAPI;
- VIN availability check vóór retrieve;
- historische records voor `vehicle`, `observations`, `events`, `ownerChanges`, `auctionSales`, `accidents`, `salvage` en `photos` wanneer de provider ze voor het VIN heeft;
- API-key uitsluitend via server environment variable.

## Lokaal testen

1. Installeer Node.js.
2. Open deze map in de terminal.
3. Run `npm install`.
4. Zet de API-key als environment variable:
   - Windows PowerShell: `$env:GETCARAPI_API_KEY="vdi_..."`
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Live

Gebruik een Node-hostingdienst (bijv. Render, Railway, Fly.io of eigen VPS).
Zet daar `GETCARAPI_API_KEY` in de environment variables.

## Belangrijk

GetCarAPI meldt dat de check geen credit kost en dat een volledige retrieve één credit kost bij een gevonden echt VIN; vijf test-VINs zijn gratis. De provider levert alleen historie die daadwerkelijk in zijn archief aanwezig is. Ontbrekende data mag dus niet als 'schadevrij' worden geïnterpreteerd.

RDW blijft voor Nederlandse kentekengegevens gebruikt worden. Voor volledige kilometerhistorie uit RDW is aanvullende/geautoriseerde toegang nodig; de openbare voertuigdataset bevat wel o.a. het tellerstandoordeel, maar niet de volledige reeks tellerstanden.
