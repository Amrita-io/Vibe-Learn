import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskReconstructTextProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskReconstructText({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskReconstructTextProps) {
  const [explanation, setExplanation] = useState<string>('');

  useEffect(() => {
    if (isCompleted && content.sampleSolution) {
      setExplanation(explanation || 'Explanation completed and verified.');
    } else {
      setExplanation('');
    }
  }, [content, isCompleted]);

  const handleSubmit = () => {
    if (explanation.trim().length < 15) return;
    onSubmit({ explanation });
  };

  const isTooShort = explanation.trim().length < 15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      
      <span className="text-muted" style={{ fontSize: '10.5px', fontStyle: 'italic', display: 'block' }}>
        Active Recall: Description must be at least 15 characters.
      </span>

      {/* Textarea Input */}
      <textarea
        disabled={isCompleted}
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        placeholder="Type your explanation in your own words..."
        style={{
          width: '100%',
          minHeight: '80px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          backgroundColor: '#070709',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          color: 'var(--text-primary)',
          padding: '8px',
          resize: 'vertical',
          outline: 'none',
          borderColor: isCompleted ? 'var(--success-color)' : isTooShort ? 'var(--border-color)' : 'var(--accent-color)'
        }}
      />

      {/* Model solution reveal */}
      {isCompleted && content.sampleSolution && (
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
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-success">
            REFERENCE UNDERSTANDING SCHEMAS:
          </span>
          <span className="text-muted">{content.sampleSolution}</span>
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={isTooShort || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Checking semantic keywords...' : 'Verify Recall Description'}
        </button>
      )}
    </div>
  );
}
