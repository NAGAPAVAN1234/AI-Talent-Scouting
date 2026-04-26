import React, { useState, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
  .msg-in  { animation: fadeUp 0.2s ease; }
  .portal-btn:hover  { filter: brightness(1.08); transform: translateY(-1px); }
  .portal-btn:active { transform: scale(0.98); }
  .tab-btn:hover { background: rgba(255,255,255,0.07) !important; }
  .chat-msg-in { border-radius: 4px 14px 14px 14px; }
  .chat-msg-out { border-radius: 14px 4px 14px 14px; align-self: flex-end !important; }
`;

function Avatar({ name, size = 52 }) {
  const colors = [
    ['#6366f1','#4f46e5'], ['#8b5cf6','#7c3aed'],
    ['#3b82f6','#2563eb'], ['#10b981','#059669'],
    ['#f59e0b','#d97706'], ['#ef4444','#dc2626'],
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const [c1, c2] = colors[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: 'white', flexShrink: 0,
      boxShadow: `0 0 0 3px rgba(255,255,255,0.08)`,
    }}>
      {name.charAt(0)}
    </div>
  );
}

function Badge({ children, color = '#3b82f6' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.18rem 0.55rem', borderRadius: '999px',
      background: `${color}20`, color, fontSize: '0.72rem', fontWeight: 600,
      border: `1px solid ${color}30`, marginRight: '0.3rem', marginBottom: '0.3rem',
    }}>
      {children}
    </span>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{icon}</span>
      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', width: 80, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function ProfileCard({ candidate, onLogout }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: '20px', padding: '1.75rem', height: 'fit-content',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <Avatar name={candidate.name} size={56} />
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.15rem' }}>{candidate.name}</h2>
          {candidate.current_role && (
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{candidate.current_role}</p>
          )}
        </div>
      </div>

      {candidate.bio && (
        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginBottom: '1rem', lineHeight: 1.55, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
          "{candidate.bio}"
        </div>
      )}

      <div style={{ marginBottom: '1.25rem' }}>
        <InfoRow icon="📍" label="Location" value={candidate.location} />
        <InfoRow icon="🗓" label="Exp." value={`${candidate.experience_years} years`} />
        <InfoRow icon="💰" label="Expected" value={candidate.expected_salary} />
        <InfoRow icon="⏱" label="Notice" value={candidate.notice_period} />
        {candidate.education && <InfoRow icon="🎓" label="Education" value={candidate.education} />}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Skills</div>
        <div>{candidate.skills.map((s, i) => <Badge key={i} color="#3b82f6">{s}</Badge>)}</div>
      </div>

      {candidate.portfolio_url && (
        <a href={candidate.portfolio_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', textDecoration: 'none', marginBottom: '1rem' }}>
          🔗 Portfolio →
        </a>
      )}

      <button onClick={onLogout} className="portal-btn" style={{
        width: '100%', padding: '0.6rem', background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px',
        color: '#f87171', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'all 0.15s ease',
      }}>
        Sign out
      </button>
    </div>
  );
}

function InboxPanel({ candidate }) {
  const [chat, setChat] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [msg, setMsg] = useState('');
  const messagesEndRef = useRef(null);

  React.useEffect(() => { fetchChat(); }, [candidate._id]);
  React.useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat?.messages]);

  const fetchChat = async () => {
    setFetching(true);
    try {
      const res = await axios.get(`${API}/api/chat/${candidate._id}`);
      if (res.data?.messages?.length > 0) setChat(res.data);
      else setChat(null);
    } catch { setMsg('Failed to load inbox.'); }
    setFetching(false);
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/chat/reply`, { candidate_id: candidate._id, text: replyText });
      setChat(res.data.chat);
      setReplyText('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { setMsg('Failed to send reply.'); }
    setLoading(false);
  };

  const decision = chat?.summary?.final_decision;
  const statusColors = {
    Shortlist: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: '🟢 Shortlisted' },
    Hold: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: '🟡 On hold' },
    Reject: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: '🔴 Not progressing' },
  };
  const sc = statusColors[decision];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: '20px', padding: '1.75rem', display: 'flex', flexDirection: 'column', minHeight: '540px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.15rem' }}>Recruiter Inbox</h2>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)' }}>Messages from hiring team</p>
        </div>
        <button onClick={fetchChat} disabled={fetching} style={{
          padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
          color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit',
          animation: fetching ? 'spin 0.7s linear infinite' : 'none',
        }}>
          ↻
        </button>
      </div>

      {msg && <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '0.75rem' }}>{msg}</div>}

      {!chat ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', textAlign: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '3rem', opacity: 0.4 }}>📭</div>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>No messages yet.</p>
          <p style={{ fontSize: '0.75rem', maxWidth: 280, opacity: 0.7 }}>
            Once a recruiter runs the matching engine and engages you, their messages will appear here.
          </p>
          <button onClick={fetchChat} className="portal-btn" style={{
            padding: '0.5rem 1.25rem', background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.25)', borderRadius: '8px',
            color: '#93c5fd', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}>
            Check for messages
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem',
            padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.75rem', maxHeight: '300px',
          }}>
            {chat.messages.map((m, idx) => (
              <div key={idx} className="msg-in" style={{ display: 'flex', flexDirection: 'column', alignSelf: m.sender === 'recruiter' ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.2rem', textAlign: m.sender === 'recruiter' ? 'left' : 'right' }}>
                  {m.sender === 'recruiter' ? '🤖 Recruiter AI' : '👤 You'}
                </div>
                <div className={m.sender === 'recruiter' ? 'chat-msg-in' : 'chat-msg-out'} style={{
                  padding: '0.6rem 0.9rem', fontSize: '0.82rem', lineHeight: 1.55,
                  background: m.sender === 'recruiter' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)',
                  border: `1px solid ${m.sender === 'recruiter' ? 'rgba(59,130,246,0.25)' : 'rgba(139,92,246,0.25)'}`,
                  color: 'rgba(255,255,255,0.85)',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply */}
          <form onSubmit={handleReply} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              style={{
                flex: 1, padding: '0.65rem 0.9rem',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px', color: 'white', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button type="submit" disabled={loading || !replyText.trim()} style={{
              padding: '0.65rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              border: 'none', borderRadius: '10px', color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', opacity: (loading || !replyText.trim()) ? 0.5 : 1,
            }}>
              {loading ? '...' : 'Send →'}
            </button>
          </form>

          {/* AI Status */}
          {sc && (
            <div style={{ padding: '0.65rem 0.85rem', background: sc.bg, borderRadius: '10px', fontSize: '0.78rem', color: sc.color, fontWeight: 600 }}>
              {sc.label} — AI has reviewed your conversation.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CandidatePortal() {
  const [activeTab, setActiveTab] = useState('login');
  const [candidate, setCandidate] = useState(null);
  const [loginName, setLoginName] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '', skills: '', experience_years: '', location: '',
    expected_salary: '', notice_period: '', email: '',
    current_role: '', education: '', bio: '', portfolio_url: '',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regMsg, setRegMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true); setLoginMsg('');
    try {
      const res = await axios.post(`${API}/api/login`, { name: loginName });
      setCandidate(res.data);
    } catch {
      setLoginMsg('Candidate not found. Try "Alice Johnson" or register a new profile.');
    }
    setLoginLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true); setRegMsg('');
    try {
      const payload = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        experience_years: parseFloat(formData.experience_years) || 0,
      };
      const res = await axios.post(`${API}/api/candidates`, payload);
      setCandidate(res.data);
    } catch { setRegMsg('Failed to create profile. Check all required fields.'); }
    setRegLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.85rem', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: 'white', fontSize: '0.83rem', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };
  const labelStyle = { fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' };

  if (candidate) {
    return (
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'white' }}>
        <style>{css}</style>
        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '0.35rem', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Candidate Dashboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            View recruiter messages and respond in real-time
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.25rem' }}>
          <ProfileCard candidate={candidate} onLogout={() => setCandidate(null)} />
          <InboxPanel candidate={candidate} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'white', maxWidth: '520px', margin: '0 auto' }}>
      <style>{css}</style>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👤</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.4rem', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Candidate Portal
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          Login or register to connect with AI-powered recruiters
        </p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: '1.75rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: '12px' }}>
          {['login', 'register'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setLoginMsg(''); setRegMsg(''); }} className="tab-btn"
              style={{
                flex: 1, padding: '0.6rem', border: 'none', borderRadius: '9px', cursor: 'pointer',
                background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.4)',
                fontWeight: activeTab === tab ? 600 : 400, fontSize: '0.85rem', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>
              {tab === 'login' ? '🔑 Login' : '✨ Register'}
            </button>
          ))}
        </div>

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loginMsg && <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid rgba(245,158,11,0.2)' }}>{loginMsg}</div>}
            <div>
              <label style={labelStyle}>Full Name</label>
              <input type="text" required value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="e.g. Alice Johnson" autoFocus style={inputStyle} />
            </div>
            <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(59,130,246,0.07)', borderRadius: '10px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(59,130,246,0.15)' }}>
              💡 Demo accounts: <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Alice Johnson, Charlie Davis, Diana Prince, Priya Sharma</strong>
            </div>
            <button type="submit" disabled={loginLoading || !loginName.trim()} className="portal-btn" style={{
              width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, fontSize: '0.9rem',
              cursor: loginLoading ? 'not-allowed' : 'pointer', opacity: loginLoading ? 0.7 : 1,
              fontFamily: 'inherit', transition: 'all 0.15s ease',
            }}>
              {loginLoading ? 'Logging in...' : 'Login to Inbox →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {regMsg && <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', borderRadius: '10px', fontSize: '0.8rem' }}>{regMsg}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[['name', 'Full Name *', 'text', 'Jane Doe'], ['email', 'Email', 'email', 'jane@email.com']].map(([key, label, type, ph]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} required={key === 'name'} value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Skills * (comma-separated)</label>
              <input type="text" required value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} placeholder="React, Python, Node.js, Docker" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[['experience_years', 'Experience (years) *', 'number', '3.5'], ['location', 'Location *', 'text', 'Remote / New York']].map(([key, label, type, ph]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} step={key === 'experience_years' ? '0.5' : undefined} required value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[['expected_salary', 'Expected Salary *', '$120k'], ['notice_period', 'Notice Period *', '30 days / Immediate']].map(([key, label, ph]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type="text" required value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Current Role</label>
              <input type="text" value={formData.current_role} onChange={e => setFormData({ ...formData, current_role: e.target.value })} placeholder="Senior Engineer at Acme Corp" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[['education', 'Education', 'B.S. Computer Science, MIT'], ['portfolio_url', 'Portfolio URL', 'https://yoursite.dev']].map(([key, label, ph]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type="text" value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Short Bio</label>
              <textarea rows={2} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="A quick summary of your background and what you're looking for..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
            <button type="submit" disabled={regLoading} className="portal-btn" style={{
              width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, fontSize: '0.9rem',
              cursor: regLoading ? 'not-allowed' : 'pointer', opacity: regLoading ? 0.7 : 1,
              fontFamily: 'inherit', transition: 'all 0.15s ease',
            }}>
              {regLoading ? 'Creating profile...' : '✓ Create My Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}