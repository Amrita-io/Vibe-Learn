import React, { useState, useEffect } from 'react';
import { MissionTaskContent } from '../types';
import { ConnectionIcon } from './Icons';

interface TaskConnectorProps {
  content: MissionTaskContent;
  onSubmit: (submission: any) => void;
  isEvaluating: boolean;
  isCompleted: boolean;
}

export default function TaskConnector({
  content,
  onSubmit,
  isEvaluating,
  isCompleted
}: TaskConnectorProps) {
  const nodes = content.nodes || [];
  const correctConns = content.correctConnections || [];
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connections, setConnections] = useState<[string, string][]>([]);

  useEffect(() => {
    if (isCompleted) {
      setConnections(correctConns);
    } else {
      setConnections([]);
    }
  }, [content, isCompleted]);

  const handleNodeClick = (node: string) => {
    if (isCompleted) return;

    if (!selectedNode) {
      setSelectedNode(node);
    } else {
      if (selectedNode !== node) {
        // Add connection if it doesn't already exist (order independent)
        const exists = connections.some(c => 
          (c[0] === selectedNode && c[1] === node) || 
          (c[0] === node && c[1] === selectedNode)
        );

        if (!exists) {
          setConnections([...connections, [selectedNode, node]]);
        }
      }
      setSelectedNode(null);
    }
  };

  const removeConnection = (index: number) => {
    if (isCompleted) return;
    setConnections(connections.filter((_, idx) => idx !== index));
  };

  const handleSubmit = () => {
    onSubmit({ connections });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Node selection area */}
      <div>
        <span className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
          SELECT TWO COMPONENTS TO ESTABLISH LINK:
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {nodes.map((node) => {
            const isSelected = selectedNode === node;
            const isPartOffConn = connections.some(c => c[0] === node || c[1] === node);
            return (
              <div
                key={node}
                onClick={() => handleNodeClick(node)}
                className={`node-circle ${isSelected ? 'selected' : ''}`}
                style={{
                  fontSize: '10px',
                  borderColor: isSelected 
                    ? 'var(--accent-color)' 
                    : isPartOffConn 
                      ? 'var(--success-color)' 
                      : 'var(--border-color)',
                  backgroundColor: isSelected 
                    ? 'rgba(124, 109, 250, 0.1)' 
                    : isPartOffConn 
                      ? 'rgba(45, 212, 160, 0.02)' 
                      : 'var(--surface-color)',
                  cursor: isCompleted ? 'default' : 'pointer'
                }}
              >
                {node.split('/').pop()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Established Connections List */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
        <span className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
          ESTABLISHED CONNECTION LINKS ({connections.length}):
        </span>
        {connections.length === 0 ? (
          <div style={{ fontSize: '10px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
            No connections mapped yet. Click component nodes above to link.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {connections.map((conn, idx) => (
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
                  <ConnectionIcon size={12} className="text-success" />
                  <span style={{ fontWeight: 'bold' }}>{conn[0].split('/').pop()}</span>
                  <span className="text-muted">&lt;---&gt;</span>
                  <span style={{ fontWeight: 'bold' }}>{conn[1].split('/').pop()}</span>
                </div>
                {!isCompleted && (
                  <button 
                    onClick={() => removeConnection(idx)}
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
          disabled={connections.length === 0 || isEvaluating}
          style={{ width: '100%', marginTop: '4px' }}
        >
          {isEvaluating ? 'Tracing connections...' : 'Verify Connections Map'}
        </button>
      )}
    </div>
  );
}
