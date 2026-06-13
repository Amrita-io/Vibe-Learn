import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskConceptPrereqMapProps {
  content: MissionTaskContent;
  onSubmit: (submission: { selectedConcepts: string[]; orderedPath: string[] }) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskConceptPrereqMap({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskConceptPrereqMapProps) {
  const options = content.conceptsList || [];
  
  // Lists for available and ordered paths
  const [available, setAvailable] = useState<string[]>([]);
  const [ordered, setOrdered] = useState<string[]>([]);

  // Initialize list
  useEffect(() => {
    if (isCompleted) {
      // If task is already complete, show correct prerequisite path
      setOrdered(content.correctOrder || []);
      setAvailable([]);
    } else {
      setAvailable(options);
      setOrdered([]);
    }
  }, [content, isCompleted]);

  const moveToPath = (item: string) => {
    if (isCompleted) return;
    setAvailable(prev => prev.filter(c => c !== item));
    setOrdered(prev => [...prev, item]);
  };

  const removeFromPath = (item: string) => {
    if (isCompleted) return;
    setOrdered(prev => prev.filter(c => c !== item));
    setAvailable(prev => [...prev, item]);
  };

  const handleSubmit = () => {
    onSubmit({
      selectedConcepts: ordered,
      orderedPath: ordered
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '11px', lineHeight: '1.4' }} className="text-muted">
        Target Concept: <strong className="text-accent" style={{ fontSize: '12px' }}>{content.targetConcept}</strong> requires specific preceding knowledge. Assemble the correct sequence below by clicking concepts to move them.
      </div>

      <div style={{ display: 'flex', gap: '12px', minHeight: '160px' }}>
        
        {/* Available Concepts Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} className="text-muted">
            Available Nodes
          </span>
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px',
            backgroundColor: '#0d0d0f',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1
          }}>
            {available.length === 0 && available.length + ordered.length > 0 ? (
              <span style={{ fontSize: '10px', fontStyle: 'italic', textAlign: 'center', margin: 'auto' }} className="text-muted">
                All selected
              </span>
            ) : null}
            {available.map(item => (
              <div
                key={item}
                onClick={() => moveToPath(item)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #282836',
                  backgroundColor: 'var(--surface-color)',
                  fontSize: '11px',
                  cursor: isCompleted ? 'default' : 'pointer',
                  textAlign: 'center',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  transition: 'background-color 0.2s'
                }}
                className={isCompleted ? '' : 'hover-glow'}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Ordered Path Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} className="text-muted">
            Learning Path
          </span>
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px',
            backgroundColor: '#0d0d0f',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1
          }}>
            {ordered.map((item, idx) => (
              <div
                key={item}
                onClick={() => removeFromPath(item)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--accent-color)',
                  backgroundColor: 'rgba(124, 109, 250, 0.05)',
                  fontSize: '11px',
                  cursor: isCompleted ? 'default' : 'pointer',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: 'var(--accent-color)',
                  position: 'relative'
                }}
              >
                <span style={{
                  position: 'absolute',
                  left: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '8px',
                  fontFamily: 'var(--font-mono)',
                  opacity: 0.6
                }}>
                  #{idx + 1}
                </span>
                {item}
              </div>
            ))}

            {/* Target Destination Node */}
            <div style={{
              padding: '8px 10px',
              borderRadius: '4px',
              border: isCompleted ? '1px dashed var(--success-color)' : '1px dashed #4e488f',
              backgroundColor: isCompleted ? 'rgba(45, 212, 160, 0.02)' : 'rgba(124, 109, 250, 0.01)',
              fontSize: '11px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: isCompleted ? 'var(--success-color)' : 'rgba(124, 109, 250, 0.7)',
              marginTop: 'auto',
              borderWidth: '2px'
            }}>
              Goal: {content.targetConcept}
            </div>
          </div>
        </div>
      </div>

      {!isCompleted && (
        <button
          onClick={handleSubmit}
          disabled={ordered.length === 0 || isEvaluating}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px' }}
        >
          {isEvaluating ? 'Checking...' : 'Submit Prerequisite Path'}
        </button>
      )}
    </div>
  );
}
