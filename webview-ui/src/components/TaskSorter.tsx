import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskSorterProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskSorter({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskSorterProps) {
  const items = content.boundaryItems || [];
  const [sorts, setSorts] = useState<Record<string, boolean>>({}); // itemId -> isInternal

  useEffect(() => {
    if (isCompleted) {
      const correctSorts: Record<string, boolean> = {};
      items.forEach(item => {
        correctSorts[item.id] = !!item.isInternal;
      });
      setSorts(correctSorts);
    } else {
      setSorts({});
    }
  }, [content, isCompleted]);

  const selectBoundary = (itemId: string, isInternal: boolean) => {
    if (isCompleted) return;
    setSorts({
      ...sorts,
      [itemId]: isInternal
    });
  };

  const allSelected = Object.keys(sorts).length === items.length;

  const handleSubmit = () => {
    onSubmit({ sorts });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item) => {
          const selection = sorts[item.id];
          const hasSelectedInternal = selection === true;
          const hasSelectedExternal = selection === false;

          return (
            <div 
              key={item.id} 
              className="card" 
              style={{ 
                padding: '8px 10px', 
                margin: 0,
                borderColor: selection !== undefined ? 'rgba(124, 109, 250, 0.3)' : 'var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  {item.name.split('/').pop()}
                </span>
                
                {/* Internal / External Toggles */}
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    className={`btn`}
                    onClick={() => selectBoundary(item.id, true)}
                    disabled={isCompleted}
                    style={{
                      padding: '2px 8px',
                      fontSize: '9px',
                      borderRadius: '3px 0 0 3px',
                      borderColor: hasSelectedInternal ? 'var(--success-color)' : 'var(--border-color)',
                      backgroundColor: hasSelectedInternal ? 'rgba(45, 212, 160, 0.2)' : 'var(--surface-color)',
                      color: hasSelectedInternal ? 'var(--success-color)' : 'var(--text-muted)'
                    }}
                  >
                    Internal
                  </button>
                  <button
                    className={`btn`}
                    onClick={() => selectBoundary(item.id, false)}
                    disabled={isCompleted}
                    style={{
                      padding: '2px 8px',
                      fontSize: '9px',
                      borderRadius: '0 3px 3px 0',
                      borderColor: hasSelectedExternal ? 'var(--accent-color)' : 'var(--border-color)',
                      backgroundColor: hasSelectedExternal ? 'rgba(124, 109, 250, 0.15)' : 'var(--surface-color)',
                      color: hasSelectedExternal ? 'var(--accent-color)' : 'var(--text-muted)'
                    }}
                  >
                    External
                  </button>
                </div>
              </div>
              <p className="text-muted" style={{ fontSize: '10px', margin: 0 }}>
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={!allSelected || isEvaluating}
          style={{ width: '100%', marginTop: '6px' }}
        >
          {isEvaluating ? 'Checking Classification...' : 'Verify System Boundaries'}
        </button>
      )}
    </div>
  );
}
