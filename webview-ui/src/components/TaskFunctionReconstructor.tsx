import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';
import { CheckIcon } from './Icons';

interface TaskFunctionReconstructorProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskFunctionReconstructor({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskFunctionReconstructorProps) {
  const inputs = content.inputsList || [];
  const steps = content.steps || [];
  const errors = content.errorList || [];

  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [orderedSteps, setOrderedSteps] = useState<typeof steps>([]);
  const [errorMappings, setErrorMappings] = useState<Record<string, string>>({}); // errorType -> whenText
  const [selectedErrType, setSelectedErrType] = useState<string | null>(null);

  const [shuffledErrors, setShuffledErrors] = useState<typeof errors>([]);

  // Initialize once on mount
  useEffect(() => {
    const errorShuffled = [...errors].sort(() => Math.random() - 0.5);
    setShuffledErrors(errorShuffled);

    if (isCompleted) {
      setSelectedInputs(content.correctInputs || []);
      const sorted = [...steps].sort((a, b) => (a.order || 0) - (b.order || 0));
      setOrderedSteps(sorted);
      
      const correctMaps: Record<string, string> = {};
      errors.forEach(err => {
        correctMaps[err.type] = err.when;
      });
      setErrorMappings(correctMaps);
      setCurrentPhase(3);
    } else {
      setSelectedInputs([]);
      const shuffledSteps = [...steps].sort(() => Math.random() - 0.5);
      setOrderedSteps(shuffledSteps);
      setErrorMappings({});
      setCurrentPhase(1);
    }
  }, [content, isCompleted]);

  // Phase 1 Handlers
  const handleInputToggle = (name: string) => {
    if (isCompleted || currentPhase > 1) return;
    const exists = selectedInputs.includes(name);
    setSelectedInputs(exists ? selectedInputs.filter(x => x !== name) : [...selectedInputs, name]);
  };

  const verifyPhase1 = () => {
    const correctInputs = content.correctInputs || [];
    const isCorrect = selectedInputs.length === correctInputs.length && 
                      selectedInputs.every(x => correctInputs.includes(x));
    if (isCorrect) {
      setCurrentPhase(2);
    } else {
      alert("Verification failed. Check parameters and retry.");
    }
  };

  // Phase 2 Handlers
  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (isCompleted || currentPhase > 2) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= orderedSteps.length) return;

    const newSteps = [...orderedSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setOrderedSteps(newSteps);
  };

  const verifyPhase2 = () => {
    const correctSteps = sortedCorrectSteps();
    const correctOrder = correctSteps.map(s => s.description);
    const userOrder = orderedSteps.map(s => s.description);
    
    if (JSON.stringify(userOrder) === JSON.stringify(correctOrder)) {
      setCurrentPhase(3);
    } else {
      alert("Verification failed. Trace the execution order again.");
    }
  };

  const sortedCorrectSteps = () => {
    return [...steps].sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  // Phase 3 Handlers
  const selectErrType = (type: string) => {
    if (isCompleted) return;
    setSelectedErrType(type === selectedErrType ? null : type);
  };

  const mapCondition = (whenText: string) => {
    if (isCompleted || !selectedErrType) return;
    setErrorMappings({
      ...errorMappings,
      [selectedErrType]: whenText
    });
    setSelectedErrType(null);
  };

  const clearPhase3 = () => {
    setErrorMappings({});
    setSelectedErrType(null);
  };

  const handleSubmit = () => {
    onSubmit({
      phase1: { inputs: selectedInputs },
      phase2: { sequence: orderedSteps.map(s => s.id) },
      phase3: { errorMatches: errorMappings }
    });
  };

  const allMapped = errors.every(err => errorMappings[err.type] !== undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Signature purpose preview */}
      <div style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '8px', marginBottom: '4px' }}>
        <code style={{ fontSize: '11px', fontWeight: 'bold' }} className="text-accent">
          {content.functionSignature}
        </code>
        <p className="text-muted" style={{ fontSize: '10px', margin: '2px 0 0 0' }}>
          Purpose: {content.functionPurpose}
        </p>
      </div>

      {/* PHASE 1: Parameter Inputs */}
      <div className="card" style={{ borderColor: currentPhase >= 1 ? 'var(--border-color)' : '#1b1b22', opacity: currentPhase >= 1 ? 1 : 0.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '11px' }}>
            PHASE 1: Parameter Selection
          </span>
          {currentPhase > 1 && <span className="text-success" style={{ fontSize: '9px' }}>✓ Verified</span>}
        </div>

        <div style={{ fontSize: '10.5px', marginBottom: '6px' }} className="text-muted">
          Select the parameters passed into this function signature:
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {inputs.map(inp => {
            const isChecked = selectedInputs.includes(inp.name);
            return (
              <div
                key={inp.name}
                onClick={() => handleInputToggle(inp.name)}
                className="node-circle"
                style={{
                  fontSize: '9.5px',
                  borderColor: isChecked ? 'var(--accent-color)' : 'var(--border-color)',
                  backgroundColor: isChecked ? 'rgba(124, 109, 250, 0.1)' : 'var(--surface-color)',
                  cursor: (isCompleted || currentPhase > 1) ? 'default' : 'pointer'
                }}
              >
                {inp.name}: <span className="text-muted">{inp.type}</span>
              </div>
            );
          })}
        </div>

        {currentPhase === 1 && !isCompleted && (
          <button 
            className="btn btn-primary" 
            onClick={verifyPhase1}
            disabled={selectedInputs.length === 0}
            style={{ width: '100%', marginTop: '8px', padding: '4px 8px', fontSize: '10px' }}
          >
            Verify Parameter Signatures
          </button>
        )}
      </div>

      {/* PHASE 2: Ordered Execution Steps */}
      {currentPhase >= 2 && (
        <div className="card" style={{ borderColor: currentPhase >= 2 ? 'var(--border-color)' : '#1b1b22', opacity: currentPhase >= 2 ? 1 : 0.4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '11px' }}>
              PHASE 2: Sequence Algorithm Blocks
            </span>
            {currentPhase > 2 && <span className="text-success" style={{ fontSize: '9px' }}>✓ Verified</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {orderedSteps.map((step, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === orderedSteps.length - 1;
              return (
                <div 
                  key={step.id} 
                  className="draggable-item"
                  style={{ 
                    margin: 0, 
                    fontSize: '9.5px', 
                    padding: '6px 8px',
                    borderColor: currentPhase > 2 ? 'var(--success-color)' : 'var(--border-color)'
                  }}
                >
                  <span style={{ marginRight: '6px', fontWeight: 'bold' }}>{idx + 1}.</span>
                  <span style={{ flex: 1 }}>{step.description}</span>
                  
                  {currentPhase === 2 && !isCompleted && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        className="btn"
                        onClick={() => moveStep(idx, 'up')}
                        disabled={isFirst}
                        style={{ padding: '2px 4px', fontSize: '8px' }}
                      >
                        ▲
                      </button>
                      <button
                        className="btn"
                        onClick={() => moveStep(idx, 'down')}
                        disabled={isLast}
                        style={{ padding: '2px 4px', fontSize: '8px' }}
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {currentPhase === 2 && !isCompleted && (
            <button 
              className="btn btn-primary" 
              onClick={verifyPhase2}
              style={{ width: '100%', marginTop: '8px', padding: '4px 8px', fontSize: '10px' }}
            >
              Verify Chronological Sequence
            </button>
          )}
        </div>
      )}

      {/* PHASE 3: Error Scenarios */}
      {currentPhase >= 3 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '11px' }}>
              PHASE 3: Exception Condition Mapping
            </span>
            {isCompleted && <span className="text-success" style={{ fontSize: '9px' }}>✓ Verified</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {/* Left list: Error Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {errors.map(err => {
                const isSelected = selectedErrType === err.type;
                const mappedVal = errorMappings[err.type];
                return (
                  <div
                    key={err.type}
                    onClick={() => selectErrType(err.type)}
                    className="draggable-item"
                    style={{
                      margin: 0,
                      fontSize: '9px',
                      padding: '4px 6px',
                      borderColor: isSelected 
                        ? 'var(--accent-color)' 
                        : mappedVal 
                          ? 'var(--success-color)' 
                          : 'var(--border-color)',
                      backgroundColor: isSelected 
                        ? 'rgba(124, 109, 250, 0.1)' 
                        : 'var(--surface-color)',
                      cursor: isCompleted ? 'default' : 'pointer'
                    }}
                  >
                    {err.type}
                  </div>
                );
              })}
            </div>

            {/* Right list: Shuffled condition */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {shuffledErrors.map(err => {
                const isMapped = Object.values(errorMappings).includes(err.when);
                const isSelectable = selectedErrType !== null;
                return (
                  <div
                    key={err.when}
                    onClick={() => mapCondition(err.when)}
                    className="draggable-item"
                    style={{
                      margin: 0,
                      fontSize: '8.5px',
                      padding: '4px 6px',
                      lineHeight: '1.2',
                      borderColor: isMapped 
                        ? 'var(--success-color)' 
                        : isSelectable 
                          ? 'var(--accent-color)' 
                          : 'var(--border-color)',
                      backgroundColor: isMapped ? 'rgba(45, 212, 160, 0.02)' : 'var(--surface-color)',
                      cursor: isCompleted ? 'default' : isSelectable ? 'pointer' : 'not-allowed',
                      opacity: isMapped || isSelectable ? 1 : 0.5
                    }}
                  >
                    {err.when}
                  </div>
                );
              })}
            </div>
          </div>

          {currentPhase === 3 && !isCompleted && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
              <button 
                className="btn btn-success" 
                onClick={handleSubmit}
                disabled={!allMapped || isEvaluating}
                style={{ flex: 1 }}
              >
                {isEvaluating ? 'Checking scenarios...' : 'Verify Error Scenarios'}
              </button>
              <button 
                className="btn" 
                onClick={clearPhase3}
                disabled={Object.keys(errorMappings).length === 0}
                style={{ width: '50px' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
