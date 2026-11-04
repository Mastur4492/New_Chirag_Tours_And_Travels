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
  h = h.replace(/^\*\*/, '').replace(/\*\*$/, '');
  return h.trim();
}

export function AiMessageRenderer({ content, theme = 'agent', isStreaming = false }: AiMessageRendererProps) {
  if (!content) return null;

  const isCustomer = theme === 'customer';
  const isAgent = theme === 'agent';
  const isAdmin = theme === 'admin';
  const isLight = isAdmin || isAgent;

  const accentColor = isCustomer ? '#059669' : '#0d9488';
  const headingBg = isCustomer
    ? 'rgba(16, 185, 129, 0.12)'
    : 'linear-gradient(135deg, #f0fdfa 0%, #e6faf6 100%)';
  const headingBorder = isCustomer ? '#10b981' : '#0d9488';
  const headingTextColor = isLight ? '#0f766e' : '#ffffff';
  const bodyTextColor = isLight ? '#1e293b' : '#f1f5f9';
  const strongTextColor = isLight ? '#0f172a' : '#ffffff';
  const listTextColor = isLight ? '#334155' : '#e2e8f0';
  const dividerColor = isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)';

  const priceCardBg = isCustomer
    ? 'rgba(6, 78, 59, 0.35)'
    : 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)';
  const priceCardBorder = isCustomer
    ? 'rgba(16, 185, 129, 0.28)'
    : '#a7f3d0';

  const renderInline = (rawText: string) => {
    const text = cleanSymbols(rawText);
    const parts = text.split(/(\*\*[^\*]+\*\*)/g);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        return (
          <strong key={i} style={{ color: strongTextColor, fontWeight: 700 }}>
            {inner}
          </strong>
        );
      }

      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return (
            <code
              key={`${i}-${j}`}
              style={{
                padding: '1.5px 5.5px',
                borderRadius: '4px',
                backgroundColor: isLight ? '#e6f7f5' : 'rgba(255, 255, 255, 0.08)',
                color: isLight ? '#0d9488' : accentColor,
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'monospace',
                border: isLight ? '1px solid #bbf0ea' : 'none',
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

  const lines = content.split('\n');
  const blocks: Array<
    | { type: 'divider' }
    | { type: 'heading'; level: number; text: string }
    | { type: 'price-card'; items: string[] }
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'list'; items: string[] }
    | { type: 'paragraph'; text: string }
  > = [];

  let currentList: string[] = [];
  let currentTable: { headers: string[]; rows: string[][] } | null = null;

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

  const flushTable = () => {
    if (!currentTable) return;
    if (currentTable.headers.length > 0) {
      blocks.push({ type: 'table', headers: currentTable.headers, rows: currentTable.rows });
    }
    currentTable = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      flushTable();
      continue;
    }

    if (line === '---' || line === '***') {
      flushList();
      flushTable();
      blocks.push({ type: 'divider' });
      continue;
    }

    // Table Row detection: starts and ends with '|'
    if (line.startsWith('|') && line.endsWith('|')) {
      const isSeparator = /^\|?(\s*:?-+:?\s*\|?)+$/.test(line);
      if (isSeparator) {
        continue;
      }
      const rawCells = line.split('|').slice(1, -1);
      const cells = rawCells.map((c) => c.trim());
      if (cells.length > 0) {
        flushList();
        if (!currentTable) {
          currentTable = { headers: cells, rows: [] };
        } else {
          currentTable.rows.push(cells);
        }
        continue;
      }
    } else {
      flushTable();
    }

    if (line.startsWith('### ') || line.startsWith('#### ') || line.startsWith('## ')) {
      flushList();
      flushTable();
      const level = line.startsWith('#### ') ? 4 : line.startsWith('### ') ? 3 : 2;
      const hText = cleanHeading(line);
      if (hText) {
        blocks.push({ type: 'heading', level, text: hText });
      }
      continue;
    }

    if (line.startsWith('* ') || line.startsWith('- ')) {
      flushTable();
      const itemText = line.replace(/^[\*\-]\s+/, '');
      const cleaned = cleanSymbols(itemText);
      if (cleaned) {
        currentList.push(cleaned);
      }
      continue;
    }

    flushList();
    flushTable();
    const cleanPara = cleanSymbols(line);
    if (cleanPara) {
      blocks.push({ type: 'paragraph', text: cleanPara });
    }
  }

  flushList();
  flushTable();

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
                backgroundColor: dividerColor,
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
                borderLeft: `3px solid ${headingBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: block.level === 3 ? '12.5px' : '11.5px',
                  fontWeight: 700,
                  color: headingTextColor,
                  letterSpacing: '0.01em',
                }}
              >
                {block.text}
              </span>
            </div>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={idx}
              style={{
                overflowX: 'auto',
                margin: '6px 0',
                borderRadius: '8px',
                border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.65)',
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: isLight ? '#f0fdfa' : 'rgba(13, 148, 136, 0.18)',
                      borderBottom: isLight ? '1px solid #ccfbf1' : '1px solid rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    {block.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        style={{
                          padding: '6px 10px',
                          color: isLight ? '#0f766e' : '#2dd4bf',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      style={{
                        borderBottom:
                          rIdx === block.rows.length - 1
                            ? 'none'
                            : isLight
                            ? '1px solid #f1f5f9'
                            : '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor:
                          rIdx % 2 === 1
                            ? isLight
                              ? '#f8fafc'
                              : 'rgba(255, 255, 255, 0.02)'
                            : 'transparent',
                      }}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            padding: '6px 10px',
                            color: isLight ? '#334155' : '#e2e8f0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
                const isTotal =
                  item.toLowerCase().includes('total package price') || item.toLowerCase().includes('contracted');
                return (
                  <div
                    key={itemIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      fontSize: isTotal ? '12.5px' : '11.5px',
                      fontWeight: isTotal ? 700 : 500,
                      color: isTotal ? (isLight ? '#065f46' : '#ffffff') : (isLight ? '#0f766e' : '#e2e8f0'),
                      borderBottom:
                        isTotal && itemIdx < block.items.length - 1
                          ? `1px solid ${isLight ? '#a7f3d0' : 'rgba(255, 255, 255, 0.1)'}`
                          : 'none',
                      paddingBottom: isTotal ? '4px' : '0',
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
                    color: listTextColor,
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

        return (
          <p key={idx} style={{ margin: 0, color: bodyTextColor }}>
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
