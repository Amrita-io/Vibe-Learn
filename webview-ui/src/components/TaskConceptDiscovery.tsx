import React, { useState } from 'react';
import { MissionTaskContent } from '../types';

interface TaskConceptDiscoveryProps {
  content: MissionTaskContent;
  onSubmit: (submission: { optionIndex: number }) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskConceptDiscovery({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskConceptDiscoveryProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selectedIdx !== null) {
      onSubmit({ optionIndex: selectedIdx });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="card" style={{ padding: '10px', backgroundColor: '#101014' }}>
        <div style={{ fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
          Where in the codebase is the concept of "{content.targetConcept}" implemented?
        </div>
        <p className="text-muted" style={{ fontSize: '11px', margin: '6px 0 0 0' }}>
          Inspect your files and click the correct matching path below.
        </p>
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
                cursor: isCompleted ? 'default' : 'pointer',
                fontFamily: 'var(--font-mono)'
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
          {isEvaluating ? 'Checking...' : 'Submit Location'}
        </button>
      )}
    </div>
  );
}
