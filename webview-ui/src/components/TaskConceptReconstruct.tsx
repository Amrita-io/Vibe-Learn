import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskConceptReconstructProps {
  content: MissionTaskContent;
  onSubmit: (submission: { explanation: string }) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskConceptReconstruct({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskConceptReconstructProps) {
  const [explanation, setExplanation] = useState<string>('');

  useEffect(() => {
    if (isCompleted && content.sampleSolution) {
      setExplanation(explanation || 'Explanation verified.');
    } else {
      setExplanation('');
    }
  }, [content, isCompleted]);

  const handleSubmit = () => {
    if (explanation.trim().length < 15) return;
    onSubmit({ explanation });
  };

  const isTooShort = explanation.trim().length < 15;
  const expected = content.expectedConcepts || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      
      {/* Expected Keywords Guide */}
      {expected.length > 0 && !isCompleted && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold' }} className="text-muted">
            EXPECTED CONCEPTS TO REFERENCE
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {expected.map(kw => (
              <span 
                key={kw} 
                className="badge badge-indigo" 
                style={{ fontSize: '9px', textTransform: 'lowercase', fontFamily: 'var(--font-mono)' }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }} className="text-muted">
          YOUR CONCEPT EXPLANATION
        </span>
        <textarea
          disabled={isCompleted}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder={`Describe the core logic of ${content.targetConcept || 'this concept'} in your own words...`}
          style={{
            width: '100%',
            minHeight: '80px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            backgroundColor: '#070709',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            padding: '8px',
            resize: 'vertical',
            outline: 'none',
            borderColor: isCompleted ? 'var(--success-color)' : isTooShort ? 'var(--border-color)' : 'var(--accent-color)'
          }}
        />
      </div>

      {isCompleted && content.sampleSolution && (
        <div 
          className="card" 
          style={{ 
            marginTop: '4px', 
            borderLeft: '2px solid var(--success-color)', 
            padding: '6px 8px',
            backgroundColor: 'rgba(45, 212, 160, 0.01)',
            fontSize: '11px'
          }}
        >
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-success">
            REFERENCE SCHEMA
          </span>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {content.sampleSolution}
          </p>
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={isTooShort || isEvaluating}
          style={{ width: '100%', marginTop: '4px', padding: '10px' }}
        >
          {isEvaluating ? 'Evaluating semantic keywords...' : 'Verify Recall Description'}
        </button>
      )}
    </div>
  );
}
