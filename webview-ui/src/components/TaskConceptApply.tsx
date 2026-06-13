import React, { useState } from 'react';
import { MissionTaskContent } from '../types';
import CodeSnippet from './CodeSnippet';

interface TaskConceptApplyProps {
  content: MissionTaskContent;
  onSubmit: (submission: { optionIndex: number }) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskConceptApply({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskConceptApplyProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selectedIdx !== null) {
      onSubmit({ optionIndex: selectedIdx });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Code Snippet Container */}
      {content.codeSnippet && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold' }} className="text-muted">
            CODE INSPECTION PANEL
          </span>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            <CodeSnippet code={content.codeSnippet} />
          </div>
        </div>
      )}

      {/* Challenge Question */}
      <div className="card" style={{ padding: '10px', backgroundColor: '#101014' }}>
        <div style={{ fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 'bold', lineHeight: '1.4' }}>
          {content.question || "This implementation contains a defect. Identify the bug and select the correct architectural fix:"}
        </div>
      </div>

      {/* Options Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {content.options?.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <button
              key={idx}
              onClick={() => !isCompleted && setSelectedIdx(idx)}
              disabled={isCompleted}
              className="btn"
              style={{
                textAlign: 'left',
                fontSize: '11px',
                padding: '8px 10px',
                borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                backgroundColor: isSelected ? 'rgba(124, 109, 250, 0.08)' : 'var(--surface-color)',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: isCompleted ? 'default' : 'pointer'
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {!isCompleted && (
        <button
          onClick={handleSubmit}
          disabled={selectedIdx === null || isEvaluating}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px' }}
        >
          {isEvaluating ? 'Checking...' : 'Submit Debug Fix'}
        </button>
      )}
    </div>
  );
}
