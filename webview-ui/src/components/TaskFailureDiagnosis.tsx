import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskFailureDiagnosisProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskFailureDiagnosis({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskFailureDiagnosisProps) {
  const failureScenario = content.failureScenario || '';
  const diagnosisOptions = content.diagnosisOptions || [];
  const mitigationOptions = content.mitigationOptions || [];

  const correctDiagIdx = content.correctDiagnosisIndex;
  const correctMitIdx = content.correctMitigationIndex;

  const [selectedDiagIdx, setSelectedDiagIdx] = useState<number | null>(null);
  const [selectedMitIdx, setSelectedMitIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isCompleted) {
      if (correctDiagIdx !== undefined) setSelectedDiagIdx(correctDiagIdx);
      if (correctMitIdx !== undefined) setSelectedMitIdx(correctMitIdx);
    } else {
      setSelectedDiagIdx(null);
      setSelectedMitIdx(null);
    }
  }, [content, isCompleted]);

  const handleSubmit = () => {
    if (selectedDiagIdx === null || selectedMitIdx === null) return;
    onSubmit({
      diagnosisIndex: selectedDiagIdx,
      mitigationIndex: selectedMitIdx
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Failure scenario log output */}
      <div 
        style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: '10px', 
          backgroundColor: '#0D0D0F', 
          border: '1px solid rgba(245, 166, 35, 0.3)',
          borderLeft: '3px solid var(--warning-color)',
          padding: '8px', 
          borderRadius: '4px',
          color: 'var(--text-primary)',
          lineHeight: '1.4'
        }}
      >
        <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: 'var(--warning-color)' }}>
          SYSTEM RUNTIME FAILURE LOG:
        </span>
        {failureScenario}
      </div>

      {/* Stage 1: Diagnosis MCQ */}
      <div>
        <span style={{ fontSize: '9.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }} className="text-muted">
          STAGE 1: DIAGNOSE PRIMARY ROOT CAUSE
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {diagnosisOptions.map((opt, idx) => {
            const isSelected = selectedDiagIdx === idx;
            const isCorrect = correctDiagIdx === idx;
            
            let borderColor = 'var(--border-color)';
            let bgColor = 'var(--surface-color)';
            let textColor = 'var(--text-primary)';

            if (isCompleted) {
              if (isCorrect) {
                borderColor = 'var(--success-color)';
                bgColor = 'rgba(45, 212, 160, 0.08)';
                textColor = 'var(--success-color)';
              } else if (isSelected) {
                borderColor = 'var(--warning-color)';
                bgColor = 'rgba(245, 166, 35, 0.05)';
                textColor = 'var(--warning-color)';
              }
            } else if (isSelected) {
              borderColor = 'var(--accent-color)';
              bgColor = 'rgba(124, 109, 250, 0.1)';
            }

            return (
              <div
                key={idx}
                onClick={() => !isCompleted && setSelectedDiagIdx(idx)}
                className="draggable-item"
                style={{
                  margin: 0,
                  fontSize: '10.5px',
                  padding: '5px 8px',
                  borderColor: borderColor,
                  backgroundColor: bgColor,
                  color: textColor,
                  cursor: isCompleted ? 'default' : 'pointer',
                  opacity: isCompleted && !isCorrect && !isSelected ? 0.6 : 1
                }}
              >
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage 2: Mitigation MCQ */}
      {selectedDiagIdx !== null && (
        <div>
          <span style={{ fontSize: '9.5px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }} className="text-muted">
            STAGE 2: SELECT RESOLUTION / MITIGATION STRATEGY
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {mitigationOptions.map((opt, idx) => {
              const isSelected = selectedMitIdx === idx;
              const isCorrect = correctMitIdx === idx;

              let borderColor = 'var(--border-color)';
              let bgColor = 'var(--surface-color)';
              let textColor = 'var(--text-primary)';

              if (isCompleted) {
                if (isCorrect) {
                  borderColor = 'var(--success-color)';
                  bgColor = 'rgba(45, 212, 160, 0.08)';
                  textColor = 'var(--success-color)';
                } else if (isSelected) {
                  borderColor = 'var(--warning-color)';
                  bgColor = 'rgba(245, 166, 35, 0.05)';
                  textColor = 'var(--warning-color)';
                }
              } else if (isSelected) {
                borderColor = 'var(--accent-color)';
                bgColor = 'rgba(124, 109, 250, 0.1)';
              }

              return (
                <div
                  key={idx}
                  onClick={() => !isCompleted && setSelectedMitIdx(idx)}
                  className="draggable-item"
                  style={{
                    margin: 0,
                    fontSize: '10.5px',
                    padding: '5px 8px',
                    borderColor: borderColor,
                    backgroundColor: bgColor,
                    color: textColor,
                    cursor: isCompleted ? 'default' : 'pointer',
                    opacity: isCompleted && !isCorrect && !isSelected ? 0.6 : 1
                  }}
                >
                  <span>{opt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-success">INCIDENT DEBRIEF:</span>
          <span className="text-muted">{content.explanation}</span>
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={selectedDiagIdx === null || selectedMitIdx === null || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Submitting resolution patches...' : 'Verify Incident Resolution'}
        </button>
      )}
    </div>
  );
}
