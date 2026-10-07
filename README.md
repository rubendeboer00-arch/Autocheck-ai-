# AutoCheck AI

AutoCheck AI vehicle history checker with RDW, GetCarAPI and paid AI web research.

## Flow
- One search bar for EU VIN or Dutch license plate.
- Free check shows the available vehicle/RDW basisdata.
- Full report is €7.95 in the demo checkout.
- A payment unlock is stored per exact VIN/license plate, not globally. Paying for one vehicle does not unlock another vehicle.
- The paid report contains historical data, advertisements, mileage, damage/salvage when available, recalls, AI analysis, risk score and photos.
- Photos returned by GetCarAPI are shown in the paid report.
- The AI web-research layer also extracts publicly exposed page images (for example og:image) from vehicle-specific source pages and displays them with a source link when available.
- Missing data is not invented.

## Render environment variables
- `GETCARAPI_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-6-luna`)

## Important
The demo checkout is not a real payment processor. For production, replace it with a server-side payment/order system (for example Mollie or Stripe) and store paid report entitlements server-side. Public web images must be used only where the source/license/terms allow commercial display.
