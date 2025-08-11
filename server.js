// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.PLACES_SERVER_KEY;

if (!API_KEY) {
  console.warn('⚠️ Missing PLACES_SERVER_KEY env var');
}

app.use(express.json());
app.use(cors()); // en prod: usa allowlist

// Salud
app.get('/health', (_req, res) => res.json({ ok: true }));

// Utilidad segura
function safeJson(t) { try { return JSON.parse(t); } catch { return {}; } }

// Llamada a Google Places (v1)
async function callPlaces(body) {
  console.log('>>> Sending to Google:', JSON.stringify(body));
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.location,places.currentOpeningHours.openNow,places.googleMapsUri,places.rating'
    },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  if (!r.ok) {
    console.error('<<< Google ERROR', r.status, text);
    return { status: r.status, errorText: text };
  }
  const data = safeJson(text);
  return { status: r.status, places: data.places ?? [] };
}

// GET /test?lat=40.4168&lng=-3.7038&km=10&openNow=false&lang=en
app.get('/test', async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 52.3676;
    const lng = Number(req.query.lng) || 4.9041;
    const km  = Number(req.query.km)  || 10;
    const openNow = String(req.query.openNow || 'false') === 'true';
    const lang = String(req.query.lang || 'en');

    const body = {
      textQuery: 'dental clinics',
      includedType: 'dentist',
      strictTypeFiltering: true,
      openNow,
      languageCode: lang,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: km * 1000
        }
      }
    };

    const out = await callPlaces(body);
    if (out.errorText) return res.status(out.status).send(out.errorText);
    res.json(out.places);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// POST /api/dentists { lat,lng,radiusKm,openNow,lang }
app.post('/api/dentists', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 3, openNow = true, lang = 'en' } = req.body || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'INVALID_COORDS' });
    }

    const body = {
      textQuery: 'dental clinics',
      includedType: 'dentist',
      strictTypeFiltering: true,
      openNow: !!openNow,
      languageCode: lang,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.max(500, Math.min(100000, (radiusKm || 3) * 1000))
        }
      }
    };

    const out = await callPlaces(body);
    if (out.errorText) return res.status(out.status).send(out.errorText);
    res.json(out.places);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on ${PORT}`);
});
