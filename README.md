# AutoCheck AI — Stap 2 RDW

Deze versie bouwt verder op de werkende AutoCheck AI basis.

## Wat is toegevoegd
- De bestaande ene zoekbalk blijft ongewijzigd.
- Tab **🇳🇱 Kenteken** haalt live voertuiggegevens uit de openbare RDW-dataset.
- RDW-detailkaart met o.a.:
  - merk / handelsbenaming
  - voertuigsoort
  - eerste toelating
  - eerste toelating Nederland
  - APK-vervaldatum
  - kleuren
  - inrichting
  - cilinderinhoud en cilinders
  - massa
  - catalogusprijs / BPM indien geleverd
  - tellerstandoordeel
  - jaar laatste tellerstandregistratie
  - tenaamstelling
  - brandstof
  - vermogen indien aanwezig
- Duidelijke bronvermelding: RDW Open Data.
- Geen extra zoekbalk en geen wijziging van het bestaande design.

## Belangrijk
RDW Open Data is een technische/registratiebron. Het levert niet automatisch een volledige historische kilometerlijn, schadehistorie of volledige VIN-koppeling. Daarvoor blijven aanvullende bronnen nodig.

## Deploy
Vervang in GitHub alleen `index.html` door deze versie. Render zal daarna automatisch opnieuw deployen als Auto Deploy aanstaat.
