import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import './styles/ExternalIntelligence.css';

/* ── Icons ── */
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
);
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const SmileIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const HeartIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);
const VerifiedIcon = () => (
  <svg className="ent-badge" viewBox="0 0 24 24" width="14" height="14" fill="#3B82F6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
);
const LinkIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);
const RedditIcon = ({size=20}) => (
  <img src="/bxl-reddit.svg" alt="Reddit" width={size} height={size} />
);
const NewsIcon = ({size=20}) => (
  <img src="/bx-news.svg" alt="News" width={size} height={size} />
);
const YouTubeIcon = ({size=20}) => (
  <img src="/bxl-youtube.svg" alt="YouTube" width={size} height={size} />
);
const XIcon = ({size=20}) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

/* ── Helpers ── */
const timeAgo = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) { const u=parseInt(d); if(!isNaN(u)) return new Date(u*1000).toLocaleDateString(); return d; }
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  if (s < 2592000) return Math.floor(s/86400) + 'd ago';
  return Math.floor(s/2592000) + 'mo ago';
};

const fmt = (n) => {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return n.toLocaleString();
};

import { computeExternalReputation as computeReputation } from '../../utils/scoring';

/* ── 1. Score Ring ── */
const ScoreRing = ({ score, label }) => {
  const r = 54, c = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 80 ? 'var(--good)' : score >= 65 ? 'var(--accent)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="score-ring-wrap">
      <svg viewBox="0 0 120 120" className="score-ring-svg">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="8"/>
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round" className="score-ring-arc" style={{'--target': c * (1 - pct)}}/>
      </svg>
      <div className="score-ring-value">
        <span className="score-num">{score}</span>
        <span className="score-label" style={{color}}>{label}</span>
      </div>
    </div>
  );
};

