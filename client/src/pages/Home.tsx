import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { BarChart3, MapPin, TrendingUp, AlertCircle, Database, Zap } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [totalCrimes, setTotalCrimes] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("crimeStatistics")
        .select("total");
      if (!error && data) {
        setTotalCrimes(data.reduce((s: number, r: any) => s + (r.total ?? 0), 0));
      }
    };
    load();
  }, []);

  const totalK         = totalCrimes !== null ? `${Math.round(totalCrimes / 1000)}K` : "—";
  const totalFormatted = totalCrimes !== null ? totalCrimes.toLocaleString() : "Loading...";
  const totalMockup    = totalCrimes !== null ? totalCrimes.toLocaleString() : "...";

  const features = [
    { icon: <Database className="w-6 h-6" style={{ color: "#ff6b4a" }} />, title: "Data Analysis", description: "Comprehensive analysis of 2021-2023 crime statistics across 25 Sri Lankan districts with 13 crime categories." },
    { icon: <BarChart3 className="w-6 h-6" style={{ color: "#4ade80" }} />, title: "Interactive Dashboard", description: "Real-time visualizations with trends, distributions, and comparisons. Filter by year and crime type." },
    { icon: <MapPin className="w-6 h-6" style={{ color: "#facc15" }} />, title: "GIS Mapping", description: "Interactive map showing crime hotspots with color-coded intensity markers for each district." },
    { icon: <TrendingUp className="w-6 h-6" style={{ color: "#38bdf8" }} />, title: "Predictive Analytics", description: "AI-powered forecasting using linear regression to predict future crime trends and identify high-risk areas." },
    { icon: <AlertCircle className="w-6 h-6" style={{ color: "#f87171" }} />, title: "Risk Assessment", description: "Automatic risk level classification (low, medium, high, critical) for each district based on trends." },
    { icon: <Zap className="w-6 h-6" style={{ color: "#a78bfa" }} />, title: "Export Reports", description: "Generate and export detailed reports with statistics, predictions, and visualizations." },
  ];

  const crimeCategories = [
    "Rape Cases", "Homicide", "Attempted Homicide", "Abduction",
    "Kidnapping", "Arson", "Theft over Rs. 50,000", "Grievous Hurt",
    "Hurt by Knife", "Robbery", "Extortion", "Unnatural Offense", "Sexual Abuse",
  ];

  return (
    <div style={{ background: "#0a0c0f", minHeight: "100vh", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .sentinel-body { font-family: 'Inter', sans-serif; background: #0a0c0f; color: #c9d1d9; }

        .status-bar { display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.35rem 1rem; background:rgba(74,222,128,0.08); border-bottom:1px solid rgba(74,222,128,0.2); }
        .status-dot { width:6px; height:6px; border-radius:50%; background:#4ade80; animation:pulse-dot 2s infinite; }
        @keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .status-text { font-family:'Space Mono',monospace; font-size:0.65rem; letter-spacing:0.12em; color:#4ade80; text-transform:uppercase; }

        .hero { position:relative; overflow:hidden; min-height:88vh; display:flex; align-items:center; padding:4rem 0 6rem; }
        .hero-grid-bg { position:absolute; inset:0; pointer-events:none; background-image:linear-gradient(rgba(255,107,74,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,107,74,0.04) 1px,transparent 1px); background-size:48px 48px; }
        .hero-glow { position:absolute; top:-20%; left:-10%; width:60%; height:80%; background:radial-gradient(ellipse,rgba(255,107,74,0.07) 0%,transparent 70%); pointer-events:none; }
        .hero-inner { position:relative; max-width:1200px; margin:0 auto; padding:0 2.5rem; display:grid; grid-template-columns:1fr 1fr; gap:4rem; align-items:center; }
        .hero-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(3.5rem,6vw,5.5rem); line-height:0.95; letter-spacing:0.02em; color:#fff; margin-bottom:1.5rem; }
        .hero-title span { color:#ff6b4a; }
        .hero-desc { font-size:1rem; line-height:1.7; color:#8b949e; max-width:480px; margin-bottom:2.5rem; }
        .hero-btns { display:flex; gap:1rem; flex-wrap:wrap; }
        .btn-primary { background:#ff6b4a; color:#0a0c0f; font-family:'Space Mono',monospace; font-size:0.72rem; font-weight:700; letter-spacing:0.1em; padding:0.9rem 2rem; border:none; cursor:pointer; text-decoration:none; display:inline-block; text-transform:uppercase; transition:all 0.2s; }
        .btn-primary:hover { background:#ff8c74; transform:translateY(-1px); }
        .btn-secondary { background:transparent; color:#e2e8f0; font-family:'Space Mono',monospace; font-size:0.72rem; font-weight:700; letter-spacing:0.1em; padding:0.9rem 2rem; border:1px solid rgba(226,232,240,0.25); cursor:pointer; text-decoration:none; display:inline-block; text-transform:uppercase; transition:all 0.2s; }
        .btn-secondary:hover { border-color:#ff6b4a; color:#ff6b4a; transform:translateY(-1px); }

        .hero-visual { position:relative; }
        .dashboard-frame { background:#111418; border:1px solid rgba(255,107,74,0.2); border-radius:4px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(255,107,74,0.08); }
        .df-titlebar { background:#161b22; border-bottom:1px solid rgba(255,107,74,0.12); padding:0.5rem 0.75rem; display:flex; align-items:center; gap:0.4rem; }
        .df-dot { width:8px; height:8px; border-radius:50%; }
        .df-title { font-family:'Space Mono',monospace; font-size:0.6rem; color:#555e6a; margin-left:0.5rem; letter-spacing:0.08em; }
        .df-body { padding:1rem; }
        .df-row { display:flex; gap:0.75rem; margin-bottom:0.75rem; }
        .df-card { background:#161b22; border:1px solid rgba(255,107,74,0.1); border-radius:3px; padding:0.75rem; flex:1; }
        .df-label { font-family:'Space Mono',monospace; font-size:0.55rem; color:#555e6a; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:0.3rem; }
        .df-val { font-family:'Bebas Neue',sans-serif; font-size:1.6rem; color:#fff; line-height:1; }
        .df-val.accent { color:#ff6b4a; }
        .df-val.green { color:#4ade80; }
        .df-val.blue { color:#38bdf8; }
        .df-bar-row { display:flex; flex-direction:column; gap:0.35rem; }
        .df-bar-item { display:flex; align-items:center; gap:0.5rem; }
        .df-bar-name { font-family:'Space Mono',monospace; font-size:0.5rem; color:#8b949e; width:60px; flex-shrink:0; }
        .df-bar-track { flex:1; height:4px; background:#1e2530; border-radius:2px; overflow:hidden; }
        .df-bar-fill { height:100%; border-radius:2px; }
        .df-map-placeholder { background:#0d1117; border:1px solid rgba(255,107,74,0.1); border-radius:3px; height:90px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        .df-map-dots { position:absolute; inset:0; background-image:radial-gradient(circle,rgba(255,107,74,0.4) 1px,transparent 1px); background-size:14px 14px; opacity:0.3; }
        .df-map-text { font-family:'Space Mono',monospace; font-size:0.55rem; color:#ff6b4a; letter-spacing:0.12em; position:relative; z-index:1; }
        .hero-badge { position:absolute; bottom:-1rem; right:-1rem; background:#161b22; border:1px solid rgba(74,222,128,0.3); padding:0.6rem 1rem; }
        .hero-badge-label { font-family:'Space Mono',monospace; font-size:0.5rem; color:#4ade80; letter-spacing:0.12em; text-transform:uppercase; }
        .hero-badge-val { font-family:'Bebas Neue',sans-serif; font-size:1.8rem; color:#fff; line-height:1; }

        .section { padding:6rem 0; }
        .section-inner { max-width:1200px; margin:0 auto; padding:0 2.5rem; }
        .section-eyebrow { font-family:'Space Mono',monospace; font-size:0.65rem; letter-spacing:0.2em; color:#ff6b4a; text-transform:uppercase; margin-bottom:0.75rem; }
        .section-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(2rem,4vw,3rem); line-height:1; color:#fff; margin-bottom:1rem; }

        .features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:rgba(255,107,74,0.1); margin-top:3.5rem; border:1px solid rgba(255,107,74,0.1); }
        .feature-card { background:#0d1117; padding:2rem; transition:background 0.2s; position:relative; overflow:hidden; }
        .feature-card::before { content:''; position:absolute; top:0; left:0; width:2px; height:0; background:#ff6b4a; transition:height 0.3s; }
        .feature-card:hover { background:#111418; }
        .feature-card:hover::before { height:100%; }
        .feature-icon-wrap { width:40px; height:40px; background:rgba(255,107,74,0.08); border:1px solid rgba(255,107,74,0.15); display:flex; align-items:center; justify-content:center; margin-bottom:1.25rem; }
        .feature-title { font-family:'Space Mono',monospace; font-size:0.78rem; font-weight:700; color:#e2e8f0; letter-spacing:0.05em; text-transform:uppercase; margin-bottom:0.75rem; }
        .feature-desc { font-size:0.85rem; color:#8b949e; line-height:1.65; }

        .stats-section { background:#0d1117; border-top:1px solid rgba(255,107,74,0.12); border-bottom:1px solid rgba(255,107,74,0.12); }
        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); }
        .stat-item { padding:2.5rem 2rem; border-right:1px solid rgba(255,107,74,0.1); text-align:center; }
        .stat-item:last-child { border-right:none; }
        .stat-val { font-family:'Bebas Neue',sans-serif; font-size:3rem; line-height:1; color:#ff6b4a; margin-bottom:0.4rem; }
        .stat-label { font-family:'Space Mono',monospace; font-size:0.62rem; letter-spacing:0.12em; color:#555e6a; text-transform:uppercase; }

        .dataset-section { background:#0a0c0f; }
        .dataset-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-top:2.5rem; }
        .dataset-card { background:#0d1117; border:1px solid rgba(255,107,74,0.12); padding:1.5rem; position:relative; }
        .dataset-card-num { font-family:'Bebas Neue',sans-serif; font-size:2.5rem; color:#ff6b4a; line-height:1; margin-bottom:0.25rem; }
        .dataset-card-title { font-family:'Space Mono',monospace; font-size:0.7rem; color:#e2e8f0; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:0.75rem; }
        .dataset-card-desc { font-size:0.82rem; color:#8b949e; line-height:1.6; }
        .dataset-card-corner { position:absolute; top:0; right:0; width:20px; height:20px; border-top:2px solid #ff6b4a; border-right:2px solid #ff6b4a; }

        .categories-block { margin-top:2rem; background:#0d1117; border:1px solid rgba(255,107,74,0.12); padding:2rem; }
        .categories-header { font-family:'Space Mono',monospace; font-size:0.68rem; letter-spacing:0.15em; color:#ff6b4a; text-transform:uppercase; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.75rem; }
        .categories-header::after { content:''; flex:1; height:1px; background:rgba(255,107,74,0.2); }
        .categories-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:0.6rem 2rem; }
        .category-item { display:flex; align-items:center; gap:0.6rem; font-size:0.82rem; color:#8b949e; padding:0.3rem 0; border-bottom:1px solid rgba(255,107,74,0.05); }
        .category-bullet { width:4px; height:4px; border-radius:50%; background:#ff6b4a; flex-shrink:0; }

        .cta-section { background:#0d1117; border-top:1px solid rgba(255,107,74,0.15); border-bottom:1px solid rgba(255,107,74,0.15); position:relative; overflow:hidden; text-align:center; padding:6rem 2.5rem; }
        .cta-bg { position:absolute; inset:0; background:radial-gradient(ellipse at center,rgba(255,107,74,0.06) 0%,transparent 65%); pointer-events:none; }
        .cta-eyebrow { font-family:'Space Mono',monospace; font-size:0.65rem; letter-spacing:0.2em; color:#ff6b4a; text-transform:uppercase; margin-bottom:1rem; }
        .cta-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(2.5rem,5vw,4rem); line-height:0.95; color:#fff; margin-bottom:1rem; letter-spacing:0.03em; }
        .cta-desc { font-size:0.95rem; color:#8b949e; margin-bottom:2.5rem; max-width:560px; margin-left:auto; margin-right:auto; }
        .cta-btns { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }

        footer { background:#080a0d; border-top:1px solid rgba(255,107,74,0.1); padding:3rem 0 2rem; }
        .footer-inner { max-width:1200px; margin:0 auto; padding:0 2.5rem; }
        .footer-grid { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:3rem; margin-bottom:2.5rem; }
        .footer-brand { font-family:'Bebas Neue',sans-serif; font-size:1.1rem; letter-spacing:0.15em; color:#fff; margin-bottom:0.75rem; }
        .footer-brand-desc { font-size:0.8rem; color:#555e6a; line-height:1.65; }
        .footer-col-title { font-family:'Space Mono',monospace; font-size:0.6rem; letter-spacing:0.15em; color:#ff6b4a; text-transform:uppercase; margin-bottom:1rem; }
        .footer-links { list-style:none; display:flex; flex-direction:column; gap:0.5rem; }
        .footer-links a { font-size:0.8rem; color:#555e6a; text-decoration:none; transition:color 0.2s; }
        .footer-links a:hover { color:#e2e8f0; }
        .footer-links li { font-size:0.8rem; color:#555e6a; }
        .footer-bottom { border-top:1px solid rgba(255,107,74,0.08); padding-top:1.5rem; display:flex; align-items:center; justify-content:space-between; }
        .footer-copy { font-family:'Space Mono',monospace; font-size:0.6rem; letter-spacing:0.06em; color:#3d444d; }

        @media (max-width:900px) {
          .hero-inner { grid-template-columns:1fr; }
          .hero-visual { display:none; }
          .features-grid { grid-template-columns:1fr 1fr; }
          .stats-grid { grid-template-columns:1fr 1fr; }
          .dataset-cards { grid-template-columns:1fr 1fr; }
          .categories-grid { grid-template-columns:1fr 1fr; }
          .footer-grid { grid-template-columns:1fr 1fr; }
        }
        @media (max-width:600px) {
          .features-grid { grid-template-columns:1fr; }
          .dataset-cards { grid-template-columns:1fr; }
          .categories-grid { grid-template-columns:1fr; }
          .footer-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="sentinel-body">

        {/* STATUS BAR */}
        <div className="status-bar">
          <div className="status-dot"></div>
          <span className="status-text">SYSTEM ONLINE // Admin ACCESS GRANTED</span>
        </div>

        {/* HERO */}
        <section className="hero">
          <div className="hero-grid-bg"></div>
          <div className="hero-glow"></div>
          <div className="hero-inner">
            <div>
              <h1 className="hero-title">
                Sri Lanka<br />
                <span>Crime Prediction</span><br />
                System
              </h1>
              <p className="hero-desc">
                Advanced analytics and predictive modeling for district level crime statistics. Leverage historical data to forecast trends and identify high risk areas.
              </p>
              <div className="hero-btns">
                {isAuthenticated ? (
                  <>
                    <a href="/dashboard" className="btn-primary">Go to Dashboard</a>
                    <a href="/map" className="btn-secondary">View Crime Map</a>
                  </>
                ) : (
                  <>
                    <a href={getLoginUrl()} className="btn-primary">Get Started</a>
                    <a href="/dashboard" className="btn-secondary">View Crime Map</a>
                  </>
                )}
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="hero-visual">
              <div className="dashboard-frame">
                <div className="df-titlebar">
                  <div className="df-dot" style={{background:"#ff5f57"}}></div>
                  <div className="df-dot" style={{background:"#ffbd2e"}}></div>
                  <div className="df-dot" style={{background:"#28c940"}}></div>
                  <span className="df-title">OVERVIEW DISTRICT — CRIME SIGHT</span>
                </div>
                <div className="df-body">
                  <div className="df-row">
                    <div className="df-card">
                      <div className="df-label">Districts</div>
                      <div className="df-val accent">25</div>
                    </div>
                    <div className="df-card">
                      <div className="df-label">Total Crimes</div>
                      <div className="df-val">{totalMockup}</div>
                    </div>
                    <div className="df-card">
                      <div className="df-label">Categories</div>
                      <div className="df-val green">13</div>
                    </div>
                    <div className="df-card">
                      <div className="df-label">Years</div>
                      <div className="df-val blue">3</div>
                    </div>
                  </div>
                  <div className="df-row">
                    <div className="df-card" style={{flex:2}}>
                      <div className="df-label" style={{marginBottom:"0.6rem"}}>Crime Trend — Top Districts</div>
                      <div className="df-bar-row">
                        {[["Colombo","#ff6b4a",88],["Gampaha","#38bdf8",72],["Kandy","#4ade80",61],["Galle","#facc15",49],["Matara","#a78bfa",38]].map(([name,color,pct])=>(
                          <div className="df-bar-item" key={name as string}>
                            <span className="df-bar-name">{name as string}</span>
                            <div className="df-bar-track">
                              <div className="df-bar-fill" style={{width:`${pct}%`, background: color as string}}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="df-card" style={{flex:1}}>
                      <div className="df-label">Risk Level</div>
                      <div style={{display:"flex",flexDirection:"column",gap:"0.35rem",marginTop:"0.25rem"}}>
                        {[["CRITICAL","#ff5f57"],["HIGH","#ff6b4a"],["MEDIUM","#facc15"],["LOW","#4ade80"]].map(([lbl,clr])=>(
                          <div key={lbl as string} style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                            <div style={{width:"6px",height:"6px",borderRadius:"1px",background:clr as string,flexShrink:0}}></div>
                            <span style={{fontFamily:"'Space Mono',monospace",fontSize:"0.5rem",color:"#8b949e",letterSpacing:"0.08em"}}>{lbl as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="df-map-placeholder">
                    <div className="df-map-dots"></div>
                    <span className="df-map-text">GIS // DISTRICT MAP OVERLAY</span>
                  </div>
                </div>
              </div>
              <div className="hero-badge">
                <div className="hero-badge-label">Active Analysis</div>
                <div className="hero-badge-val">84.2%</div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS ROW */}
        <div className="stats-section">
          <div style={{maxWidth:"1200px",margin:"0 auto",padding:"0 2.5rem"}}>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-val">25</div>
                <div className="stat-label">Districts Covered</div>
              </div>
              <div className="stat-item">
                <div className="stat-val">13</div>
                <div className="stat-label">Crime Types</div>
              </div>
              <div className="stat-item">
                <div className="stat-val">3</div>
                <div className="stat-label">Years of Data</div>
              </div>
              <div className="stat-item">
                <div className="stat-val">{totalK}</div>
                <div className="stat-label">Total Records</div>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <section className="section" style={{background:"#0a0c0f"}}>
          <div className="section-inner">
            <div className="section-eyebrow">Core Capabilities</div>
            <h2 className="section-title">Everything you need for<br/>comprehensive crime analysis<br/>and prediction</h2>
            <div className="features-grid">
              {features.map((f, i) => (
                <div className="feature-card" key={i}>
                  <div className="feature-icon-wrap">{f.icon}</div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-desc">{f.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        
        {/* DATASET */}
        <section className="section dataset-section">
          <div className="section-inner">
            <div className="section-eyebrow">Dataset Overview</div>
            <h2 className="section-title">Comprehensive Coverage</h2>
            <div className="dataset-cards">
              <div className="dataset-card">
                <div className="dataset-card-corner"></div>
                <div className="dataset-card-num">25</div>
                <div className="dataset-card-title">Districts</div>
                <div className="dataset-card-desc">Comprehensive coverage across all districts of Sri Lanka including urban, rural, and island regions.</div>
              </div>
              <div className="dataset-card">
                <div className="dataset-card-corner"></div>
                <div className="dataset-card-num">13</div>
                <div className="dataset-card-title">Crime Types</div>
                <div className="dataset-card-desc">Detailed categorization including violent crimes, property crimes, and sexual offenses.</div>
              </div>
              <div className="dataset-card">
                <div className="dataset-card-corner"></div>
                <div className="dataset-card-num">2021–23</div>
                <div className="dataset-card-title">Years of Data</div>
                <div className="dataset-card-desc">Longitudinal data enabling trend analysis and reliable predictive modeling.</div>
              </div>
              <div className="dataset-card" style={{gridColumn:"span 3"}}>
                <div className="dataset-card-corner"></div>
                <div className="dataset-card-num">{totalFormatted}</div>
                <div className="dataset-card-title">Total Crimes Recorded</div>
                <div className="dataset-card-desc">Complete crime data across all districts and categories for comprehensive analysis.</div>
              </div>
            </div>
            <div className="categories-block">
              <div className="categories-header">Crime Categories Analyzed</div>
              <div className="categories-grid">
                {crimeCategories.map((c, i) => (
                  <div className="category-item" key={i}>
                    <div className="category-bullet"></div>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        

        {/* FOOTER */}
        <footer>
          <div className="footer-inner">
            <div className="footer-grid">
              <div>
                <div className="footer-brand">CRIME SIGHT</div>
                <p className="footer-brand-desc">Advanced crime analytics platform for Sri Lanka using machine learning and geospatial analysis.</p>
              </div>
              <div>
                <div className="footer-col-title">Platform</div>
                <ul className="footer-links">
                  <li><a href="/dashboard">Dashboard</a></li>
                  <li><a href="/map">Crime Map</a></li>
                  <li><a href="/predictions">Predictions</a></li>
                </ul>
              </div>
              <div>
                <div className="footer-col-title">Data</div>
                <ul className="footer-links">
                  <li>25 Districts</li>
                  <li>13 Crime Types</li>
                  <li>2021–2023</li>
                </ul>
              </div>
              <div>
                <div className="footer-col-title">Features</div>
                <ul className="footer-links">
                  <li>Analytics</li>
                  <li>Predictions</li>
                  <li>GIS Mapping</li>
                </ul>
              </div>
            </div>
            <div className="footer-bottom">
              <span className="footer-copy">© 2026 Gaveen Ranasinghe. All rights reserved.</span>
              <span className="footer-copy">Sri Lanka Police Crime Division</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}