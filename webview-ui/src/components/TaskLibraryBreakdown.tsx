import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskLibraryBreakdownProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskLibraryBreakdown({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskLibraryBreakdownProps) {
  const options = content.options || [];
  const correctIdx = content.correctOptionIndex;
  
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isCompleted && correctIdx !== undefined) {
      setSelectedIndex(correctIdx);
    } else {
      setSelectedIndex(null);
    }
  }, [content, isCompleted]);

  const selectOption = (idx: number) => {
    if (isCompleted) return;
    setSelectedIndex(idx);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    onSubmit({ optionIndex: selectedIndex });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Header with target package metadata */}
      {content.packageName && (
        <div 
          className="card" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: '#0D0D0F',
            border: '1px solid var(--border-color)',
            borderRadius: '6px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', fontWeight: 'bold' }} className="text-muted">
              IMPORTED DEPENDENCY:
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 'bold', color: '#7C6DFA' }}>
              {content.packageName}
            </span>
          </div>
          <span 
            className="badge badge-indigo" 
            style={{ 
              fontSize: '8px', 
              fontFamily: 'var(--font-mono)',
              border: '1px solid rgba(124, 109, 250, 0.3)'
            }}
          >
            Pillar: Syntax
          </span>
        </div>
      )}

      {/* Question prompt */}
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>
        {content.question || `Why is this package required inside the codebase architecture?`}
      </div>

      {/* Options Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {options.map((option, idx) => {
          const isSelected = selectedIndex === idx;
          const isCorrectIndex = correctIdx === idx;
          
          let borderColor = 'var(--border-color)';
          let bgColor = 'var(--surface-color)';
          let textColor = 'var(--text-primary)';

          if (isCompleted) {
            if (isCorrectIndex) {
              borderColor = 'var(--success-color)';
              bgColor = 'rgba(45, 212, 160, 0.1)';
              textColor = 'var(--success-color)';
            } else if (isSelected) {
              borderColor = 'var(--warning-color)';
              bgColor = 'rgba(245, 166, 35, 0.05)';
              textColor = 'var(--warning-color)';
            }
          } else if (isSelected) {
            borderColor = 'var(--accent-color)';
            bgColor = 'rgba(124, 109, 250, 0.1)';
            textColor = 'var(--text-primary)';
          }

          return (
            <div
              key={idx}
              onClick={() => selectOption(idx)}
              className="draggable-item"
              style={{
                margin: 0,
                fontSize: '11px',
                borderColor: borderColor,
                backgroundColor: bgColor,
                color: textColor,
                cursor: isCompleted ? 'default' : 'pointer',
                opacity: isCompleted && !isCorrectIndex && !isSelected ? 0.5 : 1
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
                  borderColor: isSelected || (isCompleted && isCorrectIndex) ? 'inherit' : 'var(--border-color)'
                }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ flex: 1 }}>{option}</span>
            </div>
          );
        })}
      </div>

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
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-success">ROLE SUMMARY:</span>
          <span className="text-muted">{content.explanation}</span>
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={selectedIndex === null || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Evaluating role...' : 'Verify Library Rationale'}
        </button>
      )}
    </div>
  );
}
