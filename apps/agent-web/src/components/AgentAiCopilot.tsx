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
  Clock,
  TrendingUp,
  Calculator,
  UserCheck,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ChevronRight,
  Sparkle,
} from 'lucide-react';
import { getAgentToken } from '@/lib/api';

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

const AGENT_QUICK_CHIPS = [
  { icon: Clock, label: 'Pending Follow-ups', prompt: 'List all my assigned leads that have follow-ups due or overdue.' },
  { icon: TrendingUp, label: 'My Performance', prompt: 'Show my performance metrics and conversion rate for this month.' },
  { icon: Calculator, label: 'Kashmir Quote (4 Pax)', prompt: 'Calculate quotation for 5 Nights Kashmir, 4 adults, 2 Deluxe rooms with AC SUV.' },
  { icon: UserCheck, label: 'New Assigned Leads', prompt: 'Show my latest 5 new leads requiring initial customer contact.' },
];

export function AgentAiCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check auth and restore session
  useEffect(() => {
    const token = getAgentToken();
    setIsAuthenticated(!!token);

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nct_agent_ai_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.sessionId && parsed.sessionSecret) {
            setSessionId(parsed.sessionId);
            setSessionSecret(parsed.sessionSecret);
          }
        }
      } catch (e) {
        console.error('Failed to load Agent AI session:', e);
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
        const token = getAgentToken();
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
        console.error('Error clearing agent AI session:', err);
      }
    }
    localStorage.removeItem('nct_agent_ai_session');
    setSessionId(null);
    setSessionSecret(null);
    setMessages([]);
  };

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || isLoading) return;

    const token = getAgentToken();
    if (!token) {
      alert('Your agent session has expired. Please sign in again.');
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
                  'nct_agent_ai_session',
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
                          details: 'Consulting CRM & pricing engine...',
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
      console.error('Chat error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                text:
                  msg.text ||
                  `Sorry, I encountered an issue connecting to the AI Copilot. Please check your network and try again.`,
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
      case 'listMyLeads':
        return 'Searching your CRM leads';
      case 'getLeadDetails':
        return 'Loading complete lead dossier';
      case 'updateFollowUpSchedule':
        return 'Updating follow-up schedule';
      case 'addLeadActivityNote':
        return 'Logging note to customer activity timeline';
      case 'getMyPerformanceMetrics':
        return 'Computing conversion analytics';
      case 'calculateTripPrice':
        return 'Running official pricing engine';
      case 'searchTourPackages':
        return 'Searching tour catalog';
      default:
        return 'Executing CRM action';
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
        aria-label="Toggle Agent AI Copilot"
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
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.95) 0%, rgba(15, 118, 110, 0.95) 100%)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          boxShadow: '0 4px 16px -2px rgba(13, 148, 136, 0.4), 0 2px 6px rgba(0,0,0,0.14)',
          border: '1px solid rgba(255,255,255,0.22)',
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
            '0 8px 24px -2px rgba(13, 148, 136, 0.55), 0 3px 10px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen && !isMinimized ? 'scale(0.96)' : 'scale(1)';
          e.currentTarget.style.boxShadow =
            '0 4px 16px -2px rgba(13, 148, 136, 0.4), 0 2px 6px rgba(0,0,0,0.14)';
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
          <Sparkles size={15} className="animate-spin-slow" />
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '6px',
              height: '6px',
              backgroundColor: '#34d399',
              borderRadius: '50%',
              boxShadow: '0 0 6px #34d399',
            }}
          />
        </span>
        <span style={{ whiteSpace: 'nowrap' }}>AI Agent</span>
      </button>

      {/* Floating Copilot Modal Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Agent AI Copilot Window"
          style={{
            position: 'fixed',
            bottom: isMinimized ? '74px' : '20px',
            right: '20px',
            width: isMaximized ? '820px' : '375px',
            maxWidth: 'calc(100vw - 32px)',
            height: isMinimized
              ? '48px'
              : isMaximized
              ? 'min(700px, calc(100vh - 40px))'
              : '520px',
            maxHeight: 'calc(100vh - 40px)',
            zIndex: 10000,
            borderRadius: '16px',
            backgroundColor: '#0c1322',
            color: '#f8fafc',
            border: '1px solid rgba(13, 148, 136, 0.35)',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.06)',
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
              backgroundColor: '#111b2f',
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
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.35)',
                }}
              >
                <Bot size={15} color="#ffffff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    Agent Copilot
                  </h3>
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(13, 148, 136, 0.22)',
                      color: '#2dd4bf',
                      fontWeight: 600,
                    }}
                  >
                    RBAC
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
                  Live CRM Actions & Pricing Engine
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
            !isAuthenticated ? (
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
                  backgroundColor: '#080d19',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(13, 148, 136, 0.15)',
                    border: '1px solid rgba(13, 148, 136, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCheck size={22} color="#2dd4bf" />
                </div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  Agent Authentication Required
                </h4>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.5', maxWidth: '280px' }}>
                  Please sign in to your agent account to query assigned leads, record call notes, and calculate verified quotes.
                </p>
                <a
                  href="/login"
                  style={{
                    marginTop: '8px',
                    padding: '8px 18px',
                    backgroundColor: '#0d9488',
                    color: '#ffffff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
                  }}
                >
                  Sign In to Agent Desk
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
                  backgroundColor: '#080d19',
                }}
              >
                {/* Intro / Welcome Message if empty */}
                {messages.length === 0 && (
                  <div
                    style={{
                      background: 'linear-gradient(145deg, rgba(16, 26, 45, 0.8) 0%, rgba(10, 16, 30, 0.95) 100%)',
                      border: '1px solid rgba(13, 148, 136, 0.22)',
                      borderRadius: '12px',
                      padding: isMaximized ? '18px' : '12px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                      <ShieldCheck size={15} color="#2dd4bf" />
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#f1f5f9' }}>
                        Welcome to Agent AI Desk
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.45', color: '#94a3b8' }}>
                      I query your assigned leads, update follow-ups, calculate instant package quotes with the official pricing engine, and record client call notes.
                    </p>

                    <div style={{ marginTop: '12px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#2dd4bf',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        Quick Actions
                      </span>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMaximized ? 'repeat(2, 1fr)' : '1fr',
                          gap: '6px',
                        }}
                      >
                        {AGENT_QUICK_CHIPS.map((chip, idx) => {
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
                                e.currentTarget.style.backgroundColor = 'rgba(13, 148, 136, 0.16)';
                                e.currentTarget.style.borderColor = 'rgba(13, 148, 136, 0.4)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.035)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <IconComp size={13} color="#2dd4bf" />
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
                            backgroundColor: isUser ? '#0d9488' : '#1e293b',
                            color: '#ffffff',
                            marginTop: '2px',
                          }}
                        >
                          {isUser ? <User size={12} /> : <Bot size={12} color="#2dd4bf" />}
                        </div>

                        {/* Bubble */}
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            backgroundColor: isUser ? '#0f766e' : '#141e33',
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
                                <span style={{ fontSize: '11.5px' }}>Thinking...</span>
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
                  backgroundColor: '#0c1322',
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
                    placeholder="Ask CRM, check leads, update follow-up..."
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#162035',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#0d9488')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#0d9488',
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
                    Agent Desk • Live Pricing Sync
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#2dd4bf', fontWeight: 600 }}>
                    RBAC Protected
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
