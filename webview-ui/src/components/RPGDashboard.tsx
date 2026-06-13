import React, { useState } from 'react';
import { PlayerState, Feature } from '../types';
import { FlameIcon, TrophyIcon, ShieldIcon, SwordIcon, LockIcon } from './Icons';
import { getLevelInfo } from '../xp_system';

interface RPGDashboardProps {
  state: PlayerState;
  isAnalyzing: boolean;
  activeFeatureId: string | null;
  setActiveFeatureId: (fid: string) => void;
  triggerAnalysis: () => void;
  apiMode: string;
}

export default function RPGDashboard({
  state,
  isAnalyzing,
  activeFeatureId,
  setActiveFeatureId,
  triggerAnalysis,
  apiMode
}: RPGDashboardProps) {
  const [logicExpanded, setLogicExpanded] = useState<Record<string, boolean>>({});

  const features = Object.values(state.features);
  
  // Calculate average overall understanding
  const avgUnderstanding = features.length > 0
    ? Math.round(features.reduce((acc, f) => acc + (f.understandingScore?.overall || 0), 0) / features.length)
    : 0;

  // Get level information
  const levelInfo = getLevelInfo(state.xp);
  const xpPercent = levelInfo.percent;

  const toggleLogic = (fid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLogicExpanded({
      ...logicExpanded,
      [fid]: !logicExpanded[fid]
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
      
      {/* RPG Profile Badge Header */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'glow-pulse 4s infinite' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrophyIcon className="text-warning" size={18} />
            <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
              {levelInfo.title.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="text-warning">
            <FlameIcon size={16} />
            <span style={{ fontWeight: 'bold', fontSize: '11px' }}>
              {state.streak} DAY STREAK ({state.streakData?.daily_completed_today || 0}/{state.streakData?.daily_goal || 3} Daily)
            </span>
          </div>
        </div>

        {/* Level and XP Meter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
          <div 
            className="flex-center" 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '4px', 
              backgroundColor: 'var(--accent-color)', 
              fontWeight: 'bold', 
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              border: '1px solid #9e93ff'
            }}
            title={`Detective Level ${levelInfo.level}`}
          >
            L{levelInfo.level}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px', fontFamily: 'var(--font-mono)' }} className="text-muted">
              <span>Intel: {levelInfo.xpNeededForNext > 0 ? `${levelInfo.xpInLevel}/${levelInfo.xpNeededForNext} IP` : 'MAX LEVEL'}</span>
              <span>{xpPercent}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${xpPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Global Mastery Stat */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '2px' }}>
          <span className="text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldIcon size={12} /> Global Intelligence Score:
          </span>
          <span className={avgUnderstanding >= 80 ? "text-success" : avgUnderstanding >= 40 ? "text-warning" : "text-accent"} style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
            {avgUnderstanding}%
          </span>
        </div>
      </div>

      {/* Main Quests / Features List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }} className="text-muted">CASE DOSSIERS</h3>
          <span className="badge badge-indigo" style={{ textTransform: 'uppercase', fontSize: '8px' }}>
            {apiMode}
          </span>
        </div>

        {features.map((feat) => {
          const isActive = feat.id === activeFeatureId;
          const scores = feat.understandingScore;
          const overall = scores?.overall || 0;
          const archScore = scores?.architecture || 0;
          const sysScore = scores?.system_logic || 0;
          const fileScore = scores?.file_logic || 0;
          const fnScore = scores?.function_logic || 0;
          const syntaxScore = scores?.syntax || 0;
          const engScore = scores?.engineering_decisions || 0;
          
          const isExpanded = !!logicExpanded[feat.id];

          return (
            <div 
              key={feat.id} 
              className="card" 
              onClick={() => setActiveFeatureId(feat.id)}
              style={{ 
                cursor: 'pointer',
                borderColor: isActive ? 'var(--accent-color)' : 'var(--border-color)',
                backgroundColor: isActive ? 'rgba(20, 20, 24, 0.5)' : 'var(--surface-color)',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: isActive ? 'var(--text-primary)' : '#e2dfeb' }}>
                  {feat.name}
                </h4>
                <span 
                  className={`badge ${overall >= 80 ? 'badge-emerald' : overall >= 40 ? 'badge-amber' : 'badge-indigo'}`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {overall}% DECRYPTED
                </span>
              </div>
              <p className="text-muted" style={{ fontSize: '11px', margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {feat.description}
              </p>

              {/* Progress visualizer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="text-muted" style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}>Decryption:</span>
                <div className="progress-bar-container" style={{ height: '6px' }}>
                  <div 
                    className={`progress-bar-fill ${overall >= 80 ? 'success' : ''}`} 
                    style={{ width: `${overall}%` }}
                  ></div>
                </div>
              </div>

              {/* Collapsible Sub-pillar Details (Visible on active selection) */}
              {isActive && (
                <div 
                  style={{ 
                    marginTop: '4px', 
                    borderTop: '1px solid var(--border-color)', 
                    paddingTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '10px'
                  }}
                >
                  {/* Pillar 1: Architecture */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Sector 1: System Architecture</span>
                    <span className="text-success" style={{ fontFamily: 'var(--font-mono)' }}>{archScore}%</span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '4px' }}>
                    <div className="progress-bar-fill success" style={{ width: `${archScore}%` }}></div>
                  </div>

                  {/* Pillar 2: Collapsible Logic sub-pillars */}
                  <div 
                    onClick={(e) => toggleLogic(feat.id, e)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span>Sector 2: System Logic & Causality</span>
                    <span style={{ fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span className="text-accent">{Math.round((sysScore + fileScore + fnScore) / 3)}%</span>
                      <span>{isExpanded ? '▼' : '▶'}</span>
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: '1px solid var(--border-color)' }}>
                      {/* System logic */}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="text-muted">
                        <span>• User Workflows</span>
                        <span>{sysScore}%</span>
                      </div>
                      <div className="progress-bar-container" style={{ height: '3px' }}>
                        <div className="progress-bar-fill" style={{ width: `${sysScore}%` }}></div>
                      </div>
                      {/* File logic */}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="text-muted">
                        <span>• File Interactions</span>
                        <span>{fileScore}%</span>
                      </div>
                      <div className="progress-bar-container" style={{ height: '3px' }}>
                        <div className="progress-bar-fill" style={{ width: `${fileScore}%` }}></div>
                      </div>
                      {/* Function logic */}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="text-muted">
                        <span>• Function Execution</span>
                        <span>{fnScore}%</span>
                      </div>
                      <div className="progress-bar-container" style={{ height: '3px' }}>
                        <div className="progress-bar-fill" style={{ width: `${fnScore}%` }}></div>
                      </div>
                    </div>
                  )}

                  {/* Sector 3: Code Syntax */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Sector 3: Code Syntax</span>
                    <span className="text-success" style={{ fontFamily: 'var(--font-mono)' }}>{syntaxScore}%</span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '4px' }}>
                    <div className="progress-bar-fill success" style={{ width: `${syntaxScore}%` }}></div>
                  </div>

                  {/* Sector 4: Engineering Decisions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Sector 4: Engineering Decisions</span>
                    <span className="text-success" style={{ fontFamily: 'var(--font-mono)' }}>{engScore}%</span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '4px' }}>
                    <div className="progress-bar-fill success" style={{ width: `${engScore}%` }}></div>
                  </div>

                  {/* Sector 5: Core Concepts */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Sector 5: Core Concepts</span>
                    <span className="text-success" style={{ fontFamily: 'var(--font-mono)' }}>{scores?.concepts || 0}%</span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '4px' }}>
                    <div className="progress-bar-fill success" style={{ width: `${scores?.concepts || 0}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual scan button */}
      <button 
        className="btn btn-primary" 
        onClick={triggerAnalysis}
        disabled={isAnalyzing}
        style={{ padding: '10px 12px', marginTop: 'auto' }}
      >
        {isAnalyzing ? (
          <>
            <svg className="spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '6px' }}>
              <circle cx="12" cy="12" r="10" opacity="0.25"/>
              <path d="M4 12a8 8 0 018-8" />
            </svg>
            Re-Decrypting Case Files...
          </>
        ) : (
          <>
            <SwordIcon size={14} style={{ marginRight: '4px' }} />
            Re-Decrypt Codebase Files
          </>
        )}
      </button>
    </div>
  );
}
