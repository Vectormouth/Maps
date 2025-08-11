// backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.PLACES_SERVER_KEY;

if (!API_KEY) {
  console.error('Missing PLACES_SERVER_KEY in .env');
}

app.use(cors()); // for demo, allow all origins. For production, restrict to your domain.
app.use(express.json());

// Simple healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// POST /api/dentists
// Body example: { lat: 52.3676, lng: 4.9041, radiusKm: 3, openNow: true, lang: 'en' }
app.post('/api/dentists', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 3, openNow = true, lang = 'en' } = req.body || {};

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng are required numbers' });
    }

    const body = {
      textQuery: "dental clinics",
      includedType: "dentist",
      strictTypeFiltering: true,
      openNow: !!openNow,
      languageCode: lang,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.max(500, Math.min(100000, (radiusKm || 3) * 1000)) // 0.5km to 100km
        }
      }
    };

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location,places.currentOpeningHours.openNow,places.googleMapsUri,places.rating"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'GOOGLE_ERROR', message: text });
    }

    const data = await response.json();
    return res.json(data.places ?? []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
