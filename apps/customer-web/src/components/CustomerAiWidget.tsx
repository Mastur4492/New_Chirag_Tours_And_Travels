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
  HelpCircle,
  Compass,
  Calculator,
  Calendar,
  Maximize2,
  Minimize2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
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

const QUICK_PROMPTS = [
  { icon: Calculator, label: 'Kashmir 5N/6D Price', prompt: 'Calculate an all-inclusive price for 5 nights in Kashmir for 2 adults with Deluxe hotel and dedicated Sedan cab.' },
  { icon: Compass, label: 'Best Time for Gulmarg', prompt: 'What is the best time to visit Gulmarg and Sonmarg for snow and sightseeing?' },
  { icon: Calendar, label: 'Ladakh Circuit Plan', prompt: 'Suggest a recommended 6-day itinerary for Ladakh including Pangong Lake and Nubra Valley.' },
  { icon: HelpCircle, label: 'Track My Booking', prompt: 'How can I check the live status of my confirmed booking and hotel vouchers?' },
];

export function CustomerAiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('nct_customer_ai_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed.sessionId) setSessionId(parsed.sessionId);
        if (parsed.sessionSecret) setSessionSecret(parsed.sessionSecret);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleClearChat = async () => {
    if (sessionId && sessionSecret) {
      try {
        await fetch(`/api/proxy/ai/session/${sessionId}/clear`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-secret': sessionSecret || '',
          },
          body: JSON.stringify({ sessionSecret }),
        });
      } catch {
        // Fallback
      }
    }
    setMessages([]);
    localStorage.removeItem('nct_customer_ai_session');
    setSessionId(null);
    setSessionSecret(null);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `ai-${Date.now()}`;

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text,
        timestamp: new Date(),
      },
      {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId || undefined,
          sessionSecret: sessionSecret || undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error?.message || `Server responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
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
            const event = JSON.parse(dataStr);

            if (event.type === 'session') {
              setSessionId(event.sessionId);
              setSessionSecret(event.sessionSecret);
              localStorage.setItem(
                'nct_customer_ai_session',
                JSON.stringify({ sessionId: event.sessionId, sessionSecret: event.sessionSecret })
              );
            } else if (event.type === 'token') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, text: m.text + (event.content || '') } : m
                )
              );
            } else if (event.type === 'tool_start') {
              const friendlyName = getFriendlyCustomerToolName(event.toolName);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        toolStatus: {
                          toolName: friendlyName,
                          status: 'running',
                          details: `Querying official travel desk...`,
                        },
                      }
                    : m
                )
              );
            } else if (event.type === 'tool_complete') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        toolStatus: {
                          toolName: m.toolStatus?.toolName || 'Pricing Engine',
                          status: 'completed',
                          details: 'Calculation verified by @chirag/pricing',
                        },
                      }
                    : m
                )
              );
            } else if (event.type === 'tool_error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        toolStatus: {
                          toolName: event.toolName,
                          status: 'error',
                          details: event.error,
                        },
                      }
                    : m
                )
              );
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: m.text + `\n\n⚠️ ${event.message}`,
                      }
                    : m
                )
              );
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                text:
                  m.text ||
                  `Sorry, I am having trouble connecting to the travel desk right now: ${err.message}. Please feel free to call our desk directly at +91 99786 55529.`,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getFriendlyCustomerToolName = (toolName: string) => {
    switch (toolName) {
      case 'calculateTripPrice':
        return 'Calculating price with @chirag/pricing';
      case 'searchDestinations':
        return 'Searching destination catalog';
      case 'searchTourPackages':
        return 'Finding curated packages';
      case 'checkBookingStatus':
        return 'Checking live booking status';
      case 'submitTripEnquiry':
        return 'Forwarding enquiry to tour specialist';
      default:
        return 'Consulting travel engine';
    }
  };

  return (
    <>
      {/* Floating Trigger Button: Self-contained pure inline styles */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        aria-label="Toggle AI Travel Concierge"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '7px 15px',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          boxShadow: '0 4px 16px -2px rgba(4, 120, 87, 0.45), 0 2px 6px rgba(0,0,0,0.15)',
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
            '0 8px 24px -2px rgba(4, 120, 87, 0.6), 0 3px 10px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen && !isMinimized ? 'scale(0.96)' : 'scale(1)';
          e.currentTarget.style.boxShadow =
            '0 4px 16px -2px rgba(4, 120, 87, 0.45), 0 2px 6px rgba(0,0,0,0.15)';
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
          <Sparkles size={15} color="#fde047" className="animate-spin-slow" />
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '6px',
              height: '6px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              boxShadow: '0 0 6px #10b981',
            }}
          />
        </span>
        <span style={{ whiteSpace: 'nowrap' }}>AI Concierge</span>
      </button>

      {/* Floating Chat Modal Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Customer AI Travel Concierge"
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
            backgroundColor: '#051b11',
            color: '#f8fafc',
            border: '1px solid rgba(16, 185, 129, 0.35)',
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
              backgroundColor: '#072b1b',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.4)',
                }}
              >
                <Bot size={15} color="#ffffff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    Chirag Concierge
                  </h3>
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.22)',
                      color: '#6ee7b7',
                      fontWeight: 600,
                    }}
                  >
                    Live AI
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: '#a7f3d0', opacity: 0.85 }}>
                  Handcrafted Holidays & Pure Pricing
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {/* Reset History */}
              <button
                type="button"
                onClick={handleClearChat}
                title="Restart conversation"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a7f3d0',
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
                  e.currentTarget.style.color = '#a7f3d0';
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
                  color: '#a7f3d0',
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
                  e.currentTarget.style.color = '#a7f3d0';
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
                  color: '#a7f3d0',
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
                  e.currentTarget.style.color = '#a7f3d0';
                }}
              >
                <Minus size={14} />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Concierge"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a7f3d0',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)';
                  e.currentTarget.style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#a7f3d0';
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {!isMinimized && (
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
                  backgroundColor: '#03140c',
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
                      background: 'linear-gradient(145deg, rgba(6, 46, 28, 0.8) 0%, rgba(3, 24, 15, 0.95) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '12px',
                      padding: isMaximized ? '18px' : '12px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                      <ShieldCheck size={15} color="#34d399" />
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#f1f5f9' }}>
                        Hello! Welcome to New Chirag Tours
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.45', color: '#a7f3d0', opacity: 0.85 }}>
                      I am your 24/7 personal travel assistant. Ask me about custom itineraries, get an instant verified quote with @chirag/pricing, or plan your dream holiday in Kashmir, Ladakh, Kerala, and more.
                    </p>

                    <div style={{ marginTop: '12px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#fde047',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        Suggested Queries
                      </span>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMaximized ? 'repeat(2, 1fr)' : '1fr',
                          gap: '6px',
                        }}
                      >
                        {QUICK_PROMPTS.map((item, idx) => {
                          const IconComp = item.icon;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendMessage(item.prompt)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '7px 10px',
                                borderRadius: '7px',
                                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#e2e8f0',
                                fontSize: '11.5px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.18)';
                                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.45)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <IconComp size={13} color="#34d399" />
                                <span style={{ fontWeight: 500 }}>{item.label}</span>
                              </div>
                              <ChevronRight size={12} color="#6ee7b7" />
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
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            backgroundColor: isUser ? '#047857' : '#063821',
                            color: '#ffffff',
                            marginTop: '2px',
                          }}
                        >
                          {isUser ? <User size={12} /> : <Bot size={12} color="#34d399" />}
                        </div>

                        {/* Bubble */}
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            backgroundColor: isUser ? '#047857' : '#082f1d',
                            color: isUser ? '#ffffff' : '#f1f5f9',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            border: isUser
                              ? '1px solid rgba(255, 255, 255, 0.18)'
                              : '1px solid rgba(16, 185, 129, 0.2)',
                            whiteSpace: isUser ? 'pre-wrap' : 'normal',
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
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color:
                                  msg.toolStatus.status === 'running'
                                    ? '#fbbf24'
                                    : msg.toolStatus.status === 'completed'
                                    ? '#6ee7b7'
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
                            isUser ? (
                              <div>{msg.text}</div>
                            ) : (
                              <AiMessageRenderer
                                content={msg.text}
                                theme="customer"
                                isStreaming={isLoading && isLastAssistantMessage}
                              />
                            )
                          ) : (
                            !msg.toolStatus && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a7f3d0' }}>
                                <Loader2 size={12} className="animate-spin" />
                                <span style={{ fontSize: '11.5px', fontWeight: 500 }}>Generating response</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <span className="nct-stream-dot" style={{ backgroundColor: '#34d399', animationDelay: '0s' }} />
                                  <span className="nct-stream-dot" style={{ backgroundColor: '#34d399', animationDelay: '0.2s' }} />
                                  <span className="nct-stream-dot" style={{ backgroundColor: '#34d399', animationDelay: '0.4s' }} />
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '9.5px',
                          color: '#4ade80',
                          opacity: 0.65,
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
                  backgroundColor: '#051b11',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  style={{ display: 'flex', gap: '7px', alignItems: 'center' }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about tour packages, instant prices..."
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#0a2e1d',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#10b981')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)')}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#059669',
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
                  <span style={{ fontSize: '9.5px', color: '#a7f3d0', opacity: 0.75 }}>
                    Powered by @chirag/pricing • Zero Hidden Charges
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#34d399', fontWeight: 600 }}>
                    Verified Desk
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
