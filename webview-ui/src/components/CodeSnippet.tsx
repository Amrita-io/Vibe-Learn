import React from 'react';

interface CodeSnippetProps {
  code?: string;
  tokens?: string[];
  mode?: 'view' | 'click' | 'highlight';
  selectedTokenIndices?: number[];
  correctTokenIndices?: number[];
  onTokenClick?: (idx: number) => void;
  highlightedLine?: string;
  isCompleted?: boolean;
}

export default function CodeSnippet({
  code = '',
  tokens = [],
  mode = 'view',
  selectedTokenIndices = [],
  correctTokenIndices = [],
  onTokenClick,
  highlightedLine = '',
  isCompleted = false
}: CodeSnippetProps) {
  
  // Custom simple syntax highlighter for standard code viewing
  const renderHighlightedCode = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const isHighlightedLine = highlightedLine && line.trim().includes(highlightedLine.trim());
      
      // Basic syntax coloring regexes
      const words = line.split(/(\s+)/);
      
      return (
        <div 
          key={lineIdx} 
          style={{ 
            backgroundColor: isHighlightedLine ? 'rgba(124, 109, 250, 0.15)' : 'transparent',
            borderLeft: isHighlightedLine ? '2px solid var(--accent-color)' : 'none',
            paddingLeft: isHighlightedLine ? '6px' : '0px',
            lineHeight: '1.5',
            minHeight: '18px'
          }}
        >
          {words.map((part, wordIdx) => {
            let color = 'var(--text-primary)';
            let fontWeight = 'normal';
            
            const trimmed = part.trim();
            if (/^(const|let|var|function|return|async|await|import|from|class|def|if|else|try|except)$/.test(trimmed)) {
              color = '#7C6DFA'; // Accent Indigo
              fontWeight = 'bold';
            } else if (/^(\?.|\?|:|&&|\|\||==|===)$/.test(trimmed)) {
              color = '#F5A623'; // Warning Amber
              fontWeight = 'bold';
            } else if (/^(['"].*['"])$/.test(part) || part.startsWith('"') || part.startsWith("'")) {
              color = '#2DD4A0'; // Success Emerald
            } else if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
              color = 'var(--text-muted)';
            }
            
            return (
              <span key={wordIdx} style={{ color, fontWeight }}>
                {part}
              </span>
            );
          })}
        </div>
      );
    });
  };

  // Clickable Token Flow layout for interactive syntax spotlights
  if (mode === 'click' && tokens && tokens.length > 0) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px', 
          padding: '8px', 
          backgroundColor: '#0D0D0F', 
          border: '1px solid var(--border-color)', 
          borderRadius: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px'
        }}
      >
        {tokens.map((token, idx) => {
          const isSelected = selectedTokenIndices.includes(idx);
          const isCorrect = correctTokenIndices.includes(idx);
          
          let borderColor = 'transparent';
          let bgColor = 'transparent';
          let textColor = 'var(--text-primary)';
          let cursor = isCompleted ? 'default' : 'pointer';

          if (isCompleted) {
            if (isCorrect) {
              borderColor = 'var(--success-color)';
              bgColor = 'rgba(45, 212, 160, 0.1)';
              textColor = 'var(--success-color)';
            } else if (isSelected) {
              borderColor = 'var(--warning-color)';
              bgColor = 'rgba(245, 166, 35, 0.1)';
              textColor = 'var(--warning-color)';
            }
          } else if (isSelected) {
            borderColor = 'var(--accent-color)';
            bgColor = 'rgba(124, 109, 250, 0.15)';
            textColor = 'var(--text-primary)';
          }

          // Basic subtoken coloring inside token
          let defaultColor = textColor;
          if (!isCompleted && !isSelected) {
            if (/^(const|let|var|function|return|async|await)$/.test(token)) {
              defaultColor = '#7C6DFA';
            } else if (token.includes('?.') || token.includes('?') || token.includes(':')) {
              defaultColor = '#F5A623';
            }
          }

          return (
            <span
              key={idx}
              onClick={() => {
                if (isCompleted || !onTokenClick) return;
                onTokenClick(idx);
              }}
              style={{
                border: '1px solid',
                borderColor: borderColor,
                backgroundColor: bgColor,
                color: defaultColor,
                padding: '2px 4px',
                borderRadius: '3px',
                cursor: cursor,
                transition: 'all 0.15s ease'
              }}
              className={!isCompleted ? "draggable-item" : ""}
            >
              {token}
            </span>
          );
        })}
      </div>
    );
  }

  // Standard code block render
  return (
    <pre 
      style={{ 
        fontFamily: 'var(--font-mono)', 
        fontSize: '10.5px', 
        margin: 0, 
        padding: '8px', 
        overflowX: 'auto', 
        backgroundColor: '#0D0D0F', 
        border: '1px solid var(--border-color)', 
        borderRadius: '6px',
        color: 'var(--text-primary)'
      }}
    >
      {renderHighlightedCode(code)}
    </pre>
  );
}
