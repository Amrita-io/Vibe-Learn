import React, { useState, useEffect } from 'react';
import { Feature, Mission, MissionTask, ConceptGraph, ConceptNode } from '../types';
import { ShieldIcon, SwordIcon, CheckIcon, FolderIcon, LockIcon } from './Icons';
import TaskMatcher from './TaskMatcher';
import TaskSorter from './TaskSorter';
import TaskSequencer from './TaskSequencer';
import TaskConnector from './TaskConnector';

// Phase 2 components
import TaskTracer from './TaskTracer';
import TaskEventMCQ from './TaskEventMCQ';
import TaskFileInvestigator from './TaskFileInvestigator';
import TaskDependencyMap from './TaskDependencyMap';
import TaskFunctionReconstructor from './TaskFunctionReconstructor';
import TaskIOIdentifier from './TaskIOIdentifier';
import TaskReconstructText from './TaskReconstructText';

// Phase 3 components
import TaskSyntaxMCQ from './TaskSyntaxMCQ';
import TaskLibraryBreakdown from './TaskLibraryBreakdown';
import TaskSyntaxSpotlight from './TaskSyntaxSpotlight';
import TaskDecisionMCQ from './TaskDecisionMCQ';
import TaskTradeoffAnalyzer from './TaskTradeoffAnalyzer';
import TaskAlternativeRanker from './TaskAlternativeRanker';
import TaskSyntaxRebuild from './TaskSyntaxRebuild';
import TaskFailureDiagnosis from './TaskFailureDiagnosis';

// Phase 4 components
import TaskConceptTree from './TaskConceptTree';
import TaskConceptDiscovery from './TaskConceptDiscovery';
import TaskConceptMCQ from './TaskConceptMCQ';
import TaskConceptPrereqMap from './TaskConceptPrereqMap';
import TaskConceptApply from './TaskConceptApply';
import TaskConceptReconstruct from './TaskConceptReconstruct';

interface MissionControlProps {
  feature: Feature;
  mission: Mission | undefined;
  conceptGraph?: ConceptGraph;
  unlockedPulseIds?: string[];
  initialTab?: 'architecture' | 'logic' | 'syntax' | 'engineering' | 'concepts';
  selectMission: (mid: string) => void;
  onOpenFile: (path: string) => void;
  onSubmitEvaluation: (
    featureId: string,
    missionId: string,
    taskId: string,
    taskType: string,
    taskContent: any,
    submission: any
  ) => Promise<{ isCorrect: boolean; feedback: string }>;
}

