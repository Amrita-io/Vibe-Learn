import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskIOIdentifierProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskIOIdentifier({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskIOIdentifierProps) {
  const vars = content.variableNames || [];
  const options = content.options || [];

  const [inputs, setInputs] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [returnType, setReturnType] = useState<string>('');

  useEffect(() => {
    if (isCompleted) {
      setInputs(content.correctInputs || []);
      setOutputs(content.correctOutputs || []);
      setReturnType(content.correctReturnType || '');
    } else {
      setInputs([]);
      setOutputs([]);
      setReturnType('');
    }
  }, [content, isCompleted]);

  const toggleVariable = (vname: string, target: 'input' | 'output') => {
    if (isCompleted) return;
    if (target === 'input') {
      const isAlreadyIn = inputs.includes(vname);
      if (isAlreadyIn) {
        setInputs(inputs.filter(x => x !== vname));
      } else {
        setInputs([...inputs, vname]);
        setOutputs(outputs.filter(x => x !== vname));
      }
    } else {
      const isAlreadyOut = outputs.includes(vname);
      if (isAlreadyOut) {
        setOutputs(outputs.filter(x => x !== vname));
      } else {
        setOutputs([...outputs, vname]);
        setInputs(inputs.filter(x => x !== vname));
      }
    }
  };

  const handleSubmit = () => {
    onSubmit({
      inputs,
      outputs,
      returnType
    });
  };

  const allVariablesSorted = vars.every(v => inputs.includes(v) || outputs.includes(v));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      
      {/* Code Snippet Box */}
      {content.functionBody && (
        <div 
          style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '9px', 
            backgroundColor: '#070709', 
            border: '1px solid #1a1a24', 
            borderRadius: '4px',
            padding: '8px',
            maxHeight: '120px',
            overflowY: 'auto',
            color: '#B0ADC6',
            whiteSpace: 'pre',
            userSelect: 'text'
          }}
        >
          {content.functionBody}
        </div>
      )}

      {/* Variables classification list */}
      <div>
        <span className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
          CLASSIFY SYSTEM VARIABLES:
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {vars.map(vname => {
            const isInput = inputs.includes(vname);
            const isOutput = outputs.includes(vname);
            return (
              <div 
                key={vname} 
                className="draggable-item" 
                style={{ 
                  margin: 0, 
                  padding: '4px 6px',
                  justifyContent: 'space-between',
                  borderColor: isInput ? 'var(--accent-color)' : isOutput ? 'var(--success-color)' : 'var(--border-color)'
                }}
              >
                <code style={{ fontSize: '10px', fontWeight: 'bold' }}>{vname}</code>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    className="btn"
                    disabled={isCompleted}
                    onClick={() => toggleVariable(vname, 'input')}
                    style={{
                      padding: '1px 6px',
                      fontSize: '8px',
                      borderColor: isInput ? 'var(--accent-color)' : 'var(--border-color)',
                      backgroundColor: isInput ? 'rgba(124, 109, 250, 0.15)' : 'var(--surface-color)',
                      color: isInput ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}
                  >
                    Input
                  </button>
                  <button
                    className="btn"
                    disabled={isCompleted}
                    onClick={() => toggleVariable(vname, 'output')}
                    style={{
                      padding: '1px 6px',
                      fontSize: '8px',
                      borderColor: isOutput ? 'var(--success-color)' : 'var(--border-color)',
                      backgroundColor: isOutput ? 'rgba(45, 212, 160, 0.1)' : 'var(--surface-color)',
                      color: isOutput ? 'var(--success-color)' : 'var(--text-muted)'
                    }}
                  >
                    Output
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Return Type MCQ Bonus */}
      {options.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }} className="text-muted">
            BONUS: What is the return signature of this function?
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {options.map(opt => {
              const isSelected = returnType === opt;
              const isCorrectType = content.correctReturnType === opt && isCompleted;
              return (
                <button
                  key={opt}
                  className="btn"
                  disabled={isCompleted}
                  onClick={() => setReturnType(opt)}
                  style={{
                    fontSize: '9.5px',
                    padding: '4px',
                    borderColor: isCorrectType ? 'var(--success-color)' : isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                    backgroundColor: isCorrectType ? 'rgba(45, 212, 160, 0.1)' : isSelected ? 'rgba(124, 109, 250, 0.1)' : 'var(--surface-color)'
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={!allVariablesSorted || !returnType || isEvaluating}
          style={{ width: '100%', marginTop: '6px' }}
        >
          {isEvaluating ? 'Checking scopes...' : 'Verify IO Boundaries'}
        </button>
      )}
    </div>
  );
}
