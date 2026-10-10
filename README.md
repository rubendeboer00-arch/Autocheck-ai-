# AutoCheck AI

AutoCheck AI vehicle checker with free RDW open data, GetCarAPI VIN history and optional AI web research.

## What this version adds
- Keeps the existing single search bar and dark report layout.
- Dutch license-plate lookups run through the backend, not directly from the browser.
- Enriches Dutch plate results with the free RDW vehicle dataset (`m9d7-ebf2`).
- Queries the free RDW dataset for observed inspection defects (`a34c-vvps`). Records may be empty; this is not a complete repair history.
- Reads the additional open-recall indicator dataset (`nu53-rdqg`) and shows the primary RDW vehicle recall indicator. A missing match is not proof that no recall exists.
- Shows links to the RDW sources and official recall check.
- Keeps the per-vehicle demo payment flow, GetCarAPI history, and paid AI web research/photos.

## Data-source limits
- RDW open data is free to access, but it does not include all vehicle-history information.
- Public inspection defect data is not a complete maintenance or repair log.
- No public result is not proof that a car is damage-free, theft-free, or recall-free.
- Public ad search, photos and AI web research are still only run in the paid-report flow. OpenAI API usage may incur costs; the RDW requests themselves do not require an API key.
- External images should only be displayed commercially where the source's terms and rights permit it.

## Flow
- One search bar for EU VIN or Dutch license plate.
- Free check shows vehicle basics and public RDW information for Dutch plates.
- Full report is €7.95 in the demo checkout.
- Demo unlock is stored per exact VIN/license plate in the browser. This is for testing only, not production payment security.

## Render environment variables
- `GETCARAPI_API_KEY`
- `OPENAI_API_KEY` (needed only for paid AI web research)
- `OPENAI_MODEL` (model name supported by your OpenAI project)

## Start
```bash
npm install
npm start
```

For real sales, use a payment provider and store paid report entitlements server-side.
