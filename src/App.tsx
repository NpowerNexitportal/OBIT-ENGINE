import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Globe, 
  Clock, 
  Search, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  Newspaper,
  Moon,
  Sun,
  LayoutDashboard,
  Settings,
  X,
  Plus
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

interface Country {
  code: string;
  name: string;
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [trends, setTrends] = useState<TrendResult[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminKeywords, setAdminKeywords] = useState<string[]>(['celebrity death', 'plane crash', 'fatal accident', 'obituary']);
  const [newKeyword, setNewKeyword] = useState('');
  
  // Toggle Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Fetch Countries
  useEffect(() => {
    fetch('/api/countries')
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(console.error);
  }, []);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trends?country=${selectedCountry}&timeframe=${selectedTimeframe}`);
      const data = await res.json();
      setTrends(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Trends Initial & Poll
  useEffect(() => {
    fetchTrends();
    
    // Auto refresh every 3 minutes
    const interval = setInterval(fetchTrends, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedCountry, selectedTimeframe]);

  const addKeyword = () => {
    if (newKeyword && !adminKeywords.includes(newKeyword)) {
      setAdminKeywords([...adminKeywords, newKeyword]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    setAdminKeywords(adminKeywords.filter(k => k !== kw));
  };

  // Filter trends based on search
  const filteredTrends = useMemo(() => {
    if (!searchQuery) return trends;
    return trends.filter(t => 
      t.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.source.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [trends, searchQuery]);

  // Export to CSV
  const exportCSV = () => {
    const headers = ['S/N', 'Topic', 'Country', 'Time Frame', 'Trend Score', 'Source', 'Published Time', 'URL'];
    const rows = filteredTrends.map((t, i) => [
      i + 1,
      `"${t.topic.replace(/"/g, '""')}"`,
      t.country,
      t.timeFrame,
      t.trendScore,
      t.source,
      t.publishedTime,
      t.url
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `obituary_trends_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = useMemo(() => {
    // Fake chart data based on random distribution over the last few hours
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => ({
      time: format(new Date(now.getTime() - (5 - i) * 3600000), 'h aaa'),
      mentions: Math.floor(Math.random() * 50) + 10
    }));
  }, [selectedCountry, selectedTimeframe]);

  const stats = useMemo(() => {
    const obituaries = trends.filter(t => /obituary|died|dead|passed away|RIP/i.test(t.topic)).length;
    const accidents = trends.filter(t => /accident|crash/i.test(t.topic)).length;
    return {
      total: trends.length,
      breakouts: trends.filter(t => t.trendScore === 'Breakout').length,
      obituaries,
      accidents
    };
  }, [trends]);

  return (
    <div className="h-screen w-screen p-4 sm:p-6 flex flex-col space-y-4 sm:space-y-6 overflow-hidden bg-slate-950 text-slate-50 font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-slate-900 text-xl">
             V
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">
              Vigilance <span className="text-sky-500">OS</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-widest hidden sm:block">
              Obituary & Accident Intelligence Hub
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 bg-slate-900 border border-slate-800 px-3 sm:px-4 py-2 rounded-full">
          <div className="hidden sm:flex items-center">
            <span className="status-pulse"></span>
            <span className="text-[10px] font-mono text-slate-300 uppercase">Live Monitoring: Active</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-slate-700 mx-1 sm:mx-2"></div>
          <div className="text-[10px] font-mono text-slate-400">
            LAST SCAN: {format(lastUpdated, 'HH:mm:ss')} UTC
          </div>
          <div className="h-4 w-px bg-slate-700 mx-1 sm:mx-2"></div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchTrends}
              className="text-slate-400 hover:text-sky-400 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="text-slate-400 hover:text-sky-400 transition-colors hidden sm:block"
              title="Admin Panel"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Admin Modal */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity">
          <div className="bento-card shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] p-0">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wide">
                <Settings className="w-4 h-4" />
                Admin Settings
              </h2>
              <button 
                onClick={() => setIsAdminOpen(false)}
                className="p-1 rounded-md hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
              
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trend Engine Settings</h3>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <span className="text-xs text-slate-300 font-medium">Scan Interval</span>
                  <select className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none">
                    <option>1 Minute</option>
                    <option selected>3 Minutes</option>
                    <option>5 Minutes</option>
                    <option>10 Minutes</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <span className="text-xs text-slate-300 font-medium">Google News Source</span>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" defaultChecked name="toggle" id="toggle" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-emerald-500 checked:right-0 right-5 transition-all duration-200"/>
                    <label htmlFor="toggle" className="toggle-label block overflow-hidden h-5 rounded-full bg-emerald-500 cursor-pointer"></label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Keywords Monitor</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="Add keyword..." 
                    className="flex-1 px-3 py-2 text-xs border border-slate-800 bg-slate-950 text-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                  <button 
                    onClick={addKeyword}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {adminKeywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-sky-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              
            </div>
            
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/50">
              <button 
                onClick={() => setIsAdminOpen(false)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-6 gap-4 flex-grow overflow-hidden">
        
        {/* Left Sidebar / Filters & Charts */}
        <div className="lg:col-span-3 lg:row-span-6 bento-card space-y-6 overflow-y-auto custom-scrollbar hidden lg:flex">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Filters</h2>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-slate-400">Country Region</label>
              <div className="flex items-center border border-slate-800 rounded px-3 py-2 bg-slate-950 focus-within:border-sky-500 transition-colors">
                <Globe className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                <select 
                  value={selectedCountry} 
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-200 outline-none appearance-none cursor-pointer"
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-slate-400">Interval (Freshness)</label>
              <div className="flex items-center border border-slate-800 rounded px-3 py-2 bg-slate-950 focus-within:border-sky-500 transition-colors">
                <Clock className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                <select 
                  value={selectedTimeframe} 
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-200 outline-none appearance-none cursor-pointer"
                >
                  <option value="1h">Last 1 Hour</option>
                  <option value="2h">Last 2 Hours</option>
                  <option value="4h">Last 4 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-slate-400">Search Topic</label>
              <div className="flex items-center border border-slate-800 rounded px-3 py-2 bg-slate-950 focus-within:border-sky-500 transition-colors">
                <Search className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search names or topics..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[10px] sm:text-xs text-slate-200 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Keywords</h2>
            <div className="flex flex-wrap gap-2">
              {adminKeywords.slice(0, 8).map((kw) => (
                <span key={kw} className="px-2 py-1 bg-slate-800 rounded text-[10px] font-medium border border-slate-700 text-slate-300 capitalize">
                  {kw}
                </span>
              ))}
            </div>
          </div>
          
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Morbidity Mentions (6H)</h2>
            <div className="h-32 -mx-2 bg-slate-900/50 rounded-lg p-2 border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMentions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dx={-5} width={30} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '10px', color: '#f8fafc' }}
                  />
                  <Area type="monotone" dataKey="mentions" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorMentions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="mt-auto pt-4 space-y-3">
            <div className="p-3 bg-sky-500/5 rounded-lg border border-sky-500/20">
              <p className="text-[10px] text-sky-400 font-bold uppercase mb-1">System Status</p>
              <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                {stats.breakouts > 0 ? `${stats.breakouts} BREAKOUT TOPIC${stats.breakouts > 1 ? 'S' : ''} DETECTED IN THE SELECTED INTERVAL.` : "NO CURRENT BREAKOUTS."}
              </p>
            </div>
            <button 
              onClick={exportCSV}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded text-xs transition-colors border border-slate-700 flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Export Intelligence
            </button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="lg:col-span-9 lg:row-span-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Breakout Trends" value={stats.breakouts} valueClass="text-sky-400" />
          <StatCard title="Total Mentions" value={stats.total} valueClass="text-slate-100" />
          <StatCard title="Obituary Docs" value={stats.obituaries} valueClass="text-slate-100" />
          <StatCard title="Confidence Score" value={`${Math.max(85, Math.min(99, 100 - (stats.breakouts * 2)))}%`} valueClass="text-emerald-500" />
        </div>
        
        {/* Main Table */}
        <div className="lg:col-span-9 lg:row-span-5 bento-card p-0 overflow-hidden border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Real-Time Breakout Feed</h3>
            
            {/* Mobile Controls (hidden on desktop since they are in sidebar) */}
            <div className="lg:hidden flex items-center space-x-2">
               <select 
                  value={selectedCountry} 
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-[10px] px-2 py-1 rounded focus:outline-none"
                >
                  {countries.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <select 
                  value={selectedTimeframe} 
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-[10px] px-2 py-1 rounded focus:outline-none"
                >
                  <option value="1h">1H</option>
                  <option value="4h">4H</option>
                  <option value="24h">24H</option>
                </select>
            </div>
          </div>
          
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950 sticky top-0 z-10 box-shadow">
                <tr className="text-[10px] uppercase text-slate-500 tracking-tighter border-y border-slate-800">
                  <th className="p-4 font-bold">#</th>
                  <th className="p-4 font-bold max-w-[200px]">Topic</th>
                  <th className="p-4 font-bold">Loc</th>
                  <th className="p-4 font-bold">Growth</th>
                  <th className="p-4 font-bold">Source</th>
                  <th className="p-4 font-bold">Detection</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-800/50 text-slate-300">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4"><div className="h-3 w-4 bg-slate-800 rounded"></div></td>
                      <td className="p-4"><div className="h-3 w-32 bg-slate-800 rounded"></div></td>
                      <td className="p-4"><div className="h-3 w-8 bg-slate-800 rounded"></div></td>
                      <td className="p-4"><div className="h-4 w-16 bg-slate-800 rounded"></div></td>
                      <td className="p-4"><div className="h-3 w-20 bg-slate-800 rounded"></div></td>
                      <td className="p-4"><div className="h-3 w-12 bg-slate-800 rounded"></div></td>
                    </tr>
                  ))
                ) : filteredTrends.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-mono text-[10px] uppercase">
                      NO breakOut TOPICS DETECTED MATCHING FILTERS.
                    </td>
                  </tr>
                ) : (
                  filteredTrends.map((trend, i) => (
                    <tr key={trend.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono text-slate-500 text-[10px]">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="p-4 font-bold text-slate-100 max-w-[200px] sm:max-w-xs truncate">
                        <a href={trend.url} target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors" title={trend.topic}>
                          {trend.topic}
                        </a>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-slate-400 uppercase">
                        {trend.country}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap",
                          trend.trendScore === 'Breakout' ? "bg-emerald-500/10 text-emerald-500" :
                          trend.trendScore === 'Hot' ? "bg-sky-500/10 text-sky-500" :
                          trend.trendScore === 'Rising' ? "bg-amber-500/10 text-amber-500" :
                          "bg-slate-700 text-slate-400"
                        )}>
                          {trend.trendScore}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-[10px] uppercase">
                        {trend.source}
                      </td>
                      <td className="p-4 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(trend.publishedTime), { addSuffix: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, valueClass }: { title: string, value: number | string, valueClass?: string }) {
  return (
    <div className="bento-card justify-center gap-1">
      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{title}</span>
      <span className={cn("text-2xl font-bold", valueClass || "text-slate-100")}>{value}</span>
    </div>
  );
}
