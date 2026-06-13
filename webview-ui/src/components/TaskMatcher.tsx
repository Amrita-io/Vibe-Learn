import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskMatcherProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskMatcher({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskMatcherProps) {
  const items = content.matchingItems || [];
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // compId -> respId
  const [shuffledResps, setShuffledResps] = useState<typeof items>([]);

  // Shuffle responsibilities once on load
  useEffect(() => {
    const resps = [...items].sort(() => Math.random() - 0.5);
    setShuffledResps(resps);
    
    if (isCompleted) {
      const correctMatches: Record<string, string> = {};
      items.forEach(item => {
        correctMatches[item.id] = item.id;
      });
      setMatches(correctMatches);
    } else {
      setMatches({});
    }
  }, [content, isCompleted]);

  const handleComponentClick = (compId: string) => {
    if (isCompleted) return;
    setSelectedCompId(compId === selectedCompId ? null : compId);
  };

  const handleResponsibilityClick = (respId: string) => {
    if (isCompleted || !selectedCompId) return;
    
    // Bind match
    setMatches({
      ...matches,
      [selectedCompId]: respId
    });
    setSelectedCompId(null);
  };

  const handleClear = () => {
    if (isCompleted) return;
    setMatches({});
    setSelectedCompId(null);
  };

  const handleSubmit = () => {
    onSubmit({ matches });
  };

  // Find index of match to display indicator numbers (e.g. 1, 2, 3)
  const getMatchIndex = (compId: string) => {
    const matchedRespId = matches[compId];
    if (!matchedRespId) return null;
    return Object.keys(matches).indexOf(compId) + 1;
  };

  const getRespMatchIndex = (respId: string) => {
    const compId = Object.keys(matches).find(k => matches[k] === respId);
    if (!compId) return null;
    return getMatchIndex(compId);
  };

  const allMatched = Object.keys(matches).length === items.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px' }}>
        
        {/* Components Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold' }}>COMPONENTS</span>
          {items.map((item) => {
            const isSelected = selectedCompId === item.id;
            const matchIdx = getMatchIndex(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleComponentClick(item.id)}
                className="draggable-item"
                style={{
                  margin: 0,
                  fontSize: '10px',
                  borderColor: isSelected 
                    ? 'var(--accent-color)' 
                    : matchIdx 
                      ? 'var(--success-color)' 
                      : 'var(--border-color)',
                  backgroundColor: isSelected 
                    ? 'rgba(124, 109, 250, 0.1)' 
                    : matchIdx 
                      ? 'rgba(45, 212, 160, 0.03)' 
                      : 'var(--surface-color)',
                  userSelect: 'none',
                  cursor: isCompleted ? 'default' : 'pointer'
                }}
              >
                {matchIdx && (
                  <span className="badge badge-emerald" style={{ padding: '1px 4px', fontSize: '9px' }}>
                    {matchIdx}
                  </span>
                )}
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {item.name.split('/').pop()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Responsibilities Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold' }}>RESPONSIBILITIES</span>
          {shuffledResps.map((item) => {
            const matchIdx = getRespMatchIndex(item.id);
            const isSelectable = selectedCompId !== null;
            return (
              <div
                key={item.id}
                onClick={() => handleResponsibilityClick(item.id)}
                className="draggable-item"
                style={{
                  margin: 0,
                  fontSize: '9px',
                  padding: '6px 8px',
                  whiteSpace: 'normal',
                  lineHeight: '1.3',
                  borderColor: matchIdx 
                    ? 'var(--success-color)' 
                    : isSelectable 
                      ? 'var(--accent-color)' 
                      : 'var(--border-color)',
                  backgroundColor: matchIdx 
                    ? 'rgba(45, 212, 160, 0.02)' 
                    : 'var(--surface-color)',
                  cursor: isCompleted ? 'default' : isSelectable ? 'pointer' : 'not-allowed',
                  opacity: matchIdx || isSelectable ? 1 : 0.6
                }}
              >
                {matchIdx && (
                  <span className="badge badge-emerald" style={{ marginRight: '4px', padding: '1px 4px', fontSize: '8px' }}>
                    {matchIdx}
                  </span>
                )}
                <span>{item.responsibility}</span>
              </div>
            );
          })}
        </div>

      </div>

      {/* Action buttons */}
      {!isCompleted && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={!allMatched || isEvaluating}
            style={{ flex: 1 }}
          >
            {isEvaluating ? 'Evaluating...' : 'Verify Architecture Matches'}
          </button>
          <button 
            className="btn" 
            onClick={handleClear} 
            disabled={Object.keys(matches).length === 0 || isEvaluating}
            style={{ width: '60px' }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
