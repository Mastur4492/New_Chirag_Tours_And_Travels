'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  Minus,
  RotateCcw,
  Bot,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  Users,
  Activity,
  Briefcase,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { getAdminToken } from '@/lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolStatus?: {
    toolName: string;
    status: 'running' | 'completed' | 'error';
    details?: string;
  };
  timestamp: Date;
}

const ADMIN_QUICK_CHIPS = [
  { icon: TrendingUp, label: "This Month's Financial Trends", prompt: "Show me this month's financial analytics: total gross revenue, net margin, and profit." },
  { icon: Users, label: 'Unassigned Leads Overview', prompt: 'List all leads that are currently unassigned or pending initial assignment.' },
  { icon: Activity, label: "Today's Operations Health", prompt: "Provide an operations report for today: active check-ins, departures, and voucher statuses." },
  { icon: Briefcase, label: 'Lead Pipeline by Stage', prompt: 'Summarize our current sales pipeline: count of NEW, CONTACTED, QUOTED, and WON leads.' },
];

export function AdminAiCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check admin auth state and restore session
  useEffect(() => {
    const token = getAdminToken();
    setIsAdminAuthenticated(!!token);

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nct_admin_ai_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.sessionId && parsed.sessionSecret) {
            setSessionId(parsed.sessionId);
            setSessionSecret(parsed.sessionSecret);
          }
        }
      } catch (e) {
        console.error('Failed to load Admin AI session:', e);
      }
    }
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleClearSession = async () => {
    if (sessionId && sessionSecret) {
      try {
        const token = getAdminToken();
        await fetch(`/api/proxy/ai/session/${sessionId}/clear`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-secret': sessionSecret,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ sessionSecret }),
        });
      } catch (err) {
        console.error('Error clearing admin AI session:', err);
      }
    }
    localStorage.removeItem('nct_admin_ai_session');
    setSessionId(null);
    setSessionSecret(null);
    setMessages([]);
  };

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || isLoading) return;

    const token = getAdminToken();
    if (!token) {
      alert('Your admin session has expired. Please sign in again.');
      return;
    }

    const userMessageId = 'usr_' + Date.now();
    const assistantMessageId = 'asst_' + Date.now();

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        text: content,
        timestamp: new Date(),
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        text: '',
        timestamp: new Date(),
      },
    ];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: content,
          sessionId: sessionId || undefined,
          sessionSecret: sessionSecret || undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Request failed with HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventStr of events) {
          if (!eventStr.trim()) continue;

          let dataStr = '';
          const lines = eventStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              dataStr = line.replace('data: ', '').trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            const type = data.type;

            if (type === 'session') {
              if (data.sessionId && data.sessionSecret) {
                setSessionId(data.sessionId);
                setSessionSecret(data.sessionSecret);
                localStorage.setItem(
                  'nct_admin_ai_session',
                  JSON.stringify({ sessionId: data.sessionId, sessionSecret: data.sessionSecret })
                );
              }
            } else if (type === 'token' || type === 'chunk') {
              const textChunk = data.content !== undefined ? data.content : data.text || '';
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, text: msg.text + textChunk }
                    : msg
                )
              );
            } else if (type === 'tool_start' || type === 'tool_call') {
              const friendlyName = getFriendlyToolName(data.toolName || data.name);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        toolStatus: {
                          toolName: friendlyName,
                          status: 'running',
                          details: 'Executing executive query & audit trace...',
                        },
                      }
                    : msg
                )
              );
            } else if (type === 'tool_complete' || type === 'tool_result') {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        toolStatus: {
                          toolName: msg.toolStatus?.toolName || 'Tool',
                          status: 'completed',
                          details: 'Completed successfully',
                        },
                      }
                    : msg
                )
              );
            } else if (type === 'tool_error') {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        toolStatus: {
                          toolName: data.toolName || 'Tool',
                          status: 'error',
                          details: data.error,
                        },
                      }
                    : msg
                )
              );
            } else if (type === 'error') {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        text: msg.text + `\n\n⚠️ *System Notice:* ${data.message || 'An error occurred.'}`,
                        toolStatus: {
                          toolName: 'System',
                          status: 'error',
                          details: data.message,
                        },
                      }
                    : msg
                )
              );
            }
          } catch (parseErr) {
            console.error('Error parsing SSE data chunk:', parseErr);
          }
        }
      }
    } catch (err: any) {
      console.error('Admin Chat error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                text:
                  msg.text ||
                  `Sorry, I encountered an issue connecting to the Admin AI Copilot. Please check your connection and try again.`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getFriendlyToolName = (toolName: string) => {
    switch (toolName) {
      case 'getFinancialAnalytics':
        return 'Calculating revenue & financial trends';
      case 'listAllLeadsOverview':
        return 'Auditing global CRM pipeline';
      case 'reassignLeadConsultant':
        return 'Reassigning consultant & creating audit log';
      case 'getOperationsReport':
        return 'Compiling daily operations & voucher telemetry';
      case 'calculateTripPrice':
        return 'Running official pricing engine';
      default:
        return 'Executing admin system action';
    }
  };

  return (
    <>
      {/* Floating Trigger Button: Refined, sleek, and compact */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        aria-label="Toggle Admin AI Copilot"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '7px 14px',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(49, 46, 129, 0.95) 50%, rgba(67, 56, 202, 0.95) 100%)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          boxShadow: '0 4px 16px -2px rgba(67, 56, 202, 0.45), 0 2px 6px rgba(0,0,0,0.18)',
          border: '1px solid rgba(165, 180, 252, 0.28)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '12.5px',
          letterSpacing: '0.01em',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen && !isMinimized ? 'scale(0.96)' : 'scale(1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
          e.currentTarget.style.boxShadow =
            '0 8px 24px -2px rgba(67, 56, 202, 0.6), 0 3px 10px rgba(0,0,0,0.22)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen && !isMinimized ? 'scale(0.96)' : 'scale(1)';
          e.currentTarget.style.boxShadow =
            '0 4px 16px -2px rgba(67, 56, 202, 0.45), 0 2px 6px rgba(0,0,0,0.18)';
        }}
      >
        <span
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={15} color="#a5b4fc" className="animate-spin-slow" />
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '6px',
              height: '6px',
              backgroundColor: '#818cf8',
              borderRadius: '50%',
              boxShadow: '0 0 6px #818cf8',
            }}
          />
        </span>
        <span style={{ whiteSpace: 'nowrap' }}>Executive AI</span>
      </button>

      {/* Floating Copilot Modal Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Admin Executive AI Copilot"
          style={{
            position: 'fixed',
            bottom: isMinimized ? '74px' : '20px',
            right: '20px',
            width: isMaximized ? '840px' : '380px',
            maxWidth: 'calc(100vw - 32px)',
            height: isMinimized
              ? '48px'
              : isMaximized
              ? 'min(720px, calc(100vh - 40px))'
              : '525px',
            maxHeight: 'calc(100vh - 40px)',
            zIndex: 10000,
            borderRadius: '16px',
            backgroundColor: '#090c17',
            color: '#f8fafc',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: 'inherit',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: '9px 14px',
              backgroundColor: '#101428',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.4)',
                }}
              >
                <Bot size={15} color="#e0e7ff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    Executive AI
                  </h3>
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(99, 102, 241, 0.22)',
                      color: '#a5b4fc',
                      fontWeight: 600,
                    }}
                  >
                    Super Admin
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
                  Financial Telemetry, Operations & Lead Reallocation
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {/* Reset History */}
              <button
                type="button"
                onClick={handleClearSession}
                title="Reset conversation memory"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <RotateCcw size={14} />
              </button>

              {/* Maximize / Restore Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsMaximized(!isMaximized);
                  setIsMinimized(false);
                }}
                title={isMaximized ? 'Restore compact view' : 'Maximize window'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              {/* Minimize to dock bar */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <Minus size={14} />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Copilot"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.18)';
                  e.currentTarget.style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            !isAdminAuthenticated ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  textAlign: 'center',
                  gap: '12px',
                  backgroundColor: '#060811',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldAlert size={22} color="#a5b4fc" />
                </div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  Admin Authentication Required
                </h4>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.5', maxWidth: '280px' }}>
                  Please sign in to your administrator account to query financial revenue trends, reassign leads, and inspect operations.
                </p>
                <a
                  href="/login"
                  style={{
                    marginTop: '8px',
                    padding: '8px 18px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
                  }}
                >
                  Sign In as Admin
                </a>
              </div>
            ) : (
            <>
              {/* Messages Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: isMaximized ? '18px 24px' : '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  backgroundColor: '#060811',
                }}
              >
                {/* Intro / Welcome Message if empty */}
                {messages.length === 0 && (
                  <div
                    style={{
                      background: 'linear-gradient(145deg, rgba(20, 24, 46, 0.8) 0%, rgba(12, 16, 32, 0.95) 100%)',
                      border: '1px solid rgba(99, 102, 241, 0.24)',
                      borderRadius: '12px',
                      padding: isMaximized ? '18px' : '12px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                      <ShieldAlert size={15} color="#a5b4fc" />
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#f1f5f9' }}>
                        Executive Intelligence & Operations Desk
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.45', color: '#94a3b8' }}>
                      Cross-agency visibility: revenue trends, net profit margins, unassigned leads reallocation, and operational health with strict audit logging.
                    </p>

                    <div style={{ marginTop: '12px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#818cf8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        Executive Insights
                      </span>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMaximized ? 'repeat(2, 1fr)' : '1fr',
                          gap: '6px',
                        }}
                      >
                        {ADMIN_QUICK_CHIPS.map((chip, idx) => {
                          const IconComp = chip.icon;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => sendMessage(chip.prompt)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '7px 10px',
                                borderRadius: '7px',
                                backgroundColor: 'rgba(255, 255, 255, 0.035)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                color: '#e2e8f0',
                                fontSize: '11.5px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.18)';
                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.035)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <IconComp size={13} color="#818cf8" />
                                <span style={{ fontWeight: 500 }}>{chip.label}</span>
                              </div>
                              <ChevronRight size={12} color="#64748b" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Message stream */}
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '7px',
                          maxWidth: isMaximized ? '85%' : '92%',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            backgroundColor: isUser ? '#4f46e5' : '#1e1b4b',
                            color: '#ffffff',
                            marginTop: '2px',
                          }}
                        >
                          {isUser ? <User size={12} /> : <Bot size={12} color="#a5b4fc" />}
                        </div>

                        {/* Bubble */}
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            backgroundColor: isUser ? '#3730a3' : '#111628',
                            color: isUser ? '#ffffff' : '#f1f5f9',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            border: isUser
                              ? '1px solid rgba(255, 255, 255, 0.15)'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                          }}
                        >
                          {/* Tool Status Badge */}
                          {msg.toolStatus && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 7px',
                                borderRadius: '9999px',
                                backgroundColor:
                                  msg.toolStatus.status === 'running'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : msg.toolStatus.status === 'completed'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color:
                                  msg.toolStatus.status === 'running'
                                    ? '#fbbf24'
                                    : msg.toolStatus.status === 'completed'
                                    ? '#34d399'
                                    : '#f87171',
                                fontSize: '10.5px',
                                fontWeight: 600,
                                marginBottom: msg.text ? '6px' : '0',
                              }}
                            >
                              {msg.toolStatus.status === 'running' && (
                                <Loader2 size={11} className="animate-spin" />
                              )}
                              {msg.toolStatus.status === 'completed' && <CheckCircle2 size={11} />}
                              {msg.toolStatus.status === 'error' && <AlertCircle size={11} />}
                              <span>{msg.toolStatus.toolName}</span>
                            </div>
                          )}

                          {msg.text ? (
                            <div>{msg.text}</div>
                          ) : (
                            !msg.toolStatus && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8' }}>
                                <Loader2 size={13} className="animate-spin" />
                                <span style={{ fontSize: '11.5px' }}>Querying executive engine...</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '9.5px',
                          color: '#64748b',
                          marginTop: '3px',
                          marginRight: isUser ? '28px' : '0',
                          marginLeft: isUser ? '0' : '28px',
                        }}
                      >
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div
                style={{
                  padding: '9px 12px',
                  backgroundColor: '#090c17',
                  borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                }}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  style={{ display: 'flex', gap: '7px', alignItems: 'center' }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Query revenue, reassign leads, check operations..."
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#13182b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                      opacity: isLoading || !input.trim() ? 0.45 : 1,
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                  </button>
                </form>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '5px',
                    padding: '0 2px',
                  }}
                >
                  <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                    Executive Command • Strict Audit Ledger Active
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#818cf8', fontWeight: 600 }}>
                    Global Access
                  </span>
                </div>
              </div>
            </>
            )
          )}
        </div>
      )}
    </>
  );
}
