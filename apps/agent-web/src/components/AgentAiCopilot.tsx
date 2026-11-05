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
} from 'lucide-react';
import { getAgentToken } from '@/lib/api';
import { AiMessageRenderer } from './AiMessageRenderer';

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
  { icon: UserCheck, label: 'My Assigned Leads', prompt: 'Show my latest assigned leads that require customer contact or review.' },
];

export interface AgentAiCopilotProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export function AgentAiCopilot({
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  onClose: controlledOnClose,
}: AgentAiCopilotProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
    setIsMinimized(false);
  };

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

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

  // Global event listener for external triggers
  useEffect(() => {
    const handleToggleEvent = () => handleToggle();
    window.addEventListener('toggle-agent-ai', handleToggleEvent);
    return () => window.removeEventListener('toggle-agent-ai', handleToggleEvent);
  }, [controlledOnToggle, internalIsOpen]);

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
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          text: '⚠️ Your agent session has expired. Please refresh the page or sign in again.',
          timestamp: new Date(),
        },
      ]);
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
        // Normalize CRLF to LF for reliable event chunking
        const normalized = buffer.replace(/\r\n/g, '\n');
        const events = normalized.split('\n\n');
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
                          details: 'Executing CRM query & calculation...',
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
                        text: msg.text + `\n\n⚠️ *Notice:* ${data.message || 'An error occurred.'}`,
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
      console.error('Agent Chat error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                text:
                  msg.text ||
                  `Sorry, I encountered an issue connecting to the Agent AI Copilot. Please check your connection and try again.`,
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
      case 'searchAssignedLeads':
        return 'Searching your CRM leads';
      case 'updateFollowUpSchedule':
        return 'Scheduling customer follow-up';
      case 'recordCallNote':
        return 'Recording consultation notes';
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
      {/* Floating Copilot Modal Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Agent AI Copilot Window"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: isMaximized ? '840px' : '400px',
            maxWidth: 'calc(100vw - 32px)',
            height: isMinimized
              ? '48px'
              : isMaximized
              ? 'min(720px, calc(100vh - 40px))'
              : '540px',
            maxHeight: 'calc(100vh - 40px)',
            zIndex: 10000,
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06)',
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
              padding: '10px 14px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(15, 118, 110, 0.3)',
                }}
              >
                <Bot size={16} color="#ffffff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    Agent Copilot
                  </h3>
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '1.5px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#f0fdfa',
                      color: '#0f766e',
                      border: '1px solid #ccfbf1',
                      fontWeight: 600,
                    }}
                  >
                    Travel Desk
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>
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
                  color: '#64748b',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
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
                  color: '#64748b',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
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
                  color: '#64748b',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <Minus size={14} />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                title="Close Copilot"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
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
                  backgroundColor: '#f8fafc',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#f0fdfa',
                    border: '1px solid #ccfbf1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCheck size={22} color="#0f766e" />
                </div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Agent Authentication Required
                </h4>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', lineHeight: '1.5', maxWidth: '280px' }}>
                  Please sign in to your agent account to query assigned leads, record call notes, and calculate verified quotes.
                </p>
                <a
                  href="/login"
                  style={{
                    marginTop: '8px',
                    padding: '8px 18px',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)',
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
                  backgroundColor: '#f8fafc',
                }}
              >
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
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    display: inline-block;
                    animation: nctDotPulse 1.1s infinite ease-in-out;
                  }
                `,
                  }}
                />
                {/* Intro / Welcome Message if empty */}
                {messages.length === 0 && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: isMaximized ? '18px' : '14px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                      <ShieldCheck size={15} color="#0f766e" />
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                        Welcome to Agent AI Desk
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.45', color: '#475569' }}>
                      I query your assigned leads, update follow-ups, calculate instant package quotes with the official pricing engine, and record client call notes.
                    </p>

                    <div style={{ marginTop: '12px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#0f766e',
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
                                padding: '8px 11px',
                                borderRadius: '8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                color: '#1e293b',
                                fontSize: '11.5px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f0fdfa';
                                e.currentTarget.style.borderColor = '#14b8a6';
                                e.currentTarget.style.color = '#0f766e';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 118, 110, 0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.color = '#1e293b';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <IconComp size={13} color="#0d9488" />
                                <span style={{ fontWeight: 600 }}>{chip.label}</span>
                              </div>
                              <ChevronRight size={12} color="#94a3b8" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Message stream */}
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const isLastAssistantMessage = !isUser && idx === messages.length - 1;
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
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            backgroundColor: isUser ? '#0f766e' : '#f0fdfa',
                            border: isUser ? 'none' : '1px solid #ccfbf1',
                            color: isUser ? '#ffffff' : '#0f766e',
                            marginTop: '2px',
                            boxShadow: isUser ? '0 2px 4px rgba(15, 118, 110, 0.25)' : 'none',
                          }}
                        >
                          {isUser ? <User size={12} /> : <Bot size={13} color="#0f766e" />}
                        </div>

                        {/* Bubble */}
                        <div
                          style={{
                            padding: '9px 13px',
                            borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            backgroundColor: isUser ? '#0f766e' : '#ffffff',
                            background: isUser
                              ? 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)'
                              : '#ffffff',
                            color: isUser ? '#ffffff' : '#1e293b',
                            fontSize: '12px',
                            lineHeight: '1.55',
                            border: isUser
                              ? '1px solid #0f766e'
                              : '1px solid #e2e8f0',
                            whiteSpace: isUser ? 'pre-wrap' : 'normal',
                            wordBreak: 'break-word',
                            boxShadow: isUser
                              ? '0 2px 6px rgba(15, 118, 110, 0.22)'
                              : '0 2px 8px rgba(0,0,0,0.04)',
                          }}
                        >
                          {/* Tool Status Badge */}
                          {msg.toolStatus && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                backgroundColor:
                                  msg.toolStatus.status === 'running'
                                    ? '#fffbeb'
                                    : msg.toolStatus.status === 'completed'
                                    ? '#ecfdf5'
                                    : '#fef2f2',
                                border:
                                  msg.toolStatus.status === 'running'
                                    ? '1px solid #fde68a'
                                    : msg.toolStatus.status === 'completed'
                                    ? '1px solid #a7f3d0'
                                    : '1px solid #fecaca',
                                color:
                                  msg.toolStatus.status === 'running'
                                    ? '#b45309'
                                    : msg.toolStatus.status === 'completed'
                                    ? '#047857'
                                    : '#b91c1c',
                                fontSize: '10.5px',
                                fontWeight: 600,
                                marginBottom: msg.text ? '8px' : '0',
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
                            isUser ? (
                              <div style={{ color: '#ffffff', fontWeight: 500 }}>{msg.text}</div>
                            ) : (
                              <AiMessageRenderer
                                content={msg.text}
                                theme="agent"
                                isStreaming={isLoading && isLastAssistantMessage}
                              />
                            )
                          ) : isLoading && isLastAssistantMessage ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f766e', marginTop: msg.toolStatus ? '6px' : '0' }}>
                              <Loader2 size={12} className="animate-spin text-teal-600" />
                              <span style={{ fontSize: '11.5px', fontWeight: 600 }}>
                                {msg.toolStatus ? 'Analyzing CRM results...' : 'Thinking'}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <span className="nct-stream-dot" style={{ backgroundColor: '#0d9488', animationDelay: '0s' }} />
                                <span className="nct-stream-dot" style={{ backgroundColor: '#0d9488', animationDelay: '0.2s' }} />
                                <span className="nct-stream-dot" style={{ backgroundColor: '#0d9488', animationDelay: '0.4s' }} />
                              </span>
                            </div>
                          ) : !isLoading && !msg.text ? (
                            <div style={{ color: '#64748b', fontSize: '11.5px', marginTop: msg.toolStatus ? '6px' : '0' }}>
                              CRM action executed successfully.
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '9.5px',
                          color: '#94a3b8',
                          marginTop: '3px',
                          marginRight: isUser ? '30px' : '0',
                          marginLeft: isUser ? '0' : '30px',
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
                  padding: '10px 14px',
                  backgroundColor: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
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
                      backgroundColor: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '12px',
                      outline: 'none',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0d9488';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.14)';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: '#0f766e',
                      background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                      opacity: isLoading || !input.trim() ? 0.45 : 1,
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
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
                    marginTop: '6px',
                    padding: '0 2px',
                  }}
                >
                  <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                    Agent Desk • Live Pricing Sync
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#0f766e', fontWeight: 700 }}>
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
