import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';
import CodeSnippet from './CodeSnippet';

interface TaskSyntaxSpotlightProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskSyntaxSpotlight({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskSyntaxSpotlightProps) {
  const tokens = content.tokens || [];
  const correctIndices = content.correctTokenIndices || [];

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  useEffect(() => {
    if (isCompleted) {
      setSelectedIndices(correctIndices);
    } else {
      setSelectedIndices([]);
    }
  }, [content, isCompleted]);

  const handleTokenClick = (idx: number) => {
    if (isCompleted) return;
    
    setSelectedIndices(prev => {
      if (prev.includes(idx)) {
        return prev.filter(i => i !== idx);
      } else {
        return [...prev, idx];
      }
    });
  };

  const handleSubmit = () => {
    if (selectedIndices.length === 0) return;
    onSubmit({ selectedTokenIndices: selectedIndices });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Target Pattern Description Badge */}
      <div 
        style={{ 
          fontSize: '11px', 
          backgroundColor: 'rgba(124, 109, 250, 0.1)', 
          border: '1px dashed var(--accent-color)', 
          borderRadius: '4px',
          padding: '6px 10px',
          color: 'var(--text-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>Target Token Type to Scan:</span>
        <strong style={{ textTransform: 'uppercase', color: '#F5A623', fontFamily: 'var(--font-mono)' }}>
          {content.targetPatternType || 'construct'}
        </strong>
      </div>

      {/* CodeSnippet in click-token mode */}
      <CodeSnippet
        tokens={tokens}
        mode="click"
        selectedTokenIndices={selectedIndices}
        correctTokenIndices={correctIndices}
        onTokenClick={handleTokenClick}
        isCompleted={isCompleted}
      />

      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
        {!isCompleted 
          ? "Click on the specific token(s) above that represent the target pattern, then click Verify."
          : "Evaluation complete. View correct token positions highlighted above."
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
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-success">SYNTAX SCAN FEEDBACK:</span>
          <span className="text-muted">{content.explanation}</span>
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={selectedIndices.length === 0 || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Checking tokens...' : 'Verify Spotlight Selection'}
        </button>
      )}
    </div>
  );
}