export default function MissionControl({
  feature,
  mission,
  conceptGraph,
  unlockedPulseIds = [],
  initialTab = 'architecture',
  selectMission,
  onOpenFile,
  onSubmitEvaluation
}: MissionControlProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; isCorrect: boolean } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<Record<string, number>>({});

  // Tabs navigation state
  const [activePillarTab, setActivePillarTab] = useState<'architecture' | 'logic' | 'syntax' | 'engineering' | 'concepts'>(initialTab);

  useEffect(() => {
    setActivePillarTab(initialTab);
  }, [initialTab]);

  const [activeLogicSubTab, setActiveLogicSubTab] = useState<'system' | 'file' | 'function'>('system');

  // Filter feature missions based on active tab
  const getFilteredMissions = (): Mission[] => {
    const allMissions = feature.missions || [];
    if (activePillarTab === 'architecture') {
      return allMissions.filter(m => m.pillar === 'architecture');
    }
    if (activePillarTab === 'logic') {
      if (activeLogicSubTab === 'system') return allMissions.filter(m => m.pillar === 'system_logic');
      if (activeLogicSubTab === 'file') return allMissions.filter(m => m.pillar === 'file_logic');
      if (activeLogicSubTab === 'function') return allMissions.filter(m => m.pillar === 'function_logic');
    }
    if (activePillarTab === 'syntax') {
      return allMissions.filter(m => m.pillar === 'syntax');
    }
    if (activePillarTab === 'engineering') {
      return allMissions.filter(m => m.pillar === 'engineering_decisions');
    }
    return [];
  };

  const filteredMissions = getFilteredMissions();
  const activeFilteredMission = filteredMissions.find(m => m.status === 'active') || filteredMissions[0];

  const selectedConcept = conceptGraph?.nodes.find(n => n.id === selectedConceptId);
  const conceptTasks = selectedConcept?.tasks || [];
  const activeConceptTask = conceptTasks.find(t => t.id === selectedTaskId) || conceptTasks.find(t => !t.isCompleted) || conceptTasks[0];

  useEffect(() => {
    setSelectedTaskId(null);
    setFeedback(null);
  }, [activePillarTab, activeLogicSubTab, selectedConceptId]);

  const tasks = activePillarTab === 'concepts' ? conceptTasks : (activeFilteredMission?.tasks || []);
  const activeTask = activePillarTab === 'concepts' ? activeConceptTask : (tasks.find(t => t.id === selectedTaskId) || tasks.find(t => !t.isCompleted) || tasks[0]);

  const handleTaskSubmit = async (submission: any) => {
    const currentTask = activeTask;
    if (!currentTask) return;
    
    const isConcept = activePillarTab === 'concepts';
    if (!isConcept && !activeFilteredMission) return;

    setIsEvaluating(true);
    setFeedback(null);
    try {
      const currentAttempt = (attempts[currentTask.id] || 0) + 1;
      const submissionWithAttempt = { ...submission, attempt: currentAttempt };
      
      const res = await onSubmitEvaluation(
        isConcept ? "concepts" : feature.id,
        isConcept ? selectedConceptId! : activeFilteredMission.id,
        currentTask.id,
        currentTask.type,
        currentTask.content,
        submissionWithAttempt
      );
      setFeedback({ text: res.feedback, isCorrect: res.isCorrect });
      if (res.isCorrect) {
        // Clear selected task so it auto advances
        setTimeout(() => {
          setFeedback(null);
          const remaining = tasks.filter(t => t.id !== currentTask.id && !t.isCompleted);
          if (remaining.length > 0) {
            setSelectedTaskId(remaining[0].id);
          }
        }, 3000);
      } else {
        // Increment attempts on failure
        setAttempts(prev => ({
          ...prev,
          [currentTask.id]: currentAttempt
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
      
      {/* Pillar Selection Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          <button 
            className={`btn`} 
            onClick={() => setActivePillarTab('architecture')}
            style={{ 
              fontSize: '10px', 
              padding: '4px 8px',
              borderColor: activePillarTab === 'architecture' ? 'var(--accent-color)' : 'var(--border-color)',
              backgroundColor: activePillarTab === 'architecture' ? 'rgba(124, 109, 250, 0.15)' : 'var(--surface-color)'
            }}
          >
            Architecture
          </button>
          <button 
            className={`btn`} 
            onClick={() => setActivePillarTab('logic')}
            style={{ 
              fontSize: '10px', 
              padding: '4px 8px',
              borderColor: activePillarTab === 'logic' ? 'var(--accent-color)' : 'var(--border-color)',
              backgroundColor: activePillarTab === 'logic' ? 'rgba(124, 109, 250, 0.15)' : 'var(--surface-color)'
            }}
          >
            Logic
          </button>
          <button 
            className={`btn`} 
            onClick={() => setActivePillarTab('syntax')}
            style={{ 
              fontSize: '10px', 
              padding: '4px 8px',
              borderColor: activePillarTab === 'syntax' ? 'var(--accent-color)' : 'var(--border-color)',
              backgroundColor: activePillarTab === 'syntax' ? 'rgba(124, 109, 250, 0.15)' : 'var(--surface-color)'
            }}
          >
            Syntax
          </button>
          <button 
            className={`btn`} 
            onClick={() => setActivePillarTab('engineering')}
            style={{ 
              fontSize: '10px', 
              padding: '4px 8px',
              borderColor: activePillarTab === 'engineering' ? 'var(--accent-color)' : 'var(--border-color)',
              backgroundColor: activePillarTab === 'engineering' ? 'rgba(124, 109, 250, 0.15)' : 'var(--surface-color)'
            }}
          >
            Engineering
          </button>
          {/* Concepts tab */}
          <button 
            className={`btn`} 
            onClick={() => setActivePillarTab('concepts')}
            style={{ 
              fontSize: '10px', 
              padding: '4px 8px',
              borderColor: activePillarTab === 'concepts' ? 'var(--accent-color)' : 'var(--border-color)',
              backgroundColor: activePillarTab === 'concepts' ? 'rgba(124, 109, 250, 0.15)' : 'var(--surface-color)'
            }}
          >
            Concepts ({conceptGraph?.nodes.filter(n => n.status === 'completed').length || 0}/{conceptGraph?.nodes.length || 0})
          </button>
        </div>

        {/* Logic Subtabs */}
        {activePillarTab === 'logic' && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', paddingLeft: '8px' }}>
            {(['system', 'file', 'function'] as const).map(sub => (
              <button
                key={sub}
                className="btn"
                onClick={() => setActiveLogicSubTab(sub)}
                style={{
                  fontSize: '9.5px',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  borderColor: activeLogicSubTab === sub ? 'var(--accent-color)' : 'transparent',
                  backgroundColor: activeLogicSubTab === sub ? 'rgba(124, 109, 250, 0.1)' : 'transparent',
                  color: activeLogicSubTab === sub ? 'var(--text-primary)' : 'var(--text-muted)'
                }}
              >
                {sub.charAt(0).toUpperCase() + sub.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Renders Selected Active Mission Details */}
      {activePillarTab === 'concepts' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <TaskConceptTree
            conceptGraph={conceptGraph!}
            selectedConceptId={selectedConceptId}
            onSelectConcept={(concept) => {
              setSelectedConceptId(concept.id);
              setSelectedTaskId(null); // let it auto-select first incomplete task
              setFeedback(null);
            }}
            unlockedPulseIds={unlockedPulseIds}
          />
          
          {selectedConcept && (
            <div className="card" style={{ borderTop: '2px solid var(--accent-color)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>
                  {selectedConcept.full_name}
                </h3>
                <span className="badge badge-indigo" style={{ fontSize: '8px', textTransform: 'uppercase' }}>
                  {selectedConcept.difficulty}
                </span>
              </div>
              
              {/* Concept Tasks selection buttons */}
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                {conceptTasks.map((t, idx) => {
                  const isSelected = activeTask && t.id === activeTask.id;
                  const mcqCompleted = conceptTasks.find(tk => tk.type === 'concept-mcq')?.isCompleted;
                  const isApplyLocked = t.type === 'concept-apply' && !mcqCompleted;
                  
                  return (
                    <button
                      key={t.id}
                      disabled={isApplyLocked}
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setFeedback(null);
                      }}
                      className="btn"
                      style={{
                        flexShrink: 0,
                        fontSize: '11px',
                        padding: '6px 10px',
                        opacity: isApplyLocked ? 0.4 : 1,
                        borderColor: isSelected ? 'var(--accent-color)' : t.isCompleted ? 'var(--success-color)' : 'var(--border-color)',
                        backgroundColor: isSelected ? 'rgba(124, 109, 250, 0.1)' : t.isCompleted ? 'rgba(45, 212, 160, 0.05)' : 'var(--surface-color)',
                        color: t.isCompleted ? 'var(--success-color)' : 'var(--text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      {isApplyLocked && <LockIcon size={10} />}
                      {t.isCompleted ? <CheckIcon size={12} /> : null}
                      Task {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Selected Concept Task Workspace */}
              {activeTask && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }} className="text-muted">
                      OBJECTIVE: {activeTask.type.replace('concept-', '')}
                    </span>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                      {activeTask.prompt}
                    </div>
                  </div>

                  <div style={{ minHeight: '160px' }}>
                    {activeTask.type === 'concept-discovery' && (
                      <TaskConceptDiscovery content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                    )}
                    {activeTask.type === 'concept-mcq' && (
                      <TaskConceptMCQ content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                    )}
                    {activeTask.type === 'concept-prereq-map' && (
                      <TaskConceptPrereqMap content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                    )}
                    {activeTask.type === 'concept-apply' && (
                      <TaskConceptApply content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                    )}
                    {activeTask.type === 'concept-reconstruction' && (
                      <TaskConceptReconstruct content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                    )}
                  </div>
                  
                  {/* File References for Concept */}
                  {selectedConcept.files_where_used && selectedConcept.files_where_used.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '9px', display: 'block', marginBottom: '6px' }} className="text-muted">
                        WORKSPACE IMPLEMENTATION FILE:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {selectedConcept.files_where_used.map(file => (
                          <div key={file} className="draggable-item" onClick={() => onOpenFile(file)} style={{ cursor: 'pointer', margin: 0 }}>
                            <FolderIcon size={12} className="text-accent" />
                            <span>{file}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  {feedback && (
                    <div 
                      style={{
                        backgroundColor: feedback.isCorrect ? 'rgba(45, 212, 160, 0.15)' : 'rgba(245, 166, 35, 0.1)',
                        border: `1px solid ${feedback.isCorrect ? 'var(--success-color)' : 'var(--warning-color)'}`,
                        borderRadius: '6px',
                        padding: '8px 10px',
                        fontSize: '11px',
                        animation: 'glow-pulse 2s infinite',
                        color: feedback.isCorrect ? 'var(--success-color)' : 'var(--warning-color)'
                      }}
                    >
                      {feedback.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : !activeFilteredMission ? (
        <div style={{ textAlign: 'center', padding: '24px' }} className="card">
          <LockIcon size={24} className="text-warning" style={{ marginBottom: '8px' }} />
          <h4 style={{ margin: '0 0 4px 0', fontSize: '12px' }} className="text-warning">SECTOR DECRYPTION REQUIRED</h4>
          <p className="text-muted" style={{ fontSize: '10.5px', margin: 0 }}>
            Master preceding levels and check off active targets to unlock {activePillarTab === 'logic' ? `${activeLogicSubTab} logic` : activePillarTab} missions.
          </p>
        </div>
      ) : (
        <>
          {/* Active Mission Overview Card */}
          <div className="card" style={{ borderLeft: '3px solid var(--accent-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className="text-accent" style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                ACTIVE INVESTIGATION
              </span>
              <span className="badge badge-indigo" style={{ fontFamily: 'var(--font-mono)' }}>
                +{activeFilteredMission.xpReward} IP
              </span>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold' }}>{activeFilteredMission.title}</h3>
            <p className="text-muted" style={{ fontSize: '11px', margin: 0 }}>
              {activeFilteredMission.description}
            </p>
          </div>

          {/* Task selection tags */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
            {tasks.map((t, idx) => {
              const isSelected = activeTask && t.id === activeTask.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTaskId(t.id);
                    setFeedback(null);
                  }}
                  className="btn"
                  style={{
                    flexShrink: 0,
                    fontSize: '11px',
                    padding: '6px 10px',
                    borderColor: isSelected ? 'var(--accent-color)' : t.isCompleted ? 'var(--success-color)' : 'var(--border-color)',
                    backgroundColor: isSelected ? 'rgba(124, 109, 250, 0.1)' : t.isCompleted ? 'rgba(45, 212, 160, 0.05)' : 'var(--surface-color)',
                    color: t.isCompleted ? 'var(--success-color)' : 'var(--text-primary)'
                  }}
                >
                  {t.isCompleted ? <CheckIcon size={12} /> : null}
                  Task {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Active Task workspace */}
          {activeTask && (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }} className="text-muted">
                  OBJECTIVE: {activeTask.type.replace('-', ' ')}
                </span>
                <div style={{ fontSize: '11.5px', fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                  {activeTask.prompt}
                </div>
              </div>

              {/* Dynamic Task Component Swapper */}
              <div style={{ flex: 1, minHeight: '180px' }}>
                {/* Phase 1 types */}
                {activeTask.type === 'component-match' && (
                  <TaskMatcher content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'boundary-sort' && (
                  <TaskSorter content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'flow-sequence' && (
                  <TaskSequencer content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'connection-identify' && (
                  <TaskConnector content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}

                {/* Phase 2 types */}
                {activeTask.type === 'trace-path' && (
                  <TaskTracer content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'event-mcq' && (
                  <TaskEventMCQ content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'file-investigator' && (
                  <TaskFileInvestigator content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'dependency-map' && (
                  <TaskDependencyMap content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'func-rebuild' && (
                  <TaskFunctionReconstructor content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'io-mapper' && (
                  <TaskIOIdentifier content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'reconstruct-text' && (
                  <TaskReconstructText content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'syntax-intent' && (
                  <TaskSyntaxMCQ content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'syntax-spotlight' && (
                  <TaskSyntaxSpotlight content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'lib-rationale' && (
                  <TaskLibraryBreakdown content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'syntax-predict' && (
                  <TaskSyntaxMCQ content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'syntax-rebuild' && (
                  <TaskSyntaxRebuild content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'eng-problem' && (
                  <TaskSyntaxMCQ content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'eng-simulator' && (
                  <TaskDecisionMCQ content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'eng-failure' && (
                  <TaskFailureDiagnosis content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'eng-tradeoffs' && (
                  <TaskTradeoffAnalyzer content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
                {activeTask.type === 'alternative-ranker' && (
                  <TaskAlternativeRanker content={activeTask.content} onSubmit={handleTaskSubmit} isEvaluating={isEvaluating} isCompleted={activeTask.isCompleted} />
                )}
              </div>

              {/* Code reference file list */}
              <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '9px', display: 'block', marginBottom: '6px' }} className="text-muted">
                  CODE REFERENCE INVESTIGATION NODES:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* Phase 1 files references */}
                  {activeTask.content.matchingItems?.map(item => (
                    <div key={item.id} className="draggable-item" onClick={() => onOpenFile(item.name)} style={{ cursor: 'pointer', margin: 0 }}>
                      <FolderIcon size={12} className="text-accent" />
                      <span>{item.name}</span>
                    </div>
                  ))}
                  {activeTask.content.boundaryItems?.filter(bi => bi.isInternal).map(item => (
                    <div key={item.id} className="draggable-item" onClick={() => onOpenFile(item.name)} style={{ cursor: 'pointer', margin: 0 }}>
                      <FolderIcon size={12} className="text-accent" />
                      <span>{item.name}</span>
                    </div>
                  ))}
                  {activeTask.content.flowSteps?.map(step => (
                    <div key={step.id} className="draggable-item" onClick={() => onOpenFile(step.component)} style={{ cursor: 'pointer', margin: 0 }}>
                      <FolderIcon size={12} className="text-accent" />
                      <span>{step.component}</span>
                    </div>
                  ))}
                  {/* Phase 2 file references */}
                  {activeTask.content.fileName && (
                    <div className="draggable-item" onClick={() => onOpenFile(activeTask.content.fileName!)} style={{ cursor: 'pointer', margin: 0 }}>
                      <FolderIcon size={12} className="text-accent" />
                      <span>{activeTask.content.fileName}</span>
                    </div>
                  )}
                  {activeTask.content.nodesList?.map(node => (
                    <div key={node} className="draggable-item" onClick={() => onOpenFile(node)} style={{ cursor: 'pointer', margin: 0 }}>
                      <FolderIcon size={12} className="text-accent" />
                      <span>{node}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evaluation Feedback */}
              {feedback && (
                <div 
                  style={{
                    backgroundColor: feedback.isCorrect ? 'rgba(45, 212, 160, 0.15)' : 'rgba(245, 166, 35, 0.1)',
                    border: `1px solid ${feedback.isCorrect ? 'var(--success-color)' : 'var(--warning-color)'}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    animation: 'glow-pulse 2s infinite',
                    color: feedback.isCorrect ? 'var(--success-color)' : 'var(--warning-color)'
                  }}
                >
                  {feedback.text}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
