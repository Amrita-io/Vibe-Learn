import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';
import { ConnectionIcon } from './Icons';

interface TaskDependencyMapProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskDependencyMap({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskDependencyMapProps) {
  const nodes = content.nodesList || [];
  const correctEdges = content.correctEdges || [];

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [edges, setEdges] = useState<[string, string][]>([]);

  useEffect(() => {
    if (isCompleted) {
      setEdges(correctEdges);
    } else {
      setEdges([]);
    }
  }, [content, isCompleted]);

  const handleNodeClick = (node: string) => {
    if (isCompleted) return;

    if (!selectedNode) {
      setSelectedNode(node);
    } else {
      if (selectedNode !== node) {
        // Add directional edge: selectedNode (Dependent) -> node (Dependency)
        const exists = edges.some(e => e[0] === selectedNode && e[1] === node);
        if (!exists) {
          setEdges([...edges, [selectedNode, node]]);
        }
      }
      setSelectedNode(null);
    }
  };

  const removeEdge = (index: number) => {
    if (isCompleted) return;
    setEdges(edges.filter((_, idx) => idx !== index));
  };

  const handleSubmit = () => {
    onSubmit({ edges });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      <div>
        <span className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
          CLICK THE DEPENDENT FILE, THEN CLICK THE FILE IT IMPORTS:
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {nodes.map((node) => {
            const isSelected = selectedNode === node;
            const isSource = edges.some(e => e[0] === node);
            const isTarget = edges.some(e => e[1] === node);
            
            let bColor = 'var(--border-color)';
            let bg = 'var(--surface-color)';
            if (isSelected) {
              bColor = 'var(--accent-color)';
              bg = 'rgba(124, 109, 250, 0.1)';
            } else if (isSource || isTarget) {
              bColor = isSource ? 'var(--accent-color)' : 'var(--success-color)';
              bg = 'rgba(124, 109, 250, 0.02)';
            }

            return (
              <div
                key={node}
                onClick={() => handleNodeClick(node)}
                className="node-circle"
                style={{
                  fontSize: '9.5px',
                  borderColor: bColor,
                  backgroundColor: bg,
                  cursor: isCompleted ? 'default' : 'pointer'
                }}
              >
                {node.split('/').pop()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edge mapping outputs */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
        <span className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
          MAPPED IMPORT EDGES ({edges.length}):
        </span>
        {edges.length === 0 ? (
          <div style={{ fontSize: '10px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
            No dependency paths drawn yet. Click source and target nodes to link.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {edges.map((edge, idx) => (
              <div 
                key={idx} 
                className="draggable-item" 
                style={{ 
                  margin: 0, 
                  justifyContent: 'space-between', 
                  fontSize: '9px',
                  padding: '4px 8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ConnectionIcon size={12} className="text-accent" />
                  <span style={{ fontWeight: 'bold' }}>{edge[0].split('/').pop()}</span>
                  <span className="text-muted">imports ---&gt;</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>{edge[1].split('/').pop()}</span>
                </div>
                {!isCompleted && (
                  <button 
                    onClick={() => removeEdge(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: '0 4px'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!isCompleted && (
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={edges.length === 0 || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Tracing import graphs...' : 'Verify Import Network'}
        </button>
      )}
    </div>
  );
}
