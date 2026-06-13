import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';

interface TaskAlternativeRankerProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

interface RankedOption {
  originalIndex: number;
  text: string;
}

export default function TaskAlternativeRanker({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskAlternativeRankerProps) {
  const optionsToRank = content.optionsToRank || [];
  const correctRanking = content.correctRanking || [];
  const requiredKeywords = content.requiredKeywords || [];

  const [rankedList, setRankedList] = useState<RankedOption[]>([]);
  const [justification, setJustification] = useState<string>('');

  useEffect(() => {
    // Initialize list in original order
    const initialList = optionsToRank.map((text, index) => ({
      originalIndex: index,
      text: text
    }));

    if (isCompleted && correctRanking.length > 0) {
      // Sort by correctRanking order
      const sorted = correctRanking.map(origIdx => ({
        originalIndex: origIdx,
        text: optionsToRank[origIdx]
      }));
      setRankedList(sorted);
    } else {
      setRankedList(initialList);
      setJustification('');
    }
  }, [content, isCompleted]);

  const moveUp = (index: number) => {
    if (isCompleted || index === 0) return;
    setRankedList(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (isCompleted || index === rankedList.length - 1) return;
    setRankedList(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleSubmit = () => {
    const indicesOrder = rankedList.map(item => item.originalIndex);
    onSubmit({
      ranking: indicesOrder,
      justification: justification
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Ranking Scenario */}
      {content.scenario && (
        <div 
          style={{ 
            fontSize: '11px', 
            backgroundColor: '#0D0D0F', 
            borderLeft: '3px solid #7C6DFA', 
            padding: '8px 10px',
            borderRadius: '4px',
            color: 'var(--text-primary)'
          }}
        >
          <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-accent">
            RANKING OBJECTIVE
          </span>
          {content.scenario}
        </div>
      )}

      {/* Sorting Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }} className="text-muted">
          ORDER OPTIONS (1st = HIGHEST / BEST, LAST = LOWEST / WORST):
        </span>
        {rankedList.map((item, index) => {
          let borderColor = 'var(--border-color)';
          let bgColor = 'var(--surface-color)';

          if (isCompleted && correctRanking.length > 0) {
            const isCorrectPosition = correctRanking[index] === item.originalIndex;
            borderColor = isCorrectPosition ? 'var(--success-color)' : 'var(--warning-color)';
            bgColor = isCorrectPosition ? 'rgba(45, 212, 160, 0.08)' : 'rgba(245, 166, 35, 0.05)';
          }

          return (
            <div
              key={item.originalIndex}
              className="draggable-item"
              style={{
                margin: 0,
                fontSize: '11px',
                borderColor: borderColor,
                backgroundColor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <span 
                  className="flex-center" 
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}
                >
                  {index + 1}
                </span>
                <span>{item.text}</span>
              </div>

              {!isCompleted && (
                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                  <button 
                    className="btn" 
                    onClick={() => moveUp(index)} 
                    disabled={index === 0}
                    style={{ fontSize: '9px', padding: '2px 4px' }}
                    title="Move Up"
                  >
                    ▲
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => moveDown(index)} 
                    disabled={index === rankedList.length - 1}
                    style={{ fontSize: '9px', padding: '2px 4px' }}
                    title="Move Down"
                  >
                    ▼
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Written justification */}
      <div style={{ marginTop: '4px' }}>
        <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-muted">
          EXPLAIN YOUR RANKING ORDER:
        </span>
        {!isCompleted ? (
          <>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide a logical justification explaining this priority order..."
              style={{
                width: '100%',
                height: '45px',
                backgroundColor: '#0D0D0F',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '10.5px',
                padding: '6px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none'
              }}
            />
            {requiredKeywords.length > 0 && (
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Required keywords: {requiredKeywords.map(kw => {
                  const isMatched = justification.toLowerCase().includes(kw.toLowerCase());
                  return (
                    <span 
                      key={kw} 
                      style={{ 
                        marginRight: '6px', 
                        color: isMatched ? 'var(--success-color)' : 'var(--text-muted)',
                        fontWeight: isMatched ? 'bold' : 'normal'
                      }}
                    >
                      {isMatched ? '✓' : '○'} {kw}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '4px' }}>
            Justification evaluated and approved.
          </div>
        )}
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
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }} className="text-success">RANKING ANALYSIS:</span>
          <span className="text-muted">{content.explanation}</span>
        </div>
      )}

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={(requiredKeywords.length > 0 && !justification) || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Evaluating ranking choices...' : 'Submit Ranking & Justification'}
        </button>
      )}
    </div>
  );
}
