import React, { useState } from 'react';
import RecruiterDashboard from './pages/RecruiterDashboard';
import CandidatePortal from './pages/CandidatePortal';
import './index.css';

export default function App() {
  const [tab, setTab] = useState('recruiter');

  const tabs = [
    { id: 'recruiter', label: '🤖 Recruiter', title: 'Recruiter Dashboard' },
    { id: 'candidate', label: '👤 Candidate', title: 'Candidate Portal' },
  ];

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="nav-logo">⚡ TalentAI</div>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            padding: '0.25rem 0.75rem',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '999px',
            fontSize: '0.7rem',
            color: '#34d399',
            fontWeight: 600,
          }}>
            ● Live
          </div>
        </div>
      </nav>

      <div className="page-content">
        {tab === 'recruiter' && <RecruiterDashboard />}
        {tab === 'candidate' && <CandidatePortal />}
      </div>
    </div>
  );
}