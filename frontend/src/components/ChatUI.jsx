import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
`;

export default function ChatUI({ candidateId, role, parsedJd }) {
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat?.messages]);
  useEffect(() => { fetchChat(); }, [candidateId]);

  const fetchChat = async () => {
    try {
      const res = await axios.get(`${API}/api/chat/${candidateId}`);
      if (res.data?.messages?.length > 0) setChat(res.data);
      else setChat(null);
    } catch (err) { console.error(err); }
  };

  const initChat = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/api/chat/init`, {
        candidate_id: candidateId, role, jd_context: parsedJd || null
      });
      setChat(res.data.chat);
    } catch { setError('Failed to initiate conversation.'); }
    setLoading(false);
  };

  const simulateReply = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API}/api/chat/simulate`, { candidate_id: candidateId, role: role || '' });
      if (res.data.chat) setChat(res.data.chat);
    } catch { setError('Simulation failed.'); }
    setSimulating(false);
  };

  const resetChat = async () => {
    if (!window.confirm('Reset this chat session?')) return;
    try { await axios.delete(`${API}/api/chat/${candidateId}`); setChat(null); }
    catch { setError('Reset failed.'); }
  };

  if (!chat || !chat.messages || chat.messages.length === 0) {
    return (
      <div style={{
        padding: '2rem', background: 'rgba(255,255,255,0.03)',
        borderRadius: '16px', textAlign: 'center',
        border: '1px dashed rgba(255,255,255,0.1)',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💬</div>
        <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '1.25rem', fontSize: '0.82rem', lineHeight: 1.6 }}>
          No conversation started yet. Send an AI-crafted outreach message to engage this candidate.
        </p>
        {error && (
          <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', borderRadius: '8px', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}
        <button onClick={initChat} disabled={loading} style={{
          padding: '0.65rem 1.5rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600,
          fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto',
        }}>
          {loading ? (
            <><span style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Generating...</>
          ) : '✉️ Send AI Outreach'}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const summary = chat.summary;
  const decision = summary?.final_decision || 'Pending';
  const decisionColors = {
    Shortlist: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
    Hold: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
    Reject: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
    Pending: { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.1)' },
  };
  const dc = decisionColors[decision] || decisionColors.Pending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .msg-bubble { animation: fadeUp 0.25s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Conversation Thread
        </span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={fetchChat} title="Refresh" style={{ padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem' }}>↻</button>
          <button onClick={resetChat} title="Reset" style={{ padding: '0.3rem 0.6rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}>✕ Reset</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.75rem',
        background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {chat.messages.map((msg, idx) => (
          <div key={idx} className="msg-bubble" style={{
            alignSelf: msg.sender === 'recruiter' ? 'flex-start' : 'flex-end',
            maxWidth: '82%',
          }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.2rem', textAlign: msg.sender === 'recruiter' ? 'left' : 'right' }}>
              {msg.sender === 'recruiter' ? '🤖 AI Recruiter' : '👤 Candidate'}
            </div>
            <div style={{
              padding: '0.6rem 0.9rem',
              background: msg.sender === 'recruiter' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)',
              borderRadius: msg.sender === 'recruiter' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
              border: `1px solid ${msg.sender === 'recruiter' ? 'rgba(59,130,246,0.25)' : 'rgba(139,92,246,0.25)'}`,
              fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Simulate */}
      <button onClick={simulateReply} disabled={simulating} style={{
        width: '100%', padding: '0.6rem', background: 'rgba(139,92,246,0.1)',
        border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px',
        color: '#c4b5fd', cursor: simulating ? 'not-allowed' : 'pointer',
        fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontFamily: 'inherit',
        opacity: simulating ? 0.7 : 1,
      }}>
        {simulating ? <><span style={{ width: 13, height: 13, border: '2px solid #c4b5fd', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Simulating...</> : '⚡ Simulate Candidate Reply'}
      </button>

      {error && <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', borderRadius: '8px', fontSize: '0.78rem' }}>{error}</div>}

      {/* AI Summary */}
      {summary && (
        <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.06em', textTransform: 'uppercase' }}>🧠 AI Analysis</span>
            <span style={{ padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: dc.bg, color: dc.color, border: `1px solid ${dc.border}` }}>
              {decision}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.15rem', letterSpacing: '0.08em' }}>INTEREST</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: summary.interest_score >= 70 ? '#34d399' : summary.interest_score >= 45 ? '#fbbf24' : '#f87171', fontFamily: "'DM Mono', monospace" }}>
                {Math.round(summary.interest_score ?? 0)}<span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>/100</span>
              </div>
            </div>
            {summary.availability && (
              <div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.15rem', letterSpacing: '0.08em' }}>AVAILABILITY</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{summary.availability}</div>
              </div>
            )}
            {summary.salary_aligned !== undefined && summary.salary_aligned !== null && (
              <div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.15rem', letterSpacing: '0.08em' }}>SALARY</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: summary.salary_aligned ? '#34d399' : '#f87171' }}>
                  {summary.salary_aligned ? '✓ Aligned' : '✗ Mismatch'}
                </div>
              </div>
            )}
          </div>

          {summary.key_points?.length > 0 && (
            <div style={{ marginBottom: '0.6rem' }}>
              {summary.key_points.map((pt, i) => (
                <div key={i} style={{ fontSize: '0.78rem', color: '#86efac', marginBottom: '0.2rem' }}>✓ {pt}</div>
              ))}
            </div>
          )}
          {summary.concerns?.length > 0 && (
            <div style={{ marginBottom: '0.6rem' }}>
              {summary.concerns.map((c, i) => (
                <div key={i} style={{ fontSize: '0.78rem', color: '#fca5a5', marginBottom: '0.2rem' }}>⚠ {c}</div>
              ))}
            </div>
          )}
          {summary.recruiter_tip && (
            <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', fontSize: '0.78rem', color: '#93c5fd', borderLeft: '2px solid rgba(59,130,246,0.5)' }}>
              💡 <strong>Next step:</strong> {summary.recruiter_tip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}