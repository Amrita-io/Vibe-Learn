import React, { useState } from 'react';
import { MissionTaskContent } from '../types';
import { CheckIcon, LockIcon } from './Icons';

interface TaskConceptMCQProps {
  content: MissionTaskContent;
  onSubmit: (submission: { questionIndex: number; optionIndex: number }) => Promise<{ isCorrect: boolean; feedback: string }>;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskConceptMCQ({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskConceptMCQProps) {
  const qList = content.questionsList || [];
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [stageCompleted, setStageCompleted] = useState<Record<number, boolean>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean>(false);

  const activeQuestion = qList[currentStage];

  const handleChoiceSelect = (idx: number) => {
    if (stageCompleted[currentStage] || isCompleted) return;
    setSelectedIdx(idx);
    setFeedbackMsg(null);
  };

  const handleStageSubmit = async () => {
    if (selectedIdx === null || !activeQuestion) return;
    
    try {
      const res = await onSubmit({
        questionIndex: currentStage,
        optionIndex: selectedIdx
      });

      setFeedbackMsg(res.feedback);
      setIsCorrectFeedback(res.isCorrect);

      if (res.isCorrect) {
        setStageCompleted(prev => ({
          ...prev,
          [currentStage]: true
        }));
        
        // Auto-advance to next stage after a delay if not final stage
        if (currentStage < qList.length - 1) {
          setTimeout(() => {
            setCurrentStage(prev => prev + 1);
            setSelectedIdx(null);
            setFeedbackMsg(null);
          }, 2500);
        }
      }
    } catch (err) {
      console.error(err);
      setFeedbackMsg("Evaluation failed. Please try again.");
      setIsCorrectFeedback(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Concept Meta Details Card */}
      <div className="card" style={{ borderLeft: '3px solid var(--accent-color)', padding: '10px' }}>
        <h4 style={{ margin: '0 0 2px 0', fontSize: '11px', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
          Concept Overview: {content.targetConcept}
        </h4>
        <p style={{ fontSize: '11.5px', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          {content.one_liner}
        </p>
        <div style={{ borderTop: '1px solid #282836', paddingTop: '6px', fontSize: '10.5px' }} className="text-muted">
          <strong>Why used here:</strong> {content.why_used_here}
        </div>
      </div>

      {/* Stage Indicators */}
      <div style={{ display: 'flex', gap: '4px', margin: '4px 0' }}>
        {qList.map((_, idx) => {
          const isDone = stageCompleted[idx] || isCompleted;
          const isActive = idx === currentStage && !isCompleted;
          return (
            <div
              key={idx}
              onClick={() => (isDone || idx <= Object.keys(stageCompleted).length) && setCurrentStage(idx)}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: isDone ? 'rgba(45, 212, 160, 0.1)' : isActive ? 'rgba(124, 109, 250, 0.15)' : '#141418',
                border: isDone ? '1px solid var(--success-color)' : isActive ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                color: isDone ? 'var(--success-color)' : isActive ? 'var(--accent-color)' : 'var(--text-muted)'
              }}
            >
              Stage {idx + 1} {isDone && '✓'}
            </div>
          );
        })}
      </div>

      {/* Stage Question Workspace */}
      {activeQuestion && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {activeQuestion.prompt}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeQuestion.options?.map((opt, idx) => {
              const isSelected = selectedIdx === idx;
              const isStageDone = stageCompleted[currentStage] || isCompleted;
              return (
                <button
                  key={idx}
                  onClick={() => handleChoiceSelect(idx)}
                  disabled={isStageDone}
                  className="btn"
                  style={{
                    textAlign: 'left',
                    fontSize: '11px',
                    padding: '8px 10px',
                    borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                    backgroundColor: isSelected ? 'rgba(124, 109, 250, 0.08)' : 'var(--surface-color)',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: isStageDone ? 'default' : 'pointer'
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Feedback Section */}
          {feedbackMsg && (
            <div style={{
              padding: '8px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              backgroundColor: isCorrectFeedback ? 'rgba(45, 212, 160, 0.08)' : 'rgba(245, 166, 35, 0.08)',
              border: isCorrectFeedback ? '1px solid var(--success-color)' : '1px solid var(--warning-color)',
              color: isCorrectFeedback ? 'var(--success-color)' : 'var(--warning-color)'
            }}>
              {feedbackMsg}
            </div>
          )}

          {/* Submit Button */}
          {!stageCompleted[currentStage] && !isCompleted && (
            <button
              onClick={handleStageSubmit}
              disabled={selectedIdx === null || isEvaluating}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              {isEvaluating ? 'Checking...' : 'Submit Stage Answer'}
            </button>
          )}

          {stageCompleted[currentStage] && currentStage < qList.length - 1 && (
            <button
              onClick={() => {
                setCurrentStage(prev => prev + 1);
                setSelectedIdx(null);
                setFeedbackMsg(null);
              }}
              className="btn"
              style={{ width: '100%', padding: '10px', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
            >
              Proceed to Next Stage →
            </button>
          )}

          {isCompleted && (
            <div style={{ textAlign: 'center', color: 'var(--success-color)', fontSize: '12px', fontWeight: 'bold' }}>
              ✓ Comprehension Checks Complete!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
