import React from 'react';
import { ConceptGraph, ConceptNode } from '../types';
import { LockIcon, CheckIcon } from './Icons';

interface TaskConceptTreeProps {
  conceptGraph: ConceptGraph;
  selectedConceptId: string | null;
  onSelectConcept: (concept: ConceptNode) => void;
  unlockedPulseIds?: string[]; // newly unlocked concept IDs to animate
}

export default function TaskConceptTree({
  conceptGraph,
  selectedConceptId,
  onSelectConcept,
  unlockedPulseIds = []
}: TaskConceptTreeProps) {
  const { nodes = [], categories = [] } = conceptGraph;

  // Group nodes by category
  const getNodesByCategory = (category: string) => {
    return nodes.filter(node => node.categories.includes(category));
  };

  // Sort nodes in a category by difficulty/prerequisites depth
  const getSortedCategoryNodes = (category: string) => {
    const catNodes = getNodesByCategory(category);
    // Sort order: beginner -> intermediate -> advanced
    const diffWeight = { beginner: 1, intermediate: 2, advanced: 3 };
    return [...catNodes].sort((a, b) => {
      const diffDiff = diffWeight[a.difficulty] - diffWeight[b.difficulty];
      if (diffDiff !== 0) return diffDiff;
      return a.prerequisites.length - b.prerequisites.length;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ borderLeft: '3px solid var(--accent-color)' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-primary)' }}>
          CODEBASE KNOWLEDGE GRAPH
        </h3>
        <p className="text-muted" style={{ fontSize: '11px', margin: 0 }}>
          Trace how concepts connect within your codebase. Complete prerequisite nodes to unlock advanced architectural pathways.
        </p>
      </div>

      {/* Category Lanes Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '4px'
      }}>
        {categories.map((cat) => {
          const catNodes = getSortedCategoryNodes(cat);
          if (catNodes.length === 0) return null;

          return (
            <div 
              key={cat} 
              style={{
                borderBottom: '1px solid #1c1c24',
                paddingBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {/* Category Title Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px'
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: 'var(--accent-color)'
                }}>
                  {cat} Track
                </span>
                <span className="text-muted" style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}>
                  {catNodes.filter(n => n.status === 'completed').length} / {catNodes.length} Mastered
                </span>
              </div>

              {/* Lane Row Nodes */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center'
              }}>
                {catNodes.map((node) => {
                  const isSelected = node.id === selectedConceptId;
                  const isCompleted = node.status === 'completed';
                  const isLocked = node.status === 'locked';
                  const isPulse = unlockedPulseIds.includes(node.id);

                  // Setup borders and background color based on status
                  let borderStyle = '1px solid var(--border-color)';
                  let bgStyle = 'var(--surface-color)';
                  let nameColor = 'var(--text-muted)';
                  let opacityStyle = 1;

                  if (isCompleted) {
                    borderStyle = '1px solid rgba(45, 212, 160, 0.4)';
                    bgStyle = 'rgba(45, 212, 160, 0.04)';
                    nameColor = 'var(--success-color)';
                  } else if (!isLocked) {
                    borderStyle = isSelected ? '1px solid var(--accent-color)' : '1px solid rgba(124, 109, 250, 0.3)';
                    bgStyle = isSelected ? 'rgba(124, 109, 250, 0.15)' : 'rgba(124, 109, 250, 0.03)';
                    nameColor = 'var(--text-primary)';
                  } else {
                    opacityStyle = 0.55;
                  }

                  return (
                    <div
                      key={node.id}
                      onClick={() => !isLocked && onSelectConcept(node)}
                      className={`concept-node-card ${isPulse ? 'pulse-unlock' : ''} ${isLocked ? 'locked-node-disabled' : 'clickable-node'}`}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: borderStyle,
                        backgroundColor: bgStyle,
                        opacity: opacityStyle,
                        minWidth: '130px',
                        flex: '1 1 calc(33.3% - 8px)',
                        maxWidth: 'calc(50% - 4px)',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 10px rgba(124, 109, 250, 0.2)' : 'none',
                        position: 'relative'
                      }}
                      title={isLocked ? `Locked. Requires: ${node.prerequisites.map(p => p.replace('cn_', '')).join(', ')}` : node.full_name}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: nameColor }}>
                          {node.name}
                        </span>
                        {isCompleted && (
                          <div style={{ color: 'var(--success-color)', display: 'flex' }}>
                            <CheckIcon size={12} />
                          </div>
                        )}
                        {isLocked && (
                          <div style={{ color: 'var(--warning-color)', display: 'flex' }}>
                            <LockIcon size={11} />
                          </div>
                        )}
                      </div>

                      {/* Difficulty Subtitle */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginTop: '4px',
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)'
                      }} className="text-muted">
                        <span>Lvl: {node.difficulty}</span>
                        {node.mastery_score > 0 && (
                          <span style={{ color: isCompleted ? 'var(--success-color)' : 'var(--accent-color)' }}>
                            {Math.round(node.mastery_score)}% Mstr
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
