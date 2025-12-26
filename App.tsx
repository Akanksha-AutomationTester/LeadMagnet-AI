
import React, { useState, useRef, useEffect } from 'react';
import { 
  Magnet, 
  Play, 
  Download, 
  RefreshCw, 
  Users, 
  Flame, 
  BarChart3, 
  LayoutDashboard,
  MapPin,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Search,
  Info,
  Navigation,
  Star,
  Map as MapIcon,
  Filter,
  MousePointer2,
  ExternalLink,
  PlusCircle,
  Loader2,
  Briefcase,
  MapPinned,
  Menu,
  X,
  Globe,
  Link as LinkIcon,
  ShieldCheck
} from 'lucide-react';
import { Lead, AppStep, ActiveView, BUSINESS_SECTORS } from './types';
import { CRM_COLUMNS } from './constants';
import { cleanLeadsWithAI } from './services/geminiService';
import { fetchRealLeadsFromAI, MapResult } from './services/mapsService';
import { LeadTable } from './components/LeadTable';
import { StatCard } from './components/StatCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<AppStep>(AppStep.IDLE);
  const [activeView, setActiveView] = useState<ActiveView>(ActiveView.DASHBOARD);
  const [progress, setProgress] = useState(0);
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Maps Search specific states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchSector, setSearchSector] = useState(BUSINESS_SECTORS[0]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [mapResults, setMapResults] = useState<MapResult[]>([]);
  const [groundingLinks, setGroundingLinks] = useState<{uri: string, title: string}[]>([]);
  const [showMapResults, setShowMapResults] = useState(false);

  const resultsEndRef = useRef<HTMLDivElement>(null);

  const startExtraction = async () => {
    if (mapResults.length === 0) return;
    
    setStatus(AppStep.EXTRACTING);
    setProgress(0);
    
    for (let i = 1; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 60));
      setProgress(i * 10);
    }

    setStatus(AppStep.CLEANING);
    try {
      const rawStrings = mapResults.map(r => 
        `Name: ${r.name} | Phone: ${r.phone || 'N/A'} | Email: ${r.email || 'N/A'} | Website: ${r.website || 'N/A'} | Address: ${r.address} | Category: ${r.type} | Rating: ${r.rating} stars`
      );
      
      const cleaned = await cleanLeadsWithAI(rawStrings);
      setLeads(prev => {
        const existingNames = new Set(prev.map(p => p.name.toLowerCase()));
        const uniqueCleaned = cleaned.filter(c => !existingNames.has(c.name.toLowerCase()));
        return [...uniqueCleaned, ...prev];
      });
      setStatus(AppStep.READY);
      
      setTimeout(() => setActiveView(ActiveView.DASHBOARD), 1500);
    } catch (err) {
      console.error(err);
      setStatus(AppStep.IDLE);
      alert("AI Cleaning failed. Check your API setup.");
    }
  };

  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery && !searchLocation) {
      alert("Please enter a query or location");
      return;
    }
    
    setIsSearching(true);
    setShowMapResults(false);
    setGroundingLinks([]);
    setMapResults([]);
    
    try {
      const { results, groundingMetadata } = await fetchRealLeadsFromAI(searchQuery, searchLocation, searchSector);
      setMapResults(results);
      
      if (groundingMetadata?.groundingChunks) {
        const links = groundingMetadata.groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            uri: chunk.web.uri,
            title: chunk.web.title
          }));
        setGroundingLinks(links);
      }
      
      setShowMapResults(true);
    } catch (error) {
      console.error(error);
      alert("Search failed. Try clarifying your query.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFindMore = async () => {
    if ((!searchQuery && !searchLocation) || isFetchingMore) return;
    
    setIsFetchingMore(true);
    const existingNames = mapResults.map(r => r.name);
    
    try {
      const { results, groundingMetadata } = await fetchRealLeadsFromAI(searchQuery, searchLocation, searchSector, existingNames);
      
      if (results.length === 0) {
        alert("Maximum data reached for this specific query.");
      } else {
        setMapResults(prev => [...prev, ...results]);
        
        if (groundingMetadata?.groundingChunks) {
          const newLinks = groundingMetadata.groundingChunks
            .filter((chunk: any) => chunk.web)
            .map((chunk: any) => ({
              uri: chunk.web.uri,
              title: chunk.web.title
            }));
          setGroundingLinks(prev => {
            const existingUris = new Set(prev.map(l => l.uri));
            const uniqueNew = newLinks.filter(l => !existingUris.has(l.uri));
            return [...prev, ...uniqueNew];
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    if (mapResults.length > 0) {
      resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mapResults.length]);

  const exportToCSV = () => {
    if (leads.length === 0) return;

    const headers = [
      "firstName", "lastName", "email", "addressFullName", "addressStreet", "addressApartment", 
      "addressCity", "addressState", "addressCountry", "addressZipCode", 
      "shippingAddressFullName", "shippingAddressStreet", "shippingAddressApartment", 
      "shippingAddressCity", "shippingAddressState", "shippingAddressCountry", 
      "shippingAddressZipCode", "phoneNumber"
    ].map(h => `"${h}"`).join(",");

    const rows = leads.map(l => {
      const nameParts = l.name.trim().split(/\s+/);
      
      const sanitize = (val: string | undefined | null) => {
        if (!val || val === "n/a" || val.trim() === "") return "empty";
        return val;
      };

      const firstName = sanitize(nameParts[0]);
      const lastName = nameParts.length > 1 ? sanitize(nameParts.slice(1).join(' ')) : "empty";

      const fields = [
        firstName, 
        lastName, 
        sanitize(l.email), 
        sanitize(l.name), 
        sanitize(l.street || l.address), 
        "empty", 
        sanitize(l.city), 
        sanitize(l.state), 
        sanitize(l.country), 
        sanitize(l.zipCode), 
        sanitize(l.name), 
        sanitize(l.street || l.address), 
        "empty", 
        sanitize(l.city), 
        sanitize(l.state), 
        sanitize(l.country), 
        sanitize(l.zipCode), 
        sanitize(l.phone)
      ];
      
      return fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(",");
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LeadMagnet_CRM_Ready_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAll = () => {
    if (confirm("Clear all captured leads?")) {
      setLeads([]);
      setStatus(AppStep.IDLE);
    }
  };

  const sidebarItems = [
    { id: ActiveView.DASHBOARD, label: 'Hub Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: ActiveView.LEAD_LIST, label: 'Lead Repository', icon: <Users size={20} /> },
    { id: ActiveView.MAPS_SEARCH, label: 'Advanced Lead Finder', icon: <MapPin size={20} /> },
    { id: ActiveView.ANALYTICS, label: 'Performance Insights', icon: <BarChart3 size={20} /> },
  ];

  const renderDashboard = () => (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Total Leads" value={leads.length} icon={<Users size={20} />} color="bg-indigo-500" />
        <StatCard label="High Quality" value={leads.filter(l => l.leadStatus === 'Hot').length} icon={<Flame size={20} />} color="bg-rose-500" />
        <StatCard label="Reach Rate" value={leads.length ? '84%' : '0%'} icon={<CheckCircle2 size={20} />} color="bg-emerald-500" />
        <StatCard label="CRM Status" value={leads.length > 0 ? "Synced" : "Idle"} icon={<MapPinned size={20} />} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-bold text-slate-800">Fresh Extractions</h2>
            <button onClick={() => setActiveView(ActiveView.LEAD_LIST)} className="text-xs md:text-sm text-indigo-600 font-medium hover:underline">Full Repository</button>
          </div>
          <LeadTable leads={leads.slice(0, 5)} />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Pipeline Health</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Hot', value: leads.filter(l => l.leadStatus === 'Hot').length, color: '#f43f5e' },
                { name: 'Warm', value: leads.filter(l => l.leadStatus === 'Warm').length, color: '#f59e0b' },
                { name: 'Cold', value: leads.filter(l => l.leadStatus === 'Cold').length, color: '#94a3b8' },
                { name: 'New', value: leads.filter(l => l.leadStatus === 'New').length, color: '#3b82f6' },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[0,1,2,3].map((entry, index) => <Cell key={`cell-${index}`} fill={['#f43f5e', '#f59e0b', '#94a3b8', '#3b82f6'][index]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLeadList = () => (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Captured Pipeline ({leads.length})</h2>
          <p className="text-slate-500 text-xs md:text-sm">Every contact is AI-verified and formatted for your CRM.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Filter current leads..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          </div>
        </div>
      </div>
      <LeadTable leads={leads} />
    </div>
  );

  const renderMapsSearch = () => (
    <div className="h-full flex flex-col lg:flex-row bg-white rounded-2xl md:rounded-3xl border border-slate-200 overflow-hidden animate-in fade-in duration-500 shadow-2xl">
      {/* Advanced Search Sidebar */}
      <div className="w-full lg:w-[380px] xl:w-[420px] border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col bg-slate-50/80 max-h-[50vh] lg:max-h-none overflow-y-auto">
        <div className="p-4 md:p-6 border-b border-slate-200 bg-white space-y-4">
          <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center">
            <Briefcase size={20} className="mr-2 text-indigo-600" />
            Lead Parameters
          </h2>
          
          <form onSubmit={handleMapSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Sector</label>
              <select 
                value={searchSector}
                onChange={(e) => setSearchSector(e.target.value)}
                className="w-full px-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                {BUSINESS_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location Focus</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="e.g. Bandra, Mumbai..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Search Keywords</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Best real estate agents..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSearching}
              className="sm:col-span-2 lg:col-span-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-95"
            >
              {isSearching ? <Loader2 className="animate-spin mr-2" size={16} /> : <Search size={16} className="mr-2" />}
              {isSearching ? 'Scraping Web...' : 'Find Leads'}
            </button>
          </form>

          {showMapResults && mapResults.length > 0 && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase">Live Count</span>
                <span className="text-base font-bold text-indigo-600">{mapResults.length} Found</span>
              </div>
              <button 
                onClick={startExtraction} 
                className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] md:text-xs font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-50 transition-all flex items-center active:scale-95"
              >
                <Play size={10} className="mr-1" /> Commit to CRM
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 relative custom-scrollbar">
          {!showMapResults && !isSearching ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="bg-white p-4 rounded-3xl shadow-sm text-slate-300">
                <MapPinned size={36} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Ready for Global Scan</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">Enter location/sector to begin.</p>
              </div>
            </div>
          ) : isSearching ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse bg-white p-3 rounded-2xl flex space-x-3">
                  <div className="bg-slate-100 h-10 w-10 rounded-xl flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-2 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-2 bg-slate-100 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {mapResults.map((item, i) => (
                <div key={i} className="p-3 bg-white hover:bg-indigo-50/30 rounded-2xl transition-all border border-slate-100 hover:border-indigo-100 cursor-pointer group shadow-sm">
                  <div className="font-bold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors flex justify-between">
                    <span className="truncate mr-2">{item.name}</span>
                    <span className="text-emerald-500 text-[9px] font-bold bg-emerald-50 px-1 py-0.5 rounded flex items-center h-fit">
                      <Star size={7} className="mr-0.5" fill="currentColor" /> {item.rating || 'N/A'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1 italic line-clamp-1">{item.type}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">{item.address}</div>
                </div>
              ))}
              
              <div ref={resultsEndRef} />

              <button 
                onClick={handleFindMore}
                disabled={isFetchingMore}
                className="w-full mt-3 py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isFetchingMore ? <Loader2 size={12} className="mr-2 animate-spin" /> : <PlusCircle size={12} className="mr-2" />}
                Deep Search More
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Interactive View */}
      <div className="flex-1 relative bg-slate-50 overflow-hidden min-h-[400px] lg:min-h-0">
        
        {/* Stylized Grid Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4f46e5" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {/* Radar Sweep Effect */}
          {isSearching && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent w-full h-full animate-[radar_3s_linear_infinite]" 
                 style={{ transformOrigin: 'center' }}></div>
          )}
        </div>

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
           <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 shadow-lg flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isSearching ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500'} `}></div>
              <span className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">
                {isSearching ? 'Scanning Web Topology...' : `Pulse: ${searchLocation || 'Global'}`}
              </span>
           </div>
           <div className="flex space-x-2 pointer-events-auto">
             <button className="p-2 bg-white rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all active:scale-95">
               <Navigation size={16} />
             </button>
           </div>
        </div>

        {/* Display Pins */}
        <div className="absolute inset-0 z-10">
          {showMapResults && mapResults.map((res, idx) => {
            // Pseudo-deterministic placement based on name/index
            const top = 15 + (idx * 27) % 70;
            const left = 10 + (idx * 31) % 80;
            return (
              <div 
                key={idx} 
                style={{ top: `${top}%`, left: `${left}%` }} 
                className="absolute group transition-all duration-700 ease-out transform scale-100 hover:scale-110"
              >
                <div className={`relative ${res.rating >= 4.5 ? 'bg-rose-500' : 'bg-indigo-600'} text-white p-2 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)] border-2 border-white cursor-pointer`}>
                  <MapPin size={18} />
                  {/* Pulse Effect */}
                  <div className={`absolute -inset-1 rounded-full animate-ping opacity-20 ${res.rating >= 4.5 ? 'bg-rose-500' : 'bg-indigo-600'}`}></div>
                </div>
                {/* Info Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-2xl text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  {res.name}
                  <div className="text-[8px] text-slate-400 font-normal">{res.type}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grounding Sources (Discovery Evidence) */}
        {groundingLinks.length > 0 && (
          <div className="absolute top-16 left-4 right-4 sm:right-auto sm:w-64 max-h-[150px] overflow-y-auto bg-white/80 backdrop-blur-lg rounded-2xl border border-white/40 shadow-xl p-3 z-20 custom-scrollbar animate-in slide-in-from-left-4 duration-500">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
              <Globe size={10} className="mr-1" /> Crawl Sources
            </h4>
            <div className="space-y-1.5">
              {groundingLinks.map((link, i) => (
                <a 
                  key={i} 
                  href={link.uri} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-[9px] text-indigo-600 hover:text-indigo-800 font-medium truncate bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100/50 flex items-center"
                >
                  <LinkIcon size={8} className="mr-1.5 flex-shrink-0" />
                  {link.title || link.uri}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Control UI */}
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-30">
          <div className="bg-white/95 backdrop-blur-xl p-3 sm:p-4 rounded-3xl shadow-2xl border border-white/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                {isSearching ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">Extraction Engine v3.0</p>
                <p className="text-[9px] text-slate-500 font-medium truncate">
                  {isSearching ? 'Deep scanning web entities...' : showMapResults ? `Verified ${mapResults.length} leads in vicinity` : 'Awaiting lead parameters'}
                </p>
              </div>
            </div>
            {showMapResults && !isSearching && !isFetchingMore && (
              <div className="flex space-x-2 w-full sm:w-auto">
                <button 
                  onClick={handleFindMore}
                  className="flex-1 sm:flex-none bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center hover:bg-slate-200 transition-all border border-slate-200"
                >
                  <PlusCircle size={12} className="mr-1.5" /> More
                </button>
                <button 
                  onClick={startExtraction}
                  className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  <Briefcase size={12} className="mr-1.5" /> Commit to CRM
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const getHeaderTitle = () => {
    switch (activeView) {
      case ActiveView.DASHBOARD: return 'Hub';
      case ActiveView.LEAD_LIST: return 'Leads';
      case ActiveView.MAPS_SEARCH: return 'Finder';
      case ActiveView.ANALYTICS: return 'Insights';
      default: return 'Leads';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row overflow-hidden selection:bg-indigo-100 selection:text-indigo-900 relative">
      
      {/* Mobile Top Navigation */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Magnet size={20} />
          </div>
          <span className="font-black text-lg tracking-tight">LeadMagnet</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-50
        bg-white border-r border-slate-200 transition-all duration-500 ease-in-out flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'lg:w-72' : 'lg:w-24'}
      `}>
        <div className="h-full flex flex-col">
          <div className="hidden lg:flex p-8 border-b border-slate-100 items-center space-x-4 overflow-hidden">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white flex-shrink-0 shadow-lg shadow-indigo-100">
              <Magnet size={28} strokeWidth={2.5} />
            </div>
            {isSidebarOpen && <span className="font-black text-2xl tracking-tighter text-slate-800 whitespace-nowrap">LeadMagnet AI</span>}
          </div>

          <div className="lg:hidden p-8 border-b border-slate-100">
            <span className="font-black text-xl text-slate-800">Menu</span>
          </div>

          <nav className="flex-1 p-5 space-y-2 overflow-y-auto custom-scrollbar">
            {sidebarItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center space-x-4 w-full p-4 rounded-2xl transition-all duration-300 ${
                  activeView === item.id 
                    ? 'bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-100 scale-[1.02]' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={activeView === item.id ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                {(isSidebarOpen || isMobileMenuOpen) && <span className="text-sm">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-6">
             <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden shadow-2xl relative">
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-indigo-600 rounded-full blur-2xl opacity-50"></div>
                {(isSidebarOpen || isMobileMenuOpen) ? (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">Engine Status</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs font-bold">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-3 animate-pulse"></div>
                        Live Web Fetcher
                      </div>
                      <Info size={16} className="text-slate-600" />
                    </div>
                  </div>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mx-auto animate-pulse"></div>
                )}
             </div>
          </div>
        </div>
      </aside>

      {/* Primary Content Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-64px)] lg:h-screen overflow-hidden relative">
        <header className="hidden lg:flex h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 items-center justify-between px-10 sticky top-0 z-10">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all active:scale-95"
            >
              <RefreshCw size={22} className={status !== AppStep.IDLE ? 'animate-spin text-indigo-600' : ''} />
            </button>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{getHeaderTitle()}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
             {status !== AppStep.IDLE ? (
               <div className="flex items-center space-x-5 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-200">
                 <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                   {status === AppStep.EXTRACTING ? 'Scraping...' : 'AI Cleaning...'}
                 </div>
                 <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                   <div 
                    className="bg-indigo-600 h-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                   ></div>
                 </div>
               </div>
             ) : (
               <button 
                onClick={() => setActiveView(ActiveView.MAPS_SEARCH)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center shadow-lg shadow-indigo-100 transition-all active:scale-95"
               >
                 <MapPin size={16} className="mr-2" />
                 Launch Finder
               </button>
             )}

             {leads.length > 0 && (
               <div className="flex items-center space-x-3 border-l border-slate-200 pl-6 ml-2">
                <button 
                  onClick={exportToCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center transition-all active:scale-95"
                >
                  <Download size={16} className="mr-2" />
                  CRM CSV
                </button>
                <button 
                  onClick={clearAll}
                  className="p-2.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
               </div>
             )}
          </div>
        </header>

        {/* Mobile Sub-Header (Controls) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 gap-2">
           <span className="text-sm font-bold text-slate-800 truncate">{getHeaderTitle()}</span>
           <div className="flex items-center space-x-2">
              {leads.length > 0 && (
                <button onClick={exportToCSV} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Download size={18} />
                </button>
              )}
              {status !== AppStep.IDLE && <Loader2 className="animate-spin text-indigo-600" size={18} />}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50/30 custom-scrollbar">
          {activeView === ActiveView.DASHBOARD && renderDashboard()}
          {activeView === ActiveView.LEAD_LIST && renderLeadList()}
          {activeView === ActiveView.MAPS_SEARCH && renderMapsSearch()}
          {activeView === ActiveView.ANALYTICS && leads.length > 0 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center">
                    <Flame size={20} className="mr-2 text-rose-500" /> Pipeline
                  </h3>
                  <div className="h-64 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={[
                            { name: 'Hot', value: leads.filter(l => l.leadStatus === 'Hot').length },
                            { name: 'Warm', value: leads.filter(l => l.leadStatus === 'Warm').length },
                            { name: 'Cold', value: leads.filter(l => l.leadStatus === 'Cold').length },
                            { name: 'New', value: leads.filter(l => l.leadStatus === 'New').length },
                          ]} 
                          cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value"
                        >
                          {[0,1,2,3].map((entry, index) => <Cell key={`cell-${index}`} fill={['#f43f5e', '#f59e0b', '#94a3b8', '#3b82f6'][index]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <style>{`
        @keyframes radar {
          from { transform: translateX(-100%) skewX(-15deg); }
          to { transform: translateX(200%) skewX(-15deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
