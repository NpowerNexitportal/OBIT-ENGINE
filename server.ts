import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import Parser from "rss-parser";
import { MongoClient } from "mongodb";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(cors());
app.use(express.json());

const parser = new Parser();

// Database Clients
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "obituary_api";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

let mongoClient: MongoClient | null = null;
let supabase: any = null;

if (MONGODB_URI) {
  mongoClient = new MongoClient(MONGODB_URI);
  mongoClient.connect().then(() => console.log("Connected to MongoDB")).catch(err => console.error("MongoDB connection error:", err));
}

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log("Supabase client initialized");
}

// Types
interface TrendResult {
  id: string;
  topic: string;
  country: string;
  timeFrame: string;
  trendScore: string;
  source: string;
  publishedTime: string;
  url: string;
}

// Generate country list
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  { code: 'KE', name: 'Kenya' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];

const KEYWORDS = [
  'obituary', 'died', 'death', 'dead', 'funeral', 'memorial', 'RIP',
  'accident', 'crash', 'passed away', 'tragic death', 'celebrity death',
  'actor died', 'killed in accident', 'fatal accident', 'plane crash',
  'car crash', 'breaking death news'
];

async function fetchGoogleNews(country: string, timeframe: string): Promise<TrendResult[]> {
  try {
    const localeMap: Record<string, string> = {
      'US': 'en-US', 'CA': 'en-CA', 'GB': 'en-GB', 'NG': 'en-NG', 'ZA': 'en-ZA',
      'AU': 'en-AU', 'IN': 'en-IN', 'KE': 'en-KE', 'DE': 'de-DE', 'FR': 'fr-FR'
    };
    
    const locale = localeMap[country] || 'en-US';
    const hl = locale;
    const gl = country;
    const ceid = `${country}:${locale.split('-')[0]}`;
    
    const when = timeframe === '1h' ? '1h' : timeframe === '2h' ? '2h' : timeframe === '4h' ? '4h' : '24h';
    
    const q = encodeURIComponent(`(obituary OR "passed away" OR accident OR "fatal crash" OR "found dead") when:${when}`);
    const url = `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    
    const feed = await parser.parseURL(url);
    
    const results: TrendResult[] = [];
    
    for (const item of feed.items) {
      const pubTime = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
      const ageHours = (Date.now() - pubTime) / (1000 * 60 * 60);
      
      let score = 10;
      const titleLower = (item.title || "").toLowerCase();
      
      if (ageHours < 0.5) score += 50;
      else if (ageHours < 1) score += 30;
      else if (ageHours < 2) score += 15;
      
      KEYWORDS.forEach(kw => {
        if (titleLower.includes(kw.toLowerCase())) {
          score += 10;
        }
      });
      
      let category = "Stable";
      if (score >= 60) category = "Breakout";
      else if (score >= 40) category = "Hot";
      else if (score >= 20) category = "Rising";
      
      results.push({
        id: `news-${country}-${item.guid || Math.random()}`,
        topic: item.title || 'Unknown Topic',
        country: country,
        timeFrame: `Last ${timeframe === '24h' ? '24 Hours' : timeframe === '1h' ? '1 Hour' : timeframe}`,
        trendScore: category,
        source: 'Google News Breaking',
        publishedTime: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        url: item.link || ''
      });
    }
    
    results.sort((a, b) => new Date(b.publishedTime).getTime() - new Date(a.publishedTime).getTime());
    
    return results;
  } catch (error) {
    console.error('Error fetching Google News:', error);
    return [];
  }
}

async function saveToDatabases(results: TrendResult[]) {
  if (mongoClient) {
    try {
      const db = mongoClient.db(MONGODB_DB);
      const collection = db.collection("trending_keywords");
      
      // Upsert by ID to avoid duplicates
      for (const res of results) {
        await collection.updateOne(
          { id: res.id },
          { $set: { ...res, updated_at: new Date() } },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error("Error saving to MongoDB:", err);
    }
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from('trending_keywords')
        .upsert(results.map(r => ({ ...r, updated_at: new Date() })), { onConflict: 'id' });
      
      if (error) throw error;
    } catch (err) {
      console.error("Error saving to Supabase:", err);
    }
  }
}

app.get("/api/countries", (req, res) => {
  res.json(COUNTRIES);
});

app.get("/api/keywords", (req, res) => {
  res.json(KEYWORDS);
});

app.get("/api/trends", async (req, res) => {
  try {
    const { country = 'US', timeframe = '1h' } = req.query as { country: string, timeframe: string };
    
    const newsResults = await fetchGoogleNews(country, timeframe);
    
    // Save to databases in background
    saveToDatabases(newsResults).catch(console.error);
    
    res.json(newsResults);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
