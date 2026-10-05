const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GETCARAPI_API_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function validVin(vin) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(String(vin || "").toUpperCase());
}

function cleanVin(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/*
 * AutoCheck AI
 * VIN lookup via GetCarAPI
 *
 * De API-sleutel blijft uitsluitend op de server.
 * De frontend krijgt nooit de API-key te zien.
 */

app.get("/api/vin/:vin", async (req, res) => {
  const vin = cleanVin(req.params.vin);

  if (!validVin(vin)) {
    return res.status(400).json({
      success: false,
      error: "INVALID_VIN"
    });
  }

  if (!API_KEY) {
    return res.status(503).json({
      success: false,
      error: "GETCARAPI_API_KEY ontbreekt"
    });
  }

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json"
  };

  try {
    /*
     * Stap 1:
     * Gratis controle of de VIN bestaat.
     */
    const check = await fetch(
      `https://getcarapi.com/api/v1/vin/check/${encodeURIComponent(vin)}`,
      {
        headers
      }
    );

    if (check.status === 404) {
      return res.status(404).json({
        success: false,
        error: "VIN_NOT_FOUND"
      });
    }

    if (!check.ok) {
      const errorText = await check.text();

      return res.status(check.status).json({
        success: false,
        error: "VIN_CHECK_FAILED",
        details: errorText
      });
    }

    const checkData = await check.json();

    if (checkData?.data?.exists !== true) {
      return res.status(404).json({
        success: false,
        error: "VIN_NOT_FOUND"
      });
    }

    /*
     * Stap 2:
     * Volledig VIN-archief ophalen.
     */
    const full = await fetch(
      `https://getcarapi.com/api/v1/vin/${encodeURIComponent(vin)}`,
      {
        headers
      }
    );

    const body = await full.json();

    if (!full.ok) {
      return res.status(full.status).json(body);
    }

    /*
     * We geven de originele GetCarAPI-data volledig door.
     * Daarnaast maken we een overzicht dat AutoCheck AI
     * later rechtstreeks kan gebruiken voor het rapport.
     */

    const data = body?.data || {};
    const vehicle = data?.vehicle || {};

    const report = {
      vin: data.vin || vin,

      vehicle: {
        make: vehicle.make || null,
        model: vehicle.model || null,
        year: vehicle.year || null,
        trim: vehicle.trim || null,
        fuel: vehicle.fuel || null,
        transmission: vehicle.transmission || null,
        mileage: vehicle.mileage || null,
        engine: vehicle.engine || null,
        engineDisplacement: vehicle.engineDisplacement || null,
        cylinders: vehicle.cylinders || null,
        power: vehicle.power || null,
        torque: vehicle.torque || null,
        drivetrain: vehicle.drivetrain || null,
        body: vehicle.body || null
      },

      history: {
        listings: Array.isArray(data.listings)
          ? data.listings
          : [],

        observations: Array.isArray(data.observations)
          ? data.observations
          : [],

        events: Array.isArray(data.events)
          ? data.events
          : [],

        ownerChanges: Array.isArray(data.ownerChanges)
          ? data.ownerChanges
          : [],

        auctionSales: Array.isArray(data.auctionSales)
          ? data.auctionSales
          : [],

        accidents: Array.isArray(data.accidents)
          ? data.accidents
          : [],

        salvage: data.salvage || null,

        photos: Array.isArray(data.photos)
          ? data.photos
          : []
      },

      statistics: {
        listingCount: Array.isArray(data.listings)
          ? data.listings.length
          : 0,

        observationCount: Array.isArray(data.observations)
          ? data.observations.length
          : 0,

        eventCount: Array.isArray(data.events)
          ? data.events.length
          : 0,

        ownerChangeCount: Array.isArray(data.ownerChanges)
          ? data.ownerChanges.length
          : 0,

        auctionCount: Array.isArray(data.auctionSales)
          ? data.auctionSales.length
          : 0,

        accidentCount: Array.isArray(data.accidents)
          ? data.accidents.length
          : 0,

        photoCount: Array.isArray(data.photos)
          ? data.photos.length
          : 0,

        salvageFound: Boolean(data.salvage)
      },

      source: {
        provider: "GetCarAPI",
        vehicleData: true,
        vehicleHistory: true
      }
    };

    /*
     * Belangrijk:
     * We sturen zowel de originele API-data als ons
     * AutoCheck AI rapportformaat terug.
     *
     * Hierdoor kunnen we later makkelijk nieuwe onderdelen
     * toevoegen zonder de GetCarAPI-data kwijt te raken.
     */

    return res.json({
      success: true,

      data: data,

      report: report,

      meta: body?.meta || {
        creditCharged: null
      }
    });

  } catch (err) {
    console.error("GetCarAPI error:", err);

    return res.status(502).json({
      success: false,
      error: "HISTORY_PROVIDER_UNAVAILABLE",
      message: err.message
    });
  }
});


/*
 * Gezondheidscontrole voor Render
 */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    getcarapiConfigured: Boolean(API_KEY)
  });
});


/*
 * Frontend fallback
 */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`AutoCheck AI backend draait op poort ${PORT}`);
});
