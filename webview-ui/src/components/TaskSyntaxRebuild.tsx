import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskSyntaxRebuildProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskSyntaxRebuild({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskSyntaxRebuildProps) {
  const codeSnippet = content.codeSnippet || '';
  const blanks = content.blanks || [];

  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isCompleted) {
      const correctAnswers: Record<string, string> = {};
      blanks.forEach(b => {
        correctAnswers[b.id] = b.correctAnswer;
      });
      setAnswers(correctAnswers);
    } else {
      setAnswers({});
    }
  }, [content, isCompleted]);

  const selectBlankAnswer = (blankId: string, val: string) => {
    if (isCompleted) return;
    setAnswers(prev => ({
      ...prev,
      [blankId]: val
    }));
  };

  const handleSubmit = () => {
    onSubmit({ answers: answers });
  };

  // Helper to render code snippet with blanks replaced by selects or indicators
  const renderCodeWithBlanks = () => {
    const parts = codeSnippet.split('______');
    return (
      <pre 
        style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: '11px', 
          margin: 0, 
          padding: '8px', 
          overflowX: 'auto', 
          backgroundColor: '#0D0D0F', 
          border: '1px solid var(--border-color)', 
          borderRadius: '6px',
          color: 'var(--text-primary)',
          lineHeight: '1.6'
        }}
      >
        {parts.map((part, index) => {
          const blank = blanks[index];
          
          return (
            <React.Fragment key={index}>
              {part}
              {blank && (
                <span style={{ display: 'inline-block', margin: '0 4px', verticalAlign: 'middle' }}>
                  {isCompleted ? (
                    <span 
                      style={{ 
                        border: '1px solid var(--success-color)', 
                        color: 'var(--success-color)', 
                        backgroundColor: 'rgba(45, 212, 160, 0.1)', 
                        padding: '1px 6px', 
                        borderRadius: '3px',
                        fontWeight: 'bold'
                      }}
                    >
                      {blank.correctAnswer}
                    </span>
                  ) : (
                    <select
                      value={answers[blank.id] || ''}
                      onChange={(e) => selectBlankAnswer(blank.id, e.target.value)}
                      style={{
                        backgroundColor: 'rgba(124, 109, 250, 0.1)',
                        border: answers[blank.id] ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                        borderRadius: '3px',
                        color: 'var(--text-primary)',
                        padding: '1px 4px',
                        fontSize: '10px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">[Select token]</option>
                      {blank.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </pre>
    );
  };

  const allFilled = blanks.every(b => !!answers[b.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Code Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }} className="text-muted">
          SYNTAX REBUILD BOARD:
        </span>
        {renderCodeWithBlanks()}
      </div>

      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
        {!isCompleted 
          ? "Select the correct keywords inside the code statement to restore execution flow, then click Verify."
          : "Syntax block rebuilt successfully."
        }
      </div>

      {/* Explanation reveal */}
      {isCompleted && content.explanation && (
        <div 
          className="card" 
          style={{ 
            marginTop: '4px', 
            borderLeft: '2px solid var(--success-color)', 
            padding: '6px 8px',
            backgroundColor: 'rgba(45, 212, 160, 0.02)',
            fontSize: '10px'
          }}
        >
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-success">SYNTAX ANALYSIS:</span>
          <span className="text-muted">{content.explanation}</span>
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={!allFilled || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Rebuilding statement...' : 'Verify Rebuilt Statement'}
        </button>
      )}
    </div>
  );
}
