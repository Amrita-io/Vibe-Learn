import React from 'react';
import { Feature } from '../types';
import { LockIcon } from './Icons';

interface ConceptPreviewProps {
  feature: Feature;
}

export default function ConceptPreview({ feature }: ConceptPreviewProps) {
  const concepts = feature.lockedConcepts || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
      <div className="card" style={{ borderLeft: '3px solid var(--warning-color)' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} className="text-warning">
          <LockIcon size={14} /> FUTURE KNOWLEDGE TREE
        </h3>
        <p className="text-muted" style={{ fontSize: '11px', margin: 0 }}>
          Mastering the codebase architecture unlocks deeper logic and syntax skill nodes. Preview the concepts encapsulated by this feature below.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {concepts.length === 0 ? (
          <div className="text-muted" style={{ textAlign: 'center', padding: '20px', fontFamily: 'var(--font-mono)' }}>
            No concepts identified for this feature.
          </div>
        ) : (
          concepts.map((concept) => (
            <div 
              key={concept.id} 
              className="card locked-node"
              style={{
                border: '1px solid rgba(245, 166, 35, 0.2)',
                boxShadow: 'inset 0 0 10px rgba(245, 166, 35, 0.03)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '12px' }}>
                  {concept.name}
                </span>
                <span className="badge badge-amber" style={{ fontSize: '8px', textTransform: 'uppercase' }}>
                  {concept.category}
                </span>
              </div>
              <p style={{ fontSize: '11px', margin: '0 0 10px 0', color: '#8F8DAB' }}>
                {concept.description}
              </p>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                borderTop: '1px solid #282836', 
                paddingTop: '6px', 
                fontSize: '9px',
                fontFamily: 'var(--font-mono)'
              }} className="text-warning">
                <LockIcon size={10} />
                <span>
                  {concept.prerequisiteOf 
                    ? `Prerequisite for: ${concepts.find(c => c.id === concept.prerequisiteOf)?.name || 'Next Node'}` 
                    : 'Requires Syntax Level 2 & Architecture Mastery'}
                </span>
              </div>

              {/* Locked Padlock Indicator Top-Right overlay */}
              <div style={{
                position: 'absolute',
                top: '6px',
                right: '65px',
                opacity: 0.2
              }}>
                <LockIcon size={32} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