/* ── 2. Reputation Card ── */
const ReputationCard = ({ data }) => {
  const rep = useMemo(() => computeReputation(data), [data]);
  return (
    <div className="ei-card rep-card">
      <div className="card-label">Overall Score <InfoIcon /></div>
      <div className="rep-content">
        <div className="rep-left">
          <ScoreRing score={rep.score} label={rep.label}/>
        </div>
        <div className="rep-right">
          <div className="rep-metric-row">
            <span className="rm-icon chat"><ChatIcon /></span>
            <div className="rm-text"><span className="rm-key">Mentions</span><span className="rm-val">{fmt(rep.mentions)}</span></div>
          </div>
          <div className="rep-metric-row">
            <span className="rm-icon smile"><SmileIcon /></span>
            <div className="rm-text"><span className="rm-key">Sentiment</span><span className="rm-val">{rep.score >= 50 ? '+' : ''}{Math.round((rep.score - 50) * 1.5)}%</span></div>
          </div>
          <div className="rep-metric-row">
            <span className="rm-icon eye"><EyeIcon /></span>
            <div className="rm-text"><span className="rm-key">Reach</span><span className="rm-val">{fmt(rep.reach)}</span></div>
          </div>
          <div className="rep-metric-row">
            <span className="rm-icon heart"><HeartIcon /></span>
            <div className="rm-text"><span className="rm-key">Engagement</span><span className="rm-val">{fmt(rep.engagement)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── 3. Entity Card ── */
const EntityCard = ({ entity, isAwaiting }) => {
  if (!entity) return null;
  return (
    <div className="ei-card ent-card">
      <div className="card-label">Entity Overview</div>
      <div className="ent-top">
        <div className="ent-logo"><img src={`https://www.google.com/s2/favicons?domain=${entity.domain}&sz=64`} alt=""/></div>
        <div className="ent-details">
          <div className="ent-name">{entity.name || entity.domain} <VerifiedIcon/></div>
          <a href={entity.url} className="ent-url" target="_blank" rel="noopener noreferrer"><LinkIcon/> {entity.domain}</a>
        </div>
      </div>
      <p className="ent-desc">
        {isAwaiting 
          ? "Awaiting analysis to identify entity profile and community presence." 
          : (entity.description || `Online platform or service related to ${entity.name || entity.domain}, recognized for its active community and presence.`)}
      </p>
      <div className="ent-meta-grid">
        <div className="ent-meta"><span className="em-key">Industry</span><span className="em-val">{isAwaiting ? '---' : 'Technology'}</span></div>
        <div className="ent-meta"><span className="em-key">Founded</span><span className="em-val">{isAwaiting ? '---' : 'N/A'}</span></div>
        <div className="ent-meta"><span className="em-key">Headquarters</span><span className="em-val">{isAwaiting ? '---' : 'Global'}</span></div>
      </div>
    </div>
  );
};

/* ── 4. Internet Sources ── */
const SourcesCard = ({ data, loading }) => {
  const rc = data?.reddit?.length || 0, nc = data?.news?.length || 0;
  const sources = [
    { name:'Reddit', icon:<RedditIcon size={20}/>, count:rc, status: loading?'loading':(rc>0?'Active':'Empty'), cls:'reddit' },
    { name:'News', icon:<NewsIcon size={20}/>, count:nc, status: loading?'loading':(nc>0?'Active':'Empty'), cls:'news' },
    { name:'YouTube', icon:<YouTubeIcon size={20}/>, count:0, status:'Limited', cls:'' },
    { name:'X (Twitter)', icon:<XIcon size={20}/>, count:0, status:'Limited', cls:'' },
  ];
  return (
    <div className="ei-card src-card">
      <div className="card-label">Internet Sources <InfoIcon /></div>
      <div className="src-list">
        {sources.map(s => (
          <div className={`src-row`} key={s.name}>
            <span className={`src-icon ${s.cls}`}>{s.icon}</span>
            <span className="src-name">{s.name}</span>
            <span className="src-count">{s.count > 0 ? `${s.count} items` : (s.status === 'Limited' ? '0 items' : '...')}</span>
            <span className={`src-badge ${s.status.toLowerCase()}`}>{s.status}</span>
          </div>
        ))}
      </div>
      <div className="src-footer">
        <button className="src-btn">View All Sources →</button>
      </div>
    </div>
  );
};

/* ── 5. Community Pulse ── */
const PulseCard = ({ reddit }) => {
  const stats = useMemo(() => {
    if (!reddit || !reddit.length) return null;
    const n = reddit.length;
    const subs = new Set(reddit.map(p => p.subreddit));
    const totalScore = reddit.reduce((a,p) => a + (p.score||0), 0);
    const totalComments = reddit.reduce((a,p) => a + (p.numComments||p.comments||p.num_comments||0), 0);
    const subMap = {};
    reddit.forEach(p => { if(p.subreddit) subMap[p.subreddit] = (subMap[p.subreddit]||0)+1; });
    const topSub = Object.entries(subMap).sort((a,b)=>b[1]-a[1])[0];
    
    return { 
      communities: subs.size, 
      posts: n, 
      avgScore: Math.round(totalScore/n),
      avgComments: Math.round(totalComments/n), 
      engagement: totalComments,
      topSub: topSub ? `r/${topSub[0]}` : 'N/A'
    };
  }, [reddit]);

  if (!stats) return <div className="ei-card pulse-full-card"><div className="card-label">Community Pulse <InfoIcon /></div><p className="no-data">No Reddit data</p></div>;

  return (
    <div className="ei-card pulse-full-card">
      <div className="card-label">Community Pulse <InfoIcon /></div>
      
      <div className="pulse-kpis">
        <div className="pkpi">
          <span className="pkpi-lbl">Communities</span>
          <span className="pkpi-val">{fmt(stats.communities)}</span>
        </div>
        <div className="pkpi">
          <span className="pkpi-lbl">Posts</span>
          <span className="pkpi-val">{fmt(stats.posts)}</span>
        </div>
        <div className="pkpi">
          <span className="pkpi-lbl">Avg Score</span>
          <span className="pkpi-val">{fmt(stats.avgScore)}</span>
        </div>
        <div className="pkpi">
          <span className="pkpi-lbl">Avg Comments</span>
          <span className="pkpi-val">{fmt(stats.avgComments)}</span>
        </div>
        <div className="pkpi">
          <span className="pkpi-lbl">Engagement</span>
          <span className="pkpi-val">{fmt(stats.engagement)}</span>
        </div>
        <div className="pkpi top-comm">
          <span className="pkpi-lbl">Top Community</span>
          <span className="pkpi-val">{stats.topSub}</span>
        </div>
      </div>
    </div>
  );
};

/* ── 6. AI Summary ── */
const AISummary = ({ aiData }) => {
  const { summary, loading } = aiData;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ei-card ai-card">
      <div className="ai-header">
        <svg className="ai-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <span className="ai-title">AI Analysis</span>
      </div>
      {loading ? (
        <div className="ai-loading"><div className="ai-pulse-bar"/><div className="ai-pulse-bar short"/></div>
      ) : summary ? (
        <>
          <div className={`ai-body ${expanded ? 'expanded' : ''}`}>
            {typeof summary === 'string' 
              ? summary.split('\n').filter(p=>p.trim()).map((p,i)=><p key={i}>{p}</p>)
              : (Array.isArray(summary) ? summary.map((p,i)=><p key={i}>{p}</p>) : <p>{String(summary)}</p>)
            }
          </div>
          <button className="ai-expand" onClick={()=>setExpanded(!expanded)}>
            {expanded ? 'Collapse' : 'View Full Analysis →'}
          </button>
        </>
      ) : <p className="no-data">Could not generate analysis</p>}
    </div>
  );
};

/* ── 7. Reddit Feed ── */
const RedditFeed = ({ reddit }) => {
  if (!reddit || !reddit.length) return (
    <div className="feed-section">
      <div className="feed-hdr"><span className="feed-dot reddit"/><RedditIcon size={22}/><h3>Reddit Discussions</h3><span className="feed-count">0 posts</span></div>
      <div className="feed-empty">No Reddit discussions found for this entity.</div>
    </div>
  );
  return (
    <div className="feed-section">
      <div className="feed-hdr"><span className="feed-dot reddit"/><RedditIcon size={22}/><h3>Reddit Discussions</h3><span className="feed-count">{reddit.length} posts</span></div>
      <div className="feed-grid">
        {reddit.map((p, i) => {
          const comments = p.numComments||p.comments||p.num_comments||0;
          const url = p.url||p.permalink;
          return (
            <div className="feed-card" style={{'--i':i}} key={i}>
              <div className="fc-top"><span className="fc-sub">r/{p.subreddit}</span><span className="fc-time">{timeAgo(p.publishedAt||p.created_utc||p.created)}</span></div>
              <h4 className="fc-title">{p.title}</h4>
              <div className="fc-bottom">
                <div className="fc-stats">
                  <span className="fc-stat">↑ {fmt(p.score||0)}</span>
                  <span className="fc-stat">💬 {fmt(comments)}</span>
                </div>
                {url && <a href={url} target="_blank" rel="noopener noreferrer" className="fc-link">Open →</a>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── 8. News Feed ── */
const NewsFeed = ({ news }) => {
  return (
    <div className="feed-section">
      <div className="feed-hdr"><span className="feed-dot news"/><NewsIcon size={22}/><h3>Recent News</h3><span className="feed-count">{news?.length||0} articles</span></div>
      {(!news || !news.length) ? (
        <div className="feed-empty">No recent news articles found for this entity.</div>
      ) : (
        <div className="feed-grid">
          {news.map((a, i) => (
            <div className="feed-card news-card" style={{'--i':i}} key={i}>
              <div className="fc-top"><span className="fc-pub">{a.publisher||a.source}</span><span className="fc-time">{timeAgo(a.publishedAt||a.published)}</span></div>
              <h4 className="fc-title">{a.title||a.headline}</h4>
              <div className="fc-bottom">
                <a href={a.url||a.link} target="_blank" rel="noopener noreferrer" className="fc-link news-lnk">Read Article →</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};



/* ── 9. Trending Topics ── */
const TrendingTopics = ({ topics, loading }) => {
  const max = (topics && topics.length > 0) ? (topics[0]?.score || 100) : 100;
  return (
    <div className="ei-card trend-card">
      <div className="card-label">Trending Topics (AI)</div>
      {loading ? (
        <div className="ai-loading"><div className="ai-pulse-bar"/><div className="ai-pulse-bar short"/></div>
      ) : (!topics || !topics.length) ? (
        <p className="no-data">Could not extract topics</p>
      ) : (
        <div className="trend-bars">
          {topics.map((t, i) => (
            <div className="trend-row" key={i}>
              <span className="trend-word">{t.topic}</span>
              <div className="trend-bar-bg"><div className="trend-bar-fill" style={{width: `${(t.score/max)*100}%`}}/></div>
              <span className="trend-pct">{t.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── 10. Sentiment Overview ── */
const SentimentCard = ({ reddit }) => {
  const data = useMemo(() => {
    if (!reddit || !reddit.length) return null;
    const pos = reddit.filter(p => (p.score||0) > 50).length;
    const neg = reddit.filter(p => (p.score||0) <= 5).length;
    const neutral = reddit.length - pos - neg;
    return { positive: Math.round(pos/reddit.length*100), negative: Math.round(neg/reddit.length*100), neutral: Math.round(neutral/reddit.length*100) };
  }, [reddit]);
  if (!data) return (
    <div className="ei-card sent-card">
      <div className="card-label">Sentiment Overview</div>
      <p className="no-data">No sentiment data available.</p>
    </div>
  );
  return (
    <div className="ei-card sent-card">
      <div className="card-label">Sentiment Overview</div>
      <div className="sent-bars">
        <div className="sent-segment"><div className="sent-bar positive" style={{width:`${data.positive}%`}}/><span>Positive {data.positive}%</span></div>
        <div className="sent-segment"><div className="sent-bar neutral" style={{width:`${data.neutral}%`}}/><span>Neutral {data.neutral}%</span></div>
        <div className="sent-segment"><div className="sent-bar negative" style={{width:`${data.negative}%`}}/><span>Negative {data.negative}%</span></div>
      </div>
    </div>
  );
};

/* ── Active Investigation Loader ── */
/* ── Empty State ── */
const MOCK_EXTERNAL_DATA = {
  entity: { name: 'Awaiting Analysis', domain: 'example.com', url: '#' },
  reddit: [],
  news: [],
  score: 0
};

/* ── Main Page ── */
export default function ExternalIntelligence() {
  const { externalData, loading, error } = useOutletContext();
  const isAwaiting = !externalData && !loading;
  const displayData = externalData || MOCK_EXTERNAL_DATA;

  const [aiData, setAiData] = useState({ loading: true, summary: null, trendingTopics: [] });

  useEffect(() => {
    if (!externalData) return;
    let alive = true;
    (async () => {
      setAiData(prev => ({ ...prev, loading: true }));
      try {
        const res = await fetch('/api/externalWeb/summarize', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ entity:externalData.entity, reddit:externalData.reddit, news:externalData.news })
        });
        const d = await res.json();
        if (alive && d.success) {
           setAiData({ loading: false, summary: d.summary, trendingTopics: d.trendingTopics || [] });
        } else if (alive) {
           setAiData({ loading: false, summary: null, trendingTopics: [] });
        }
      } catch {
        if (alive) setAiData({ loading: false, summary: null, trendingTopics: [] });
      }
    })();
    return () => { alive = false; };
  }, [externalData]);

  return (
    <div className={`ei-page ${loading ? 'is-loading' : ''} ${isAwaiting ? 'is-awaiting' : ''}`}>
      {error && <div className="ei-error">{error}</div>}

      <div style={{ opacity: isAwaiting ? 0.6 : 1, pointerEvents: isAwaiting || loading ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
        <div className="ei-dash">
          {/* Row 1: Overview */}
          <div className="ei-row ei-overview-row">
            <ReputationCard data={displayData}/>
            <EntityCard entity={displayData.entity} isAwaiting={isAwaiting}/>
            <SourcesCard data={displayData} loading={loading}/>
          </div>
          
          <div className="ei-row ei-pulse-row">
            <PulseCard reddit={displayData.reddit}/>
          </div>

          {/* Row 2: AI */}
          <AISummary aiData={aiData}/>

          {/* Row 3: Feeds side by side */}
          <div className="ei-row ei-feeds-row">
            <RedditFeed reddit={displayData.reddit}/>
            <NewsFeed news={displayData.news}/>
          </div>

          {/* Row 4: Analytics */}
          <div className="ei-row ei-analytics-row">
            <TrendingTopics topics={aiData.trendingTopics} loading={aiData.loading} />
            <SentimentCard reddit={displayData.reddit} />
          </div>
        </div>
      </div>
    </div>
  );
}
