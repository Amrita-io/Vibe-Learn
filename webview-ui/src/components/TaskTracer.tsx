import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskTracerProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskTracer({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskTracerProps) {
  const steps = content.steps || [];
  const [orderedSteps, setOrderedSteps] = useState<typeof steps>([]);

  useEffect(() => {
    if (isCompleted) {
      const sorted = [...steps].sort((a, b) => (a.order || 0) - (b.order || 0));
      setOrderedSteps(sorted);
    } else {
      const shuffled = [...steps].sort(() => Math.random() - 0.5);
      setOrderedSteps(shuffled);
    }
  }, [content, isCompleted]);

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (isCompleted) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= orderedSteps.length) return;

    const newSteps = [...orderedSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setOrderedSteps(newSteps);
  };

  const getComponentColor = (compName: string) => {
    const name = compName.toLowerCase();
    if (name.includes('front') || name.includes('client') || name.includes('ui')) {
      return { bg: 'rgba(45, 212, 160, 0.1)', border: 'var(--success-color)', text: 'var(--success-color)' };
    } else if (name.includes('db') || name.includes('data') || name.includes('sql')) {
      return { bg: 'rgba(245, 166, 35, 0.1)', border: 'var(--warning-color)', text: 'var(--warning-color)' };
    } else {
      return { bg: 'rgba(124, 109, 250, 0.15)', border: 'var(--accent-color)', text: '#a89eff' };
    }
  };

  const handleSubmit = () => {
    const sequence = orderedSteps.map(s => s.id);
    onSubmit({ sequence });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold' }} className="text-accent">
          {content.workflowName}
        </span>
        <p className="text-muted" style={{ fontSize: '10px', margin: '2px 0 0 0' }}>
          Trigger: {content.triggerDescription}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {orderedSteps.map((step, idx) => {
          const compColor = getComponentColor(step.component);
          const isFirst = idx === 0;
          const isLast = idx === orderedSteps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div 
                className="card" 
                style={{ 
                  padding: '8px 10px', 
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderColor: isCompleted ? 'var(--success-color)' : 'var(--border-color)',
                  backgroundColor: 'var(--surface-color)'
                }}
              >
                {/* Step number badge */}
                <div 
                  className="flex-center"
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? 'rgba(45, 212, 160, 0.15)' : 'rgba(245, 245, 245, 0.1)',
                    border: `1px solid ${isCompleted ? 'var(--success-color)' : 'var(--border-color)'}`,
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}
                >
                  {idx + 1}
                </div>

                {/* Step description */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{step.action}</span>
                  <div>
                    <span 
                      className="badge" 
                      style={{ 
                        fontSize: '8px', 
                        padding: '1px 4px',
                        backgroundColor: compColor.bg,
                        borderColor: compColor.border,
                        color: compColor.text
                      }}
                    >
                      {step.component}
                    </span>
                  </div>
                </div>

                {/* Move buttons */}
                {!isCompleted && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      className="btn"
                      onClick={() => moveStep(idx, 'up')}
                      disabled={isFirst}
                      style={{ padding: '2px 5px', fontSize: '8px', borderRadius: '3px' }}
                    >
                      ▲
                    </button>
                    <button
                      className="btn"
                      onClick={() => moveStep(idx, 'down')}
                      disabled={isLast}
                      style={{ padding: '2px 5px', fontSize: '8px', borderRadius: '3px' }}
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>

              {/* Renders flow arrows upon completion */}
              {isCompleted && !isLast && (
                <div 
                  className="flex-center" 
                  style={{ 
                    height: '16px', 
                    color: 'var(--success-color)', 
                    fontSize: '12px',
                    animation: 'glow-pulse 2s infinite',
                    margin: '-2px 0'
                  }}
                >
                  ↓
                </div>
              )}
            </React.Fragment>
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
          {isEvaluating ? 'Checking workflow sequence...' : 'Verify Workflow Sequence'}
        </button>
      )}
    </div>
  );
}
