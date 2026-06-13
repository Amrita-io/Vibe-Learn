import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskSequencerProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskSequencer({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskSequencerProps) {
  const steps = content.flowSteps || [];
  const [orderedSteps, setOrderedSteps] = useState<typeof steps>([]);

  useEffect(() => {
    if (isCompleted) {
      const sorted = [...steps].sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));
      setOrderedSteps(sorted);
    } else {
      // Shuffle on load
      const shuffled = [...steps].sort(() => Math.random() - 0.5);
      setOrderedSteps(shuffled);
    }
  }, [content, isCompleted]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (isCompleted) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= orderedSteps.length) return;

    const newSteps = [...orderedSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;

    setOrderedSteps(newSteps);
  };

  const handleSubmit = () => {
    const sequence = orderedSteps.map(s => s.id);
    onSubmit({ sequence });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {orderedSteps.map((step, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === orderedSteps.length - 1;

          return (
            <div 
              key={step.id} 
              className="card" 
              style={{ 
                padding: '8px 10px', 
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderColor: isCompleted ? 'var(--success-color)' : 'var(--border-color)'
              }}
            >
              {/* Chronological Step Counter */}
              <div 
                className="flex-center"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? 'rgba(45, 212, 160, 0.15)' : 'rgba(124, 109, 250, 0.15)',
                  border: `1px solid ${isCompleted ? 'var(--success-color)' : 'var(--accent-color)'}`,
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}
              >
                {idx + 1}
              </div>

              {/* Step text */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{step.text}</span>
                <span style={{ fontSize: '8px', fontFamily: 'var(--font-mono)' }} className="text-muted">
                  Handling Component: {step.component.split('/').pop()}
                </span>
              </div>

              {/* Up / Down Controls */}
              {!isCompleted && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    className="btn"
                    onClick={() => moveItem(idx, 'up')}
                    disabled={isFirst}
                    style={{ padding: '2px 6px', fontSize: '8px', borderRadius: '3px' }}
                  >
                    ▲
                  </button>
                  <button
                    className="btn"
                    onClick={() => moveItem(idx, 'down')}
                    disabled={isLast}
                    style={{ padding: '2px 6px', fontSize: '8px', borderRadius: '3px' }}
                  >
                    ▼
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={isEvaluating}
          style={{ width: '100%', marginTop: '6px' }}
        >
          {isEvaluating ? 'Tracing Flow...' : 'Verify Data Flow Sequence'}
        </button>
      )}
    </div>
  );
}
