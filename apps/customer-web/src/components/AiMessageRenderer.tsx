'use client';

import React from 'react';

interface AiMessageRendererProps {
  content: string;
  theme?: 'customer' | 'agent' | 'admin';
  isStreaming?: boolean;
}

// Strip noisy decorative emojis while strictly preserving Indian Rupee (₹) and essential characters
const emojiRegex = new RegExp('[\\uD83C-\\uDBFF\\uDC00-\\uDFFF]+', 'g');

function cleanSymbols(str: string): string {
  return str
    .replace(/\bNamaste\b/gi, 'Hello')
    .replace(emojiRegex, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanHeading(line: string): string {
  let h = line.replace(/^#+\s*/, '');
  h = cleanSymbols(h);
  // Remove enclosing ** if present
  h = h.replace(/^\*\*/, '').replace(/\*\*$/, '');
  return h.trim();
}

export function AiMessageRenderer({ content, theme = 'customer', isStreaming = false }: AiMessageRendererProps) {
  if (!content) return null;

  const isCustomer = theme === 'customer';
  const isAgent = theme === 'agent';

  // Palette based on portal
  const accentColor = isCustomer ? '#34d399' : isAgent ? '#2dd4bf' : '#818cf8';
  const headingBg = isCustomer
    ? 'rgba(16, 185, 129, 0.12)'
    : isAgent
    ? 'rgba(13, 148, 136, 0.14)'
    : 'rgba(99, 102, 241, 0.14)';
  const priceCardBg = isCustomer
    ? 'rgba(6, 78, 59, 0.35)'
    : isAgent
    ? 'rgba(15, 118, 110, 0.25)'
    : 'rgba(30, 41, 59, 0.45)';
  const priceCardBorder = isCustomer
    ? 'rgba(16, 185, 129, 0.28)'
    : isAgent
    ? 'rgba(13, 148, 136, 0.28)'
    : 'rgba(99, 102, 241, 0.25)';

  // Render inline formatting (**bold**, `code`, etc.)
  const renderInline = (rawText: string) => {
    const text = cleanSymbols(rawText);
    const parts = text.split(/(\*\*[^\*]+\*\*)/g);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        return (
          <strong key={i} style={{ color: '#ffffff', fontWeight: 600 }}>
            {inner}
          </strong>
        );
      }

      // Inline code fragments
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return (
            <code
              key={`${i}-${j}`}
              style={{
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: accentColor,
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              {cp.slice(1, -1)}
            </code>
          );
        }
        return cp;
      });
    });
  };

  // Parse structured blocks
  const lines = content.split('\n');
  const blocks: Array<
    | { type: 'divider' }
    | { type: 'heading'; level: number; text: string }
    | { type: 'price-card'; items: string[] }
    | { type: 'list'; items: string[] }
    | { type: 'paragraph'; text: string }
  > = [];

  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length === 0) return;
    const isPricingBlock = currentList.some(
      (item) => item.includes('₹') || item.toLowerCase().includes('price') || item.toLowerCase().includes('advance')
    );
    if (isPricingBlock) {
      blocks.push({ type: 'price-card', items: [...currentList] });
    } else {
      blocks.push({ type: 'list', items: [...currentList] });
    }
    currentList = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }

    if (line === '---' || line === '***') {
      flushList();
      blocks.push({ type: 'divider' });
      continue;
    }

    if (line.startsWith('### ') || line.startsWith('#### ') || line.startsWith('## ')) {
      flushList();
      const level = line.startsWith('#### ') ? 4 : line.startsWith('### ') ? 3 : 2;
      const hText = cleanHeading(line);
      if (hText) {
        blocks.push({ type: 'heading', level, text: hText });
      }
      continue;
    }

    if (line.startsWith('* ') || line.startsWith('- ')) {
      const itemText = line.replace(/^[\*\-]\s+/, '');
      const cleaned = cleanSymbols(itemText);
      if (cleaned) {
        currentList.push(cleaned);
      }
      continue;
    }

    flushList();
    const cleanPara = cleanSymbols(line);
    if (cleanPara) {
      blocks.push({ type: 'paragraph', text: cleanPara });
    }
  }

  flushList();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', lineHeight: '1.55' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes nctDotPulse {
          0%, 80%, 100% {
            transform: scale(0.65);
            opacity: 0.35;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        .nct-stream-dot {
          width: 4.5px;
          height: 4.5px;
          border-radius: 50%;
          display: inline-block;
          animation: nctDotPulse 1.1s infinite ease-in-out;
        }
      `,
        }}
      />

      {blocks.map((block, idx) => {
        const isLastBlock = idx === blocks.length - 1;

        if (block.type === 'divider') {
          return (
            <div
              key={idx}
              style={{
                height: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                margin: '6px 0',
              }}
            />
          );
        }

        if (block.type === 'heading') {
          return (
            <div
              key={idx}
              style={{
                marginTop: idx === 0 ? '0' : '8px',
                marginBottom: '2px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: headingBg,
                borderLeft: `3px solid ${accentColor}`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: block.level === 3 ? '12.5px' : '11.5px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '0.01em',
                }}
              >
                {block.text}
              </span>
            </div>
          );
        }

        if (block.type === 'price-card') {
          return (
            <div
              key={idx}
              style={{
                backgroundColor: priceCardBg,
                border: `1px solid ${priceCardBorder}`,
                borderRadius: '8px',
                padding: '8px 10px',
                margin: '4px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              {block.items.map((item, itemIdx) => {
                const isTotal = item.toLowerCase().includes('total package price');
                return (
                  <div
                    key={itemIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: isTotal ? '12.5px' : '11.5px',
                      fontWeight: isTotal ? 700 : 500,
                      color: isTotal ? accentColor : '#e2e8f0',
                      borderBottom:
                        itemIdx < block.items.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                      paddingBottom: itemIdx < block.items.length - 1 ? '4px' : '0',
                    }}
                  >
                    <span>{renderInline(item)}</span>
                  </div>
                );
              })}
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                margin: '2px 0',
                paddingLeft: '2px',
              }}
            >
              {block.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '7px',
                    fontSize: '11.5px',
                    color: '#e2e8f0',
                  }}
                >
                  <span
                    style={{
                      color: accentColor,
                      fontSize: '11px',
                      lineHeight: '1.5',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    •
                  </span>
                  <div style={{ flex: 1 }}>{renderInline(item)}</div>
                </div>
              ))}
            </div>
          );
        }

        // Default Paragraph
        return (
          <p key={idx} style={{ margin: 0, color: '#f1f5f9' }}>
            {renderInline(block.text)}
            {isStreaming && isLastBlock && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  marginLeft: '6px',
                  verticalAlign: 'middle',
                }}
              >
                <span className="nct-stream-dot" style={{ backgroundColor: accentColor, animationDelay: '0s' }} />
                <span className="nct-stream-dot" style={{ backgroundColor: accentColor, animationDelay: '0.2s' }} />
                <span className="nct-stream-dot" style={{ backgroundColor: accentColor, animationDelay: '0.4s' }} />
              </span>
            )}
          </p>
        );
      })}

      {/* If streaming and last block was not a paragraph, display dots on new line */}
      {isStreaming && blocks.length > 0 && blocks[blocks.length - 1].type !== 'paragraph' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
          <span className="nct-stream-dot" style={{ backgroundColor: accentColor, animationDelay: '0s' }} />
          <span className="nct-stream-dot" style={{ backgroundColor: accentColor, animationDelay: '0.2s' }} />
          <span className="nct-stream-dot" style={{ backgroundColor: accentColor, animationDelay: '0.4s' }} />
        </div>
      )}
    </div>
  );
}
