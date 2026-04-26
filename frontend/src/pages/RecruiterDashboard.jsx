import React, { useState, useCallback } from 'react';
import axios from 'axios';
import ScoreRing from '../components/ScoreRing';
import ChatUI from '../components/ChatUI';

const API = 'http://localhost:8000';

// ─── Global styles ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --c-bg0: #0a0a10;
    --c-bg1: #10101a;
    --c-bg2: rgba(255,255,255,0.035);
    --c-bg3: rgba(255,255,255,0.06);
    --c-border: rgba(255,255,255,0.08);
    --c-border2: rgba(255,255,255,0.14);
    --c-text: rgba(255,255,255,0.90);
    --c-text2: rgba(255,255,255,0.55);
    --c-text3: rgba(255,255,255,0.32);
    --c-blue: #3b82f6;
    --c-purple: #8b5cf6;
    --c-green: #10b981;
    --c-amber: #f59e0b;
    --c-red: #ef4444;
    --c-blue-dim: rgba(59,130,246,0.12);
    --c-purple-dim: rgba(139,92,246,0.12);
    --c-green-dim: rgba(16,185,129,0.12);
    --c-amber-dim: rgba(245,158,11,0.12);
    --c-red-dim: rgba(239,68,68,0.12);
    --r-sm: 10px;
    --r-md: 14px;
    --r-lg: 20px;
    --r-xl: 26px;
  }

  .rd-root { font-family: 'Space Grotesk', sans-serif; color: var(--c-text); background: transparent; }

  @keyframes spin      { to { transform: rotate(360deg); } }
  @keyframes fadeUp    { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideIn   { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }
  @keyframes shimmer   { from { background-position: -400px 0; } to { background-position: 400px 0; } }
  @keyframes pulse-ring { 0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); } 50% { box-shadow: 0 0 0 5px rgba(59,130,246,0.12); } }
  @keyframes countUp   { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }

  .rd-card { 
    background: var(--c-bg2); 
    border: 1px solid var(--c-border); 
    border-radius: var(--r-xl); 
    padding: 1.5rem;
    transition: border-color 0.2s;
  }
  .rd-card:hover { border-color: var(--c-border2); }

  .rd-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.65rem 1.25rem; border: none; border-radius: var(--r-md);
    font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 0.85rem;
    cursor: pointer; transition: all 0.15s ease; white-space: nowrap;
  }
  .rd-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .rd-btn:active { transform: scale(0.97); }
  .rd-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; filter: none; }

  .rd-btn-primary   { background: linear-gradient(135deg, var(--c-blue), var(--c-purple)); color: white; }
  .rd-btn-success   { background: linear-gradient(135deg, var(--c-green), var(--c-blue)); color: white; }
  .rd-btn-ghost     { background: var(--c-bg3); border: 1px solid var(--c-border); color: var(--c-text2); }
  .rd-btn-ghost:hover { color: var(--c-text); }
  .rd-btn-danger    { background: var(--c-red-dim); border: 1px solid rgba(239,68,68,0.2); color: #f87171; }

  .rd-input {
    width: 100%; padding: 0.7rem 0.9rem;
    background: rgba(0,0,0,0.25); border: 1px solid var(--c-border);
    border-radius: var(--r-sm); color: var(--c-text); font-size: 0.85rem;
    font-family: 'Space Grotesk', sans-serif; outline: none; resize: vertical;
    transition: border-color 0.15s;
  }
  .rd-input:focus { border-color: rgba(59,130,246,0.5); }
  .rd-input::placeholder { color: var(--c-text3); }

  .rd-label {
    font-size: 0.65rem; color: var(--c-text3); font-weight: 700;
    letter-spacing: 0.09em; text-transform: uppercase; margin-bottom: 0.4rem; display: block;
  }

  .badge { 
    display: inline-flex; align-items: center;
    padding: 0.18rem 0.55rem; border-radius: 999px;
    font-size: 0.7rem; font-weight: 600; margin-right: 0.3rem; margin-bottom: 0.3rem;
  }
  .badge-blue   { background: var(--c-blue-dim);   color: #93c5fd; border: 1px solid rgba(59,130,246,0.2); }
  .badge-green  { background: var(--c-green-dim);  color: #6ee7b7; border: 1px solid rgba(16,185,129,0.2); }
  .badge-red    { background: var(--c-red-dim);    color: #fca5a5; border: 1px solid rgba(239,68,68,0.2); }
  .badge-purple { background: var(--c-purple-dim); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.2); }
  .badge-amber  { background: var(--c-amber-dim);  color: #fde68a; border: 1px solid rgba(245,158,11,0.2); }

  .skeleton {
    background: linear-gradient(90deg, var(--c-bg2) 25%, rgba(255,255,255,0.06) 50%, var(--c-bg2) 75%);
    background-size: 400px 100%; animation: shimmer 1.5s infinite; border-radius: 6px;
  }

  .progress-bar-outer { height: 5px; background: rgba(255,255,255,0.07); border-radius: 999px; overflow: hidden; }
  .progress-bar-inner { height: 100%; border-radius: 999px; transition: width 1s cubic-bezier(0.34,1.56,0.64,1); }

  .rd-divider { height: 1px; background: var(--c-border); margin: 1rem 0; }

  .candidate-card { animation: fadeUp 0.3s ease both; }
  .candidate-card:nth-child(1) { animation-delay: 0.0s; }
  .candidate-card:nth-child(2) { animation-delay: 0.05s; }
  .candidate-card:nth-child(3) { animation-delay: 0.1s; }
  .candidate-card:nth-child(4) { animation-delay: 0.15s; }
  .candidate-card:nth-child(5) { animation-delay: 0.2s; }

  .decision-pill {
    padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.68rem; font-weight: 700;
  }
  .dp-shortlist { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
  .dp-hold      { background: rgba(245,158,11,0.15);  color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
  .dp-reject    { background: rgba(239,68,68,0.15);   color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
  .dp-pending   { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.12); }

  .expand-section { animation: fadeUp 0.25s ease; }
  .chat-section   { animation: fadeUp 0.2s ease; }

  .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
  .spinner-blue { border-color: rgba(59,130,246,0.3); border-top-color: var(--c-blue); }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Spinner({ color }) {
  return <span className={`spinner ${color ? `spinner-${color}` : ''}`} />;
}

function ScoreBar({ label, value, color, note }) {
  const v = Math.round(Math.min(100, Math.max(0, value ?? 0)));
  const colorMap = { blue: '#3b82f6', purple: '#8b5cf6', green: '#10b981', amber: '#f59e0b' };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div style={{ marginBottom: '0.7rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--c-text2)' }}>
          {label}
          {note && <span style={{ marginLeft: '0.35rem', fontSize: '0.68rem', color: 'var(--c-text3)' }}>({note})</span>}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c, fontFamily: "'DM Mono', monospace" }}>{v}</span>
      </div>
      <div className="progress-bar-outer">
        <div className="progress-bar-inner" style={{ width: `${v}%`, background: c }} />
      </div>
    </div>
  );
}

function Avatar({ name, size = 44 }) {
  const palettes = [
    ['#3b82f6','#6366f1'], ['#8b5cf6','#ec4899'], ['#10b981','#3b82f6'],
    ['#f59e0b','#ef4444'], ['#06b6d4','#3b82f6'], ['#f43f5e','#8b5cf6'],
  ];
  const [c1, c2] = palettes[name.charCodeAt(0) % palettes.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: 'white',
      boxShadow: `0 0 0 2px rgba(255,255,255,0.06)`,
    }}>
      {name.charAt(0)}
    </div>
  );
}

function DecisionPill({ decision }) {
  const cls = { Shortlist: 'dp-shortlist', Hold: 'dp-hold', Reject: 'dp-reject', Pending: 'dp-pending' };
  const icon = { Shortlist: '✓', Hold: '◷', Reject: '✕', Pending: '—' };
  const d = decision || 'Pending';
  return <span className={`decision-pill ${cls[d] || 'dp-pending'}`}>{icon[d] || '—'} {d}</span>;
}

// ─── Score breakdown panel ────────────────────────────────────────────────────
function BreakdownPanel({ breakdown, candidate }) {
  if (!breakdown) return null;
  const {
    skills_score = 0, fuzzy_skill_score = 0, lsa_score = 0,
    required_pct = 0, nth_pct = 0, extra_bonus = 0,
    experience_score = 0, location_score = 0,
  } = breakdown;

  return (
    <div className="expand-section" style={{ marginTop: '1.25rem' }}>
      <div className="rd-divider" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <div className="rd-label" style={{ marginBottom: '0.85rem' }}>Component Scores</div>
          <ScoreBar label="Skills" value={skills_score} color="blue" note="60% weight" />
          <ScoreBar label="Experience" value={experience_score} color="purple" note="25% weight" />
          <ScoreBar label="Location" value={location_score} color="green" note="15% weight" />
        </div>
        <div>
          <div className="rd-label" style={{ marginBottom: '0.85rem' }}>Skills Breakdown</div>
          <ScoreBar label="Required coverage" value={required_pct} color="blue" note="75% of skills" />
          <ScoreBar label="Nice-to-have" value={nth_pct} color="purple" note="15% of skills" />
          <ScoreBar label="Fuzzy + alias" value={fuzzy_skill_score} color="green" />
          <ScoreBar label="Semantic (LSA)" value={lsa_score} color="amber" note="25% of skills" />
          {extra_bonus > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 600 }}>
              +{extra_bonus.toFixed(1)} breadth bonus (extra skills)
            </div>
          )}
        </div>
      </div>
      {(candidate?.notice_period || candidate?.bio) && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          {candidate.notice_period && (
            <p style={{ fontSize: '0.78rem', color: 'var(--c-text2)', marginBottom: candidate.bio ? '0.4rem' : 0 }}>
              Notice period: <strong style={{ color: 'var(--c-text)' }}>{candidate.notice_period}</strong>
            </p>
          )}
          {candidate.bio && (
            <p style={{ fontSize: '0.78rem', color: 'var(--c-text3)', fontStyle: 'italic', lineHeight: 1.55 }}>"{candidate.bio}"</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Candidate Card ───────────────────────────────────────────────────────────
function CandidateCard({ result, parsedJd, index }) {
  const [expanded, setExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const { candidate, match_score, interest_score, final_score, rank, explanation, matched_skills, missing_skills, score_breakdown, chat_summary } = result;
  const decision = chat_summary?.final_decision || 'Pending';

  const rankGradients = [
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #94a3b8, #cbd5e1)',
    'linear-gradient(135deg, #92400e, #b45309)',
  ];
  const rankEmoji = ['🥇', '🥈', '🥉'];
  const rankBorderColors = ['rgba(245,158,11,0.35)', 'rgba(148,163,184,0.2)', 'rgba(146,64,14,0.25)'];

  return (
    <div className="candidate-card rd-card" style={{
      marginBottom: '0.85rem',
      borderLeft: `3px solid ${rankBorderColors[rank - 1] || 'var(--c-border)'}`,
      borderRadius: '20px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
        {/* Rank + Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: rankGradients[rank - 1] || 'var(--c-bg3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 800, color: 'white',
            fontFamily: "'DM Mono', monospace",
          }}>
            {rank <= 3 ? rankEmoji[rank - 1] : `#${rank}`}
          </div>
          <Avatar name={candidate.name} size={40} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{candidate.name}</h3>
            <DecisionPill decision={decision} />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--c-text2)', marginBottom: '0.6rem' }}>
            {candidate.current_role || 'Candidate'}
            {' · '}{candidate.location}
            {' · '}{candidate.experience_years}y exp
            {' · '}{candidate.expected_salary}
          </p>
          {/* Skill badges */}
          <div>
            {(matched_skills?.length ? matched_skills : candidate.skills?.slice(0, 5) ?? []).map((s, i) => (
              <span key={i} className="badge badge-green">{s}</span>
            ))}
            {(missing_skills ?? []).slice(0, 3).map((s, i) => (
              <span key={i} className="badge badge-red">✗ {s}</span>
            ))}
          </div>
        </div>

        {/* Score rings */}
        <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
          <ScoreRing score={match_score} label="Match" type="match" size={64} stroke={5} />
          <ScoreRing score={interest_score} label="Interest" type="interest" size={64} stroke={5} />
          <ScoreRing score={final_score} label="Final" type="final" size={64} stroke={5} />
        </div>
      </div>

      {/* AI Explanation */}
      <div style={{
        marginTop: '0.9rem', padding: '0.7rem 0.85rem',
        background: 'rgba(0,0,0,0.25)', borderRadius: '10px',
        fontSize: '0.8rem', color: 'var(--c-text2)', lineHeight: 1.6,
        borderLeft: '2px solid rgba(59,130,246,0.35)',
      }}>
        <span style={{ color: 'var(--c-blue)', fontWeight: 600, marginRight: '0.35rem' }}>AI:</span>
        {explanation}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
        <button className="rd-btn rd-btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          onClick={() => setExpanded(e => !e)}>
          {expanded ? '↑ Hide breakdown' : '↓ Score breakdown'}
        </button>
        <button
          className={`rd-btn ${chatOpen ? 'rd-btn-ghost' : 'rd-btn-primary'}`}
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
          onClick={() => setChatOpen(o => !o)}>
          {chatOpen ? '✕ Close chat' : '💬 Engage candidate'}
        </button>
        {candidate.portfolio_url && (
          <a href={candidate.portfolio_url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--c-text3)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', padding: '0.4rem 0.6rem' }}>
            🔗 Portfolio →
          </a>
        )}
      </div>

      {expanded && <BreakdownPanel breakdown={score_breakdown} candidate={candidate} />}

      {chatOpen && (
        <div className="chat-section" style={{ marginTop: '1rem' }}>
          <div className="rd-divider" />
          <ChatUI candidateId={candidate._id} role={parsedJd?.role || ''} parsedJd={parsedJd} />
        </div>
      )}
    </div>
  );
}

// ─── JD Parsed Preview ────────────────────────────────────────────────────────
function ParsedJDCard({ parsedJd, onFindCandidates, loadingMatch }) {
  return (
    <div className="rd-card" style={{ borderColor: 'rgba(16,185,129,0.25)', animation: 'fadeUp 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-green)', animation: 'pulse-ring 2s infinite' }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--c-green)' }}>JD Parsed Successfully</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.1rem' }}>
        {[
          ['Role', parsedJd.role],
          ['Experience', `${parsedJd.experience_years}+ yrs required`],
          parsedJd.location && ['Location', parsedJd.location],
          parsedJd.salary_range && ['Salary', parsedJd.salary_range],
        ].filter(Boolean).map(([k, v]) => (
          <div key={k} style={{ padding: '0.6rem 0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
            <div className="rd-label" style={{ marginBottom: '0.2rem' }}>{k}</div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '0.85rem' }}>
        <div className="rd-label">Required Skills</div>
        <div>{parsedJd.skills.map((s, i) => <span key={i} className="badge badge-blue">{s}</span>)}</div>
      </div>

      {parsedJd.nice_to_have?.length > 0 && (
        <div style={{ marginBottom: '0.85rem' }}>
          <div className="rd-label">Nice to Have</div>
          <div>{parsedJd.nice_to_have.map((s, i) => <span key={i} className="badge badge-purple">{s}</span>)}</div>
        </div>
      )}

      {parsedJd.responsibilities?.length > 0 && (
        <div style={{ marginBottom: '1.1rem' }}>
          <div className="rd-label">Responsibilities</div>
          {parsedJd.responsibilities.slice(0, 3).map((r, i) => (
            <div key={i} style={{ fontSize: '0.8rem', color: 'var(--c-text2)', marginBottom: '0.25rem', paddingLeft: '0.75rem', borderLeft: '2px solid var(--c-border)' }}>
              {r}
            </div>
          ))}
        </div>
      )}

      <button onClick={onFindCandidates} disabled={loadingMatch} className="rd-btn rd-btn-success" style={{ width: '100%', padding: '0.75rem' }}>
        {loadingMatch ? <><Spinner />Scanning candidates...</> : '🔍 Find & Rank Top Candidates'}
      </button>
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ icon, label, value, color }) {
  return (
    <div style={{
      flex: 1, padding: '0.85rem', background: 'var(--c-bg2)', borderRadius: '14px',
      border: '1px solid var(--c-border)', textAlign: 'center',
      animation: 'countUp 0.4s ease',
    }}>
      <div style={{ fontSize: '1.25rem', marginBottom: '0.3rem' }}>{icon}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'DM Mono', monospace", color: color || 'white' }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--c-text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '0.2rem' }}>{label}</div>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rd-card" style={{ marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', gap: '0.9rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '55%', height: 18, marginBottom: '0.4rem' }} />
          <div className="skeleton" style={{ width: '80%', height: 13, marginBottom: '0.6rem' }} />
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[60, 80, 70].map((w, i) => <div key={i} className="skeleton" style={{ width: w, height: 22, borderRadius: 999 }} />)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />)}
        </div>
      </div>
      <div className="skeleton" style={{ height: 50, marginTop: '0.9rem', borderRadius: 10 }} />
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const SAMPLE_JD = `Senior Full-Stack Engineer

We are looking for a Senior Full-Stack Engineer with strong experience in Python (FastAPI or Django) and React. The ideal candidate has 3+ years of experience building production-grade web applications, is comfortable with MongoDB or PostgreSQL, and has exposure to Docker and CI/CD pipelines.

Responsibilities:
- Design and build RESTful APIs using Python/FastAPI
- Build responsive UIs with React and TypeScript
- Own the end-to-end deployment lifecycle

Location: Remote-friendly
Salary: $120k–$150k`;

export default function RecruiterDashboard() {
  const [jdText, setJdText] = useState('');
  const [parsedJd, setParsedJd] = useState(null);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState('');
  const [loadingJd, setLoadingJd] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [error, setError] = useState('');

  const handleParseJD = useCallback(async () => {
    if (!jdText.trim()) return;
    setLoadingJd(true); setError(''); setParsedJd(null); setResults([]); setSummary('');
    try {
      const res = await axios.post(`${API}/api/upload-jd`, { jd_text: jdText });
      setParsedJd(res.data.parsed_jd);
    } catch { setError('Failed to parse JD. Check if the backend is running on port 8000.'); }
    setLoadingJd(false);
  }, [jdText]);

  const handleFindCandidates = useCallback(async () => {
    if (!parsedJd) return;
    setLoadingMatch(true); setError(''); setResults([]); setSummary('');
    try {
      const res = await axios.post(`${API}/api/match`, parsedJd);
      setResults(res.data.results ?? []);
      setSummary(res.data.summary ?? '');
    } catch { setError('Matching failed. Please try again.'); }
    setLoadingMatch(false);
  }, [parsedJd]);

  const avgMatch = results.length ? Math.round(results.reduce((s, r) => s + r.match_score, 0) / results.length) : 0;
  const shortlisted = results.filter(r => r.chat_summary?.final_decision === 'Shortlist').length;

  return (
    <div className="rd-root">
      <style>{GLOBAL_CSS}</style>

      {/* Page header */}
      <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.9rem', background: 'rgba(59,130,246,0.1)', borderRadius: '999px', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '0.85rem' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: 'pulse-ring 2s infinite' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI-Powered Recruiting</span>
        </div>
        <h1 style={{
          fontSize: '2.4rem', fontWeight: 700, lineHeight: 1.15, marginBottom: '0.6rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #93c5fd 50%, #c4b5fd 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Talent Scouting Agent
        </h1>
        <p style={{ color: 'var(--c-text2)', fontSize: '0.9rem', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
          Paste a job description → AI parses requirements → Ranks candidates by skill, experience & engagement
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* ── LEFT PANEL ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', position: 'sticky', top: 20 }}>

          {/* JD input */}
          <div className="rd-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--c-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📄</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Job Description</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--c-text3)' }}>Paste JD for AI analysis</div>
              </div>
            </div>

            <textarea
              rows={10} value={jdText} onChange={e => setJdText(e.target.value)}
              placeholder="Paste your full job description here…"
              className="rd-input"
              style={{ minHeight: '200px', marginBottom: '0.75rem' }}
            />

            {!jdText.trim() && (
              <button onClick={() => setJdText(SAMPLE_JD)} className="rd-btn rd-btn-ghost" style={{ width: '100%', marginBottom: '0.6rem', fontSize: '0.8rem' }}>
                ✨ Load sample JD
              </button>
            )}

            <button onClick={handleParseJD} disabled={loadingJd || !jdText.trim()} className="rd-btn rd-btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              {loadingJd ? <><Spinner />Parsing with AI…</> : '🧠 Parse JD with AI'}
            </button>

            {error && (
              <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'var(--c-red-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#fca5a5', fontSize: '0.8rem' }}>
                {error}
              </div>
            )}
          </div>

          {/* Parsed JD preview */}
          {parsedJd && <ParsedJDCard parsedJd={parsedJd} onFindCandidates={handleFindCandidates} loadingMatch={loadingMatch} />}

          {/* Scoring legend */}
          <div className="rd-card" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--c-text2)' }}>📊 Scoring Formula</div>
            {[
              { label: 'Skills (60%)', note: 'Fuzzy + alias matching, LSA semantic, nice-to-have, breadth bonus', color: '#93c5fd' },
              { label: 'Experience (25%)', note: 'Smooth S-curve — no hard cliffs', color: '#c4b5fd' },
              { label: 'Location (15%)', note: 'Remote / city / country token matching', color: '#6ee7b7' },
            ].map(({ label, note, color }) => (
              <div key={label} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <div style={{ width: 3, borderRadius: 999, background: color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color }}>{label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--c-text3)', lineHeight: 1.5 }}>{note}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--c-text2)', fontFamily: "'DM Mono', monospace" }}>
              Final = 0.6 × Match + 0.4 × Interest
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div>
          {/* Stats row */}
          {results.length > 0 && (
            <div style={{ marginBottom: '1.1rem' }}>
              {summary && (
                <div style={{
                  marginBottom: '1.1rem', padding: '1rem 1.25rem',
                  background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)',
                  borderRadius: '16px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                  animation: 'fadeUp 0.3s ease',
                }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>✨</span>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>AI Recruiter Summary</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--c-text2)', lineHeight: 1.65 }}>{summary}</p>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.1rem' }}>
                <StatChip icon="👥" label="Candidates" value={results.length} />
                <StatChip icon="🎯" label="Avg Match" value={`${avgMatch}`} color="#93c5fd" />
                <StatChip icon="✅" label="Shortlisted" value={shortlisted} color="#6ee7b7" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>📋</span>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Ranked Shortlist</h2>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--c-text3)' }}>Sorted by Final Score ↓</span>
              </div>
            </div>
          )}

          {/* Loading skeletons */}
          {loadingMatch && (
            <div>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Results */}
          {!loadingMatch && results.map((result, idx) => (
            <CandidateCard key={result.candidate._id || idx} result={result} parsedJd={parsedJd} index={idx} />
          ))}

          {/* Empty states */}
          {!results.length && !loadingMatch && parsedJd && !loadingMatch && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--c-text3)', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🎯</div>
              <p style={{ fontSize: '0.9rem' }}>Click "Find & Rank Top Candidates" to discover matches.</p>
            </div>
          )}

          {!parsedJd && !loadingJd && (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--c-text3)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.25rem', opacity: 0.35 }}>🤖</div>
              <h3 style={{ color: 'var(--c-text2)', fontSize: '1.1rem', marginBottom: '0.6rem', fontWeight: 600 }}>Start with a Job Description</h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>
                Paste a job description on the left. The AI will parse requirements, extract skills, and discover your best-matched candidates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}