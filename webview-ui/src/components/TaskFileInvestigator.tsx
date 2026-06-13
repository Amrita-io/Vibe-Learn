import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';
import { LockIcon, FolderIcon, CheckIcon } from './Icons';

interface TaskFileInvestigatorProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskFileInvestigator({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskFileInvestigatorProps) {
  const questions = content.questionsList || [];
  
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [answers, setAnswers] = useState<{ q1: number | null; q2: number | null; q3: string[] }>({
    q1: null,
    q2: null,
    q3: []
  });

  useEffect(() => {
    if (isCompleted && questions.length >= 3) {
      setAnswers({
        q1: questions[0].correct,
        q2: questions[1].correct,
        q3: questions[2].correct
      });
      setCurrentPhase(3);
    } else {
      setAnswers({ q1: null, q2: null, q3: [] });
      setCurrentPhase(1);
    }
  }, [content, isCompleted]);

  const handleQ1Select = (idx: number) => {
    if (isCompleted || currentPhase > 1) return;
    setAnswers({ ...answers, q1: idx });
  };

  const lockQ1 = () => {
    if (answers.q1 === null) return;
    setCurrentPhase(2);
  };

  const handleQ2Select = (idx: number) => {
    if (isCompleted || currentPhase > 2) return;
    setAnswers({ ...answers, q2: idx });
  };

  const lockQ2 = () => {
    if (answers.q2 === null) return;
    setCurrentPhase(3);
  };

  const handleQ3Toggle = (fpath: string) => {
    if (isCompleted) return;
    const exists = answers.q3.includes(fpath);
    const updated = exists 
      ? answers.q3.filter(p => p !== fpath) 
      : [...answers.q3, fpath];
    setAnswers({ ...answers, q3: updated });
  };

  const handleSubmit = () => {
    onSubmit({
      q1: answers.q1,
      q2: answers.q2,
      q3: answers.q3
    });
  };

  const q1 = questions[0];
  const q2 = questions[1];
  const q3 = questions[2];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* File Identifier Header */}
      <div style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold' }} className="text-accent">
          File: {content.fileName}
        </span>
      </div>

      {/* Code Editor Terminal View */}
      {content.fileContentPreview && (
        <div 
          style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '9px', 
            backgroundColor: '#070709', 
            border: '1px solid #1a1a24', 
            borderRadius: '4px',
            padding: '8px',
            maxHeight: '120px',
            overflowY: 'auto',
            color: '#B0ADC6',
            whiteSpace: 'pre',
            userSelect: 'text'
          }}
        >
          {content.fileContentPreview}
        </div>
      )}

      {/* PROGRESSIVE QUESTIONS */}

      {/* PHASE 1: Role */}
      {q1 && (
        <div className="card" style={{ borderColor: currentPhase >= 1 ? 'var(--border-color)' : '#1b1b22', opacity: currentPhase >= 1 ? 1 : 0.4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '11px' }}>
              STAGE 1: Code Responsibility
            </span>
            {currentPhase > 1 && <span className="text-success" style={{ fontSize: '9px' }}>✓ Locked</span>}
          </div>
          
          <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '6px' }}>{q1.prompt}</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {q1.options?.map((opt: string, idx: number) => {
              const isSelected = answers.q1 === idx;
              const isCorrect = q1.correct === idx && isCompleted;
              return (
                <div
                  key={idx}
                  onClick={() => handleQ1Select(idx)}
                  className="draggable-item"
                  style={{
                    margin: 0,
                    fontSize: '9.5px',
                    padding: '6px 8px',
                    borderColor: isCorrect ? 'var(--success-color)' : isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                    backgroundColor: isCorrect ? 'rgba(45, 212, 160, 0.05)' : isSelected ? 'rgba(124, 109, 250, 0.1)' : 'var(--surface-color)',
                    cursor: (isCompleted || currentPhase > 1) ? 'default' : 'pointer'
                  }}
                >
                  {opt}
                </div>
              );
            })}
          </div>

          {currentPhase === 1 && !isCompleted && (
            <button 
              className="btn btn-primary" 
              onClick={lockQ1} 
              disabled={answers.q1 === null}
              style={{ width: '100%', marginTop: '8px', padding: '4px 8px', fontSize: '10px' }}
            >
              Analyze & Lock Stage 1
            </button>
          )}
        </div>
      )}

      {/* PHASE 2: Separation Rationale */}
      {q2 && currentPhase >= 2 && (
        <div className="card" style={{ borderColor: currentPhase >= 2 ? 'var(--border-color)' : '#1b1b22', opacity: currentPhase >= 2 ? 1 : 0.4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '11px' }}>
              STAGE 2: Architectural Separation
            </span>
            {currentPhase > 2 && <span className="text-success" style={{ fontSize: '9px' }}>✓ Locked</span>}
          </div>
          
          <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '6px' }}>{q2.prompt}</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {q2.options?.map((opt: string, idx: number) => {
              const isSelected = answers.q2 === idx;
              const isCorrect = q2.correct === idx && isCompleted;
              return (
                <div
                  key={idx}
                  onClick={() => handleQ2Select(idx)}
                  className="draggable-item"
                  style={{
                    margin: 0,
                    fontSize: '9.5px',
                    padding: '6px 8px',
                    borderColor: isCorrect ? 'var(--success-color)' : isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                    backgroundColor: isCorrect ? 'rgba(45, 212, 160, 0.05)' : isSelected ? 'rgba(124, 109, 250, 0.1)' : 'var(--surface-color)',
                    cursor: (isCompleted || currentPhase > 2) ? 'default' : 'pointer'
                  }}
                >
                  {opt}
                </div>
              );
            })}
          </div>

          {currentPhase === 2 && !isCompleted && (
            <button 
              className="btn btn-primary" 
              onClick={lockQ2} 
              disabled={answers.q2 === null}
              style={{ width: '100%', marginTop: '8px', padding: '4px 8px', fontSize: '10px' }}
            >
              Analyze & Lock Stage 2
            </button>
          )}
        </div>
      )}

      {/* PHASE 3: Outgoing Dependencies */}
      {q3 && currentPhase >= 3 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '11px' }}>
              STAGE 3: Output Dependencies
            </span>
            {isCompleted && <span className="text-success" style={{ fontSize: '9px' }}>✓ Verified</span>}
          </div>
          
          <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '6px' }}>{q3.prompt}</div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {q3.options?.map((opt: string) => {
              const isChecked = answers.q3.includes(opt);
              const isCorrectEdge = q3.correct?.includes(opt);
              
              let bColor = 'var(--border-color)';
              let bg = 'var(--surface-color)';
              if (isCompleted) {
                if (isCorrectEdge) {
                  bColor = 'var(--success-color)';
                  bg = 'rgba(45, 212, 160, 0.1)';
                } else if (isChecked) {
                  bColor = 'var(--warning-color)';
                  bg = 'rgba(245, 166, 35, 0.05)';
                }
              } else if (isChecked) {
                bColor = 'var(--accent-color)';
                bg = 'rgba(124, 109, 250, 0.1)';
              }

              return (
                <div
                  key={opt}
                  onClick={() => handleQ3Toggle(opt)}
                  className="node-circle"
                  style={{
                    fontSize: '9.5px',
                    borderColor: bColor,
                    backgroundColor: bg,
                    cursor: isCompleted ? 'default' : 'pointer'
                  }}
                >
                  {opt.split('/').pop()}
                </div>
              );
            })}
          </div>

          {currentPhase === 3 && !isCompleted && (
            <button 
              className="btn btn-success" 
              onClick={handleSubmit} 
              disabled={isEvaluating}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {isEvaluating ? 'Evaluating report...' : 'Submit Complete Investigation'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
