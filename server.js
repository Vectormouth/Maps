// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.PLACES_SERVER_KEY;

app.use(cors());             // en prod puedes poner allowlist
app.use(express.json());

app.get('/health', (_req,res)=>res.json({ok:true}));

// Test rápido desde navegador:
// https://TU-URL.onrender.com/test?lat=40.4168&lng=-3.7038&km=10&openNow=false
app.get('/test', async (req,res)=>{
  const lat = Number(req.query.lat) || 52.3676;
  const lng = Number(req.query.lng) || 4.9041;
  const km  = Number(req.query.km)  || 10;
  const openNow = String(req.query.openNow||'false')==='true';
  const lang = String(req.query.lang||'en');

  const body = {
    textQuery: "dental clinics",
    includedType: "dentist",
    strictTypeFiltering: true,
    openNow,
    languageCode: lang,
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius: km*1000 }
    }
  };

  const r = await fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.location,places.currentOpeningHours.openNow,places.googleMapsUri,places.rating"
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(()=>({}));
  res.json(data.places ?? []);
});

// Acepta el cuerpo simple del frontend {lat,lng,radiusKm,openNow,lang}
app.post('/api/dentists', async (req,res)=>{
  try{
    const { lat, lng, radiusKm=3, openNow=true, lang='en' } = req.body || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error:"INVALID_COORDS" });
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
          radius: Math.max(500, Math.min(100000, (radiusKm||3)*1000))
        }
      }
    };

    const r = await fetch("https://places.googleapis.com/v1/places:searchText",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location,places.currentOpeningHours.openNow,places.googleMapsUri,places.rating"
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const data = await r.json();
    res.json(data.places ?? []);
  }catch(e){
    console.error(e);
    res.status(500).json({ error:"INTERNAL_ERROR" });
  }
});

app.listen(PORT, ()=>console.log(`Backend running on ${PORT}`));
