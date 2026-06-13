import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskTradeoffAnalyzerProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskTradeoffAnalyzer({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskTradeoffAnalyzerProps) {
  const patternName = content.patternName || 'Design Pattern';
  const allStatements = content.allStatements || [];
  const correctBenefits = content.benefits || [];
  const correctDrawbacks = content.drawbacks || [];

  // Track state of user placements
  const [benefitsList, setBenefitsList] = useState<string[]>([]);
  const [drawbacksList, setDrawbacksList] = useState<string[]>([]);

  useEffect(() => {
    if (isCompleted) {
      setBenefitsList(correctBenefits);
      setDrawbacksList(correctDrawbacks);
    } else {
      setBenefitsList([]);
      setDrawbacksList([]);
    }
  }, [content, isCompleted]);

  const moveToBenefits = (stmt: string) => {
    if (isCompleted) return;
    setDrawbacksList(prev => prev.filter(s => s !== stmt));
    setBenefitsList(prev => {
      if (prev.includes(stmt)) return prev;
      return [...prev, stmt];
    });
  };

  const moveToDrawbacks = (stmt: string) => {
    if (isCompleted) return;
    setBenefitsList(prev => prev.filter(s => s !== stmt));
    setDrawbacksList(prev => {
      if (prev.includes(stmt)) return prev;
      return [...prev, stmt];
    });
  };

  const resetStatement = (stmt: string) => {
    if (isCompleted) return;
    setBenefitsList(prev => prev.filter(s => s !== stmt));
    setDrawbacksList(prev => prev.filter(s => s !== stmt));
  };

  const handleSubmit = () => {
    onSubmit({
      benefits: benefitsList,
      drawbacks: drawbacksList
    });
  };

  // Filter unsorted statements
  const unsortedStatements = allStatements.filter(
    s => !benefitsList.includes(s) && !drawbacksList.includes(s)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Pattern under review */}
      <div 
        style={{ 
          fontSize: '11px', 
          backgroundColor: '#0D0D0F', 
          borderLeft: '3px solid #7C6DFA', 
          padding: '8px 10px',
          borderRadius: '4px',
          color: 'var(--text-primary)'
        }}
      >
        <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-accent">
          TRADEOFF ANALYSIS TARGET
        </span>
        <strong>{patternName}</strong>
      </div>

      {/* Columns Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        
        {/* Benefits Column */}
        <div 
          style={{ 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px', 
            padding: '6px', 
            backgroundColor: 'rgba(45, 212, 160, 0.02)',
            minHeight: '100px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <span 
            style={{ 
              fontSize: '9px', 
              fontWeight: 'bold', 
              color: 'var(--success-color)', 
              textAlign: 'center', 
              display: 'block',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '4px',
              textTransform: 'uppercase'
            }}
          >
            ✓ Benefits / Pros
          </span>
          {benefitsList.map((stmt, i) => {
            const isCorrect = correctBenefits.includes(stmt);
            let itemBorder = 'var(--border-color)';
            if (isCompleted) {
              itemBorder = isCorrect ? 'var(--success-color)' : 'var(--warning-color)';
            }
            return (
              <div 
                key={i} 
                className="card" 
                style={{ 
                  margin: 0, 
                  fontSize: '9.5px', 
                  padding: '4px 6px',
                  borderColor: itemBorder,
                  cursor: isCompleted ? 'default' : 'pointer'
                }}
                onClick={() => resetStatement(stmt)}
                title={!isCompleted ? "Click to reset" : ""}
              >
                {stmt}
              </div>
            );
          })}
        </div>

        {/* Drawbacks Column */}
        <div 
          style={{ 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px', 
            padding: '6px', 
            backgroundColor: 'rgba(245, 166, 35, 0.02)',
            minHeight: '100px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <span 
            style={{ 
              fontSize: '9px', 
              fontWeight: 'bold', 
              color: '#F5A623', 
              textAlign: 'center', 
              display: 'block',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '4px',
              textTransform: 'uppercase'
            }}
          >
            ⚠ Drawbacks / Cons
          </span>
          {drawbacksList.map((stmt, i) => {
            const isCorrect = correctDrawbacks.includes(stmt);
            let itemBorder = 'var(--border-color)';
            if (isCompleted) {
              itemBorder = isCorrect ? 'var(--success-color)' : 'var(--warning-color)';
            }
            return (
              <div 
                key={i} 
                className="card" 
                style={{ 
                  margin: 0, 
                  fontSize: '9.5px', 
                  padding: '4px 6px',
                  borderColor: itemBorder,
                  cursor: isCompleted ? 'default' : 'pointer'
                }}
                onClick={() => resetStatement(stmt)}
                title={!isCompleted ? "Click to reset" : ""}
              >
                {stmt}
              </div>
            );
          })}
        </div>

      </div>

      {/* Unsorted statements */}
      {!isCompleted && unsortedStatements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold' }} className="text-muted">
            UNCLASSIFIED STATEMENTS:
          </span>
          {unsortedStatements.map((stmt, i) => (
            <div 
              key={i} 
              className="draggable-item" 
              style={{ 
                margin: 0, 
                fontSize: '10px', 
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <span style={{ flex: 1 }}>{stmt}</span>
              <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                <button 
                  className="btn" 
                  onClick={() => moveToBenefits(stmt)}
                  style={{ fontSize: '9px', padding: '2px 5px', borderColor: 'var(--success-color)', color: 'var(--success-color)' }}
                >
                  Pro
                </button>
                <button 
                  className="btn" 
                  onClick={() => moveToDrawbacks(stmt)}
                  style={{ fontSize: '9px', padding: '2px 5px', borderColor: '#F5A623', color: '#F5A623' }}
                >
                  Con
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification instructions */}
      {!isCompleted && unsortedStatements.length === 0 && (
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', margin: '4px 0' }}>
          All statements sorted! Click verify to check selections.
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={benefitsList.length + drawbacksList.length < allStatements.length || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Checking tradeoff classification...' : 'Verify Tradeoff Selections'}
        </button>
      )}
    </div>
  );
}
