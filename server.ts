import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import Parser from "rss-parser";
// import googleTrends from "google-trends-api"; // wait, usually requires default import or require

const app = express();
const PORT = 3000;
app.use(cors());

const parser = new Parser();

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
    // Determine hl and ceid based on country
    // Simple mapping
    const localeMap: Record<string, string> = {
      'US': 'en-US', 'CA': 'en-CA', 'GB': 'en-GB', 'NG': 'en-NG', 'ZA': 'en-ZA',
      'AU': 'en-AU', 'IN': 'en-IN', 'KE': 'en-KE', 'DE': 'de-DE', 'FR': 'fr-FR'
    };
    
    const locale = localeMap[country] || 'en-US';
    const hl = locale;
    const gl = country;
    const ceid = `${country}:${locale.split('-')[0]}`;
    
    // Timeframe logic. RSS query allows `when:1h`, `when:24h`
    const when = timeframe === '1h' ? '1h' : timeframe === '2h' ? '2h' : timeframe === '4h' ? '4h' : '24h';
    
    // We will do a generic query combining some keywords
    const q = encodeURIComponent(`(obituary OR "passed away" OR accident OR "fatal crash" OR "found dead") when:${when}`);
    const url = `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    
    const feed = await parser.parseURL(url);
    
    const results: TrendResult[] = [];
    
    for (const item of feed.items) {
      const pubTime = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
      const ageHours = (Date.now() - pubTime) / (1000 * 60 * 60);
      
      // Basic scoring algorithm based on recency and keyword strength
      let score = 10;
      const titleLower = (item.title || "").toLowerCase();
      
      if (ageHours < 0.5) score += 50;
      else if (ageHours < 1) score += 30;
      else if (ageHours < 2) score += 15;
      
      let keywordCount = 0;
      KEYWORDS.forEach(kw => {
        if (titleLower.includes(kw.toLowerCase())) {
          keywordCount++;
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
    
    // Sort by chronological order / newest first
    results.sort((a, b) => new Date(b.publishedTime).getTime() - new Date(a.publishedTime).getTime());
    
    return results;
  } catch (error) {
    console.error('Error fetching Google News:', error);
    return [];
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
    
    // Sort by published time descending
    newsResults.sort((a, b) => new Date(b.publishedTime).getTime() - new Date(a.publishedTime).getTime());
    
    // Send at least 10 results
    res.json(newsResults);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
