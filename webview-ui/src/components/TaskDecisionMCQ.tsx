import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskDecisionMCQProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskDecisionMCQ({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskDecisionMCQProps) {
  const choices = content.choices || [];
  const constraints = content.constraints || [];
  const requiredKeywords = content.requiredKeywords || [];

  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [selectedRationaleIdx, setSelectedRationaleIdx] = useState<number | null>(null);
  const [justification, setJustification] = useState<string>('');

  useEffect(() => {
    if (isCompleted) {
      // Find recommended choice index and correct rationale index
      const recIdx = choices.findIndex(c => c.isRecommended);
      if (recIdx !== -1) {
        setSelectedChoiceIdx(recIdx);
        setSelectedRationaleIdx(choices[recIdx].correctRationaleIndex);
      }
    } else {
      setSelectedChoiceIdx(null);
      setSelectedRationaleIdx(null);
      setJustification('');
    }
  }, [content, isCompleted]);

  const selectChoice = (idx: number) => {
    if (isCompleted) return;
    setSelectedChoiceIdx(idx);
    setSelectedRationaleIdx(null); // Reset rationale on choice change
  };

  const selectRationale = (idx: number) => {
    if (isCompleted) return;
    setSelectedRationaleIdx(idx);
  };

  const handleSubmit = () => {
    if (selectedChoiceIdx === null || selectedRationaleIdx === null) return;
    onSubmit({
      choiceIndex: selectedChoiceIdx,
      rationaleIndex: selectedRationaleIdx,
      justification: justification
    });
  };

  const activeChoice = selectedChoiceIdx !== null ? choices[selectedChoiceIdx] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Scenario Overview */}
      <div 
        style={{ 
          fontSize: '11px', 
          backgroundColor: '#0D0D0F', 
          borderLeft: '3px solid #7C6DFA', 
          padding: '8px 10px',
          borderRadius: '0 6px 6px 0',
          color: 'var(--text-primary)'
        }}
      >
        <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-accent">
          PROJECT SCENARIO
        </span>
        {content.scenario}
      </div>

      {/* Constraints Board */}
      {constraints.length > 0 && (
        <div>
          <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }} className="text-muted">
            CRITICAL CONSTRAINTS:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {constraints.map((c, i) => (
              <span 
                key={i} 
                style={{ 
                  fontSize: '9.5px', 
                  padding: '2px 8px', 
                  borderRadius: '3px',
                  backgroundColor: 'rgba(245, 166, 35, 0.1)',
                  border: '1px solid rgba(245, 166, 35, 0.25)',
                  color: '#F5A623',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                ⚠ {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: Choice Selector */}
      <div style={{ marginTop: '4px' }}>
        <span style={{ fontSize: '9.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }} className="text-muted">
          STAGE 1: SELECT TECHNICAL OPTION
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {choices.map((c, idx) => {
            const isSelected = selectedChoiceIdx === idx;
            const isRec = c.isRecommended;

            let borderColor = 'var(--border-color)';
            let bgColor = 'var(--surface-color)';
            
            if (isCompleted) {
              if (isRec) {
                borderColor = 'var(--success-color)';
                bgColor = 'rgba(45, 212, 160, 0.08)';
              } else if (isSelected) {
                borderColor = 'var(--warning-color)';
                bgColor = 'rgba(245, 166, 35, 0.05)';
              }
            } else if (isSelected) {
              borderColor = 'var(--accent-color)';
              bgColor = 'rgba(124, 109, 250, 0.15)';
            }

            return (
              <div
                key={idx}
                onClick={() => selectChoice(idx)}
                className="draggable-item"
                style={{
                  margin: 0,
                  fontSize: '11px',
                  borderColor: borderColor,
                  backgroundColor: bgColor,
                  cursor: isCompleted ? 'default' : 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{c.techName}</span>
                {isCompleted && isRec && (
                  <span style={{ color: 'var(--success-color)', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    [Recommended]
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Rationale Selector */}
      {activeChoice && (
        <div style={{ marginTop: '4px' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }} className="text-muted">
            STAGE 2: SELECT ARCHITECTURAL RATIONALE
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeChoice.rationaleOptions.map((opt, idx) => {
              const isSelected = selectedRationaleIdx === idx;
              const isCorrectRationale = activeChoice.correctRationaleIndex === idx;

              let borderColor = 'var(--border-color)';
              let bgColor = 'var(--surface-color)';
              let textColor = 'var(--text-primary)';

              if (isCompleted) {
                if (isCorrectRationale) {
                  borderColor = 'var(--success-color)';
                  bgColor = 'rgba(45, 212, 160, 0.08)';
                  textColor = 'var(--success-color)';
                } else if (isSelected) {
                  borderColor = 'var(--warning-color)';
                  bgColor = 'rgba(245, 166, 35, 0.05)';
                  textColor = 'var(--warning-color)';
                }
              } else if (isSelected) {
                borderColor = 'var(--accent-color)';
                bgColor = 'rgba(124, 109, 250, 0.1)';
              }

              return (
                <div
                  key={idx}
                  onClick={() => selectRationale(idx)}
                  className="draggable-item"
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    borderColor: borderColor,
                    backgroundColor: bgColor,
                    color: textColor,
                    cursor: isCompleted ? 'default' : 'pointer'
                  }}
                >
                  <span 
                    className="flex-center"
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      marginRight: '6px',
                      borderColor: isSelected || (isCompleted && isCorrectRationale) ? 'inherit' : 'var(--border-color)'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Written Justification */}
      {selectedChoiceIdx !== null && selectedRationaleIdx !== null && (
        <div style={{ marginTop: '4px' }}>
          <span style={{ fontSize: '9.5px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-muted">
            STAGE 3: WRITTEN JUSTIFICATION
          </span>
          {!isCompleted ? (
            <>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Briefly justify why this stack choice satisfies project constraints..."
                style={{
                  width: '100%',
                  height: '50px',
                  backgroundColor: '#0D0D0F',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '10.5px',
                  padding: '6px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none'
                }}
              />
              {requiredKeywords.length > 0 && (
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Required constraint concepts: {requiredKeywords.map(kw => {
                    const isMatched = justification.toLowerCase().includes(kw.toLowerCase());
                    return (
                      <span 
                        key={kw} 
                        style={{ 
                          marginRight: '6px', 
                          color: isMatched ? 'var(--success-color)' : 'var(--text-muted)',
                          fontWeight: isMatched ? 'bold' : 'normal'
                        }}
                      >
                        {isMatched ? '✓' : '○'} {kw}
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '4px' }}>
              Justification evaluated and approved.
            </div>
          )}
        </div>
      )}

      {/* Explanation reveal */}
      {isCompleted && content.explanation && (
        <div 
          className="card" 
          style={{ 
            marginTop: '6px', 
            borderLeft: '2px solid var(--success-color)', 
            padding: '6px 8px',
            backgroundColor: 'rgba(45, 212, 160, 0.02)',
            fontSize: '10px'
          }}
        >
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-success">DESIGN RATIONALE:</span>
          <span className="text-muted">{content.explanation}</span>
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={selectedChoiceIdx === null || selectedRationaleIdx === null || (requiredKeywords.length > 0 && !justification) || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Evaluating scenario simulation...' : 'Submit Architecture Decision'}
        </button>
      )}
    </div>
  );
}
