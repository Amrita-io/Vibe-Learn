import React from 'react';

interface LoadingSkeletonProps {
  type?: 'dashboard' | 'mission' | 'concepts' | 'generic';
}

export default function LoadingSkeleton({ type = 'generic' }: LoadingSkeletonProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, padding: '4px' }}>
      
      {/* Dynamic layouts */}
      {type === 'dashboard' && (
        <>
          {/* Header profile card skeleton */}
          <div style={{
            height: '80px',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }} />

          {/* dossiers title skeleton */}
          <div style={{
            height: '14px',
            width: '100px',
            borderRadius: '4px',
            background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            marginTop: '8px'
          }} />

          {/* dossiers cards list */}
          {[1, 2, 3].map((n) => (
            <div 
              key={n} 
              style={{
                height: '90px',
                borderRadius: '6px',
                background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
              }}
            />
          ))}
        </>
      )}

      {type === 'mission' && (
        <>
          {/* Header mission card skeleton */}
          <div style={{
            height: '75px',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }} />

          {/* Tasks checklist tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                style={{
                  height: '28px',
                  flex: 1,
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite'
                }}
              />
            ))}
          </div>

          {/* Main workspace skeleton */}
          <div style={{
            flex: 1,
            minHeight: '200px',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }} />
        </>
      )}

      {type === 'concepts' && (
        <>
          {/* Concepts title skeleton */}
          <div style={{
            height: '65px',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }} />

          {/* Lanes lanes and nodes */}
          {[1, 2].map((lane) => (
            <div key={lane} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{
                height: '12px',
                width: '80px',
                borderRadius: '3px',
                background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
              }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3].map((node) => (
                  <div
                    key={node}
                    style={{
                      height: '42px',
                      flex: 1,
                      borderRadius: '6px',
                      background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite'
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {type === 'generic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4].map((n) => (
            <div 
              key={n} 
              style={{
                height: '24px',
                borderRadius: '4px',
                background: 'linear-gradient(90deg, #1A1A20 25%, #222230 50%, #1A1A20 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
              }}
            />
          ))}
        </div>
      )}

    </div>
  );
}
