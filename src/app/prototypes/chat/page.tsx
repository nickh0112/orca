'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Check,
  Flag,
  Download,
  Bot,
  User,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  dummyReport,
  getCriticalAndHighFindings,
  getFindingsByPlatform,
  getUncertainFindings,
  formatEngagement,
  type Finding,
  type Platform
} from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';
import { SeverityBadge, RiskLevelBadge } from '@/components/prototypes/severity-badge';

type MessageType = 'ai' | 'user' | 'system';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  findings?: Finding[];
  expandedFindingId?: string;
  actions?: Array<{ label: string; action: string }>;
  timestamp: Date;
}

const suggestedQuestions = [
  'Show me the FTC violations',
  'What are the legal concerns?',
  'Show me posts with brand mentions',
  'Which findings need verification?',
];

export default function ChatPrototype() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `I've completed my analysis of **${dummyReport.creator.name}**. Here's what I found:`,
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'ai',
      content: `**Overall Risk: ${dummyReport.creator.riskLevel}** (Score: ${dummyReport.creator.riskScore}/100)\n\n${dummyReport.summary.executiveSummary}`,
      timestamp: new Date(),
    },
    {
      id: '3',
      type: 'ai',
      content: `The most pressing concerns are:\n\n${dummyReport.summary.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n\n')}`,
      actions: [
        { label: 'Show Critical Findings', action: 'show_critical' },
        { label: 'Review All Platforms', action: 'show_platforms' },
      ],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    }]);
  };

  const handleAction = async (action: string) => {
    setIsTyping(true);

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    switch (action) {
      case 'show_critical':
        addMessage({
          type: 'user',
          content: 'Show me the critical findings',
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        const criticalFindings = getCriticalAndHighFindings();
        addMessage({
          type: 'ai',
          content: `I found **${criticalFindings.length} critical and high-severity findings** that require immediate attention:`,
          findings: criticalFindings,
          actions: [
            { label: 'Show Uncertain Matches', action: 'show_uncertain' },
            { label: 'View by Platform', action: 'show_platforms' },
          ],
        });
        break;

      case 'show_uncertain':
        addMessage({
          type: 'user',
          content: 'Which findings need verification?',
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        const uncertainFindings = getUncertainFindings();
        addMessage({
          type: 'ai',
          content: `There are **${uncertainFindings.length} findings** that require manual verification due to uncertain person matching or context:`,
          findings: uncertainFindings,
        });
        break;

      case 'show_platforms':
        addMessage({
          type: 'user',
          content: 'Show me a breakdown by platform',
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        const platforms: Platform[] = ['instagram', 'youtube', 'tiktok', 'web'];
        const platformSummary = platforms
          .map(p => `**${p.charAt(0).toUpperCase() + p.slice(1)}**: ${getFindingsByPlatform(p).length} findings`)
          .join('\n');
        addMessage({
          type: 'ai',
          content: `Here's the breakdown by platform:\n\n${platformSummary}\n\nWhich platform would you like to explore?`,
          actions: platforms.map(p => ({
            label: p.charAt(0).toUpperCase() + p.slice(1),
            action: `platform_${p}`,
          })),
        });
        break;

      default:
        if (action.startsWith('platform_')) {
          const platform = action.replace('platform_', '') as Platform;
          addMessage({
            type: 'user',
            content: `Show me ${platform} findings`,
          });
          await new Promise(resolve => setTimeout(resolve, 500));
          const platformFindings = getFindingsByPlatform(platform);
          addMessage({
            type: 'ai',
            content: `Here are the **${platformFindings.length} findings** from ${platform}:`,
            findings: platformFindings,
          });
        }
    }

    setIsTyping(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ type: 'user', content: userMessage });

    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple keyword matching for demo
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('ftc') || lowerMessage.includes('disclosure')) {
      const disclosureFindings = dummyReport.findings.filter(f => f.category === 'disclosure');
      addMessage({
        type: 'ai',
        content: `I found **${disclosureFindings.length} findings** related to FTC disclosure violations:`,
        findings: disclosureFindings,
      });
    } else if (lowerMessage.includes('legal') || lowerMessage.includes('lawsuit')) {
      const legalFindings = dummyReport.findings.filter(f => f.category === 'legal');
      addMessage({
        type: 'ai',
        content: `Here are the **${legalFindings.length} legal concerns** I've identified:`,
        findings: legalFindings,
      });
    } else if (lowerMessage.includes('brand')) {
      const brandFindings = dummyReport.findings.filter(f => f.category === 'brand_mention');
      addMessage({
        type: 'ai',
        content: `I found **${brandFindings.length} brand-related findings** in the content:`,
        findings: brandFindings,
      });
    } else if (lowerMessage.includes('verif') || lowerMessage.includes('uncertain')) {
      handleAction('show_uncertain');
      return;
    } else if (lowerMessage.includes('critical') || lowerMessage.includes('serious')) {
      handleAction('show_critical');
      return;
    } else {
      addMessage({
        type: 'ai',
        content: `I can help you explore the findings. Try asking about:\n\n- Legal concerns or lawsuits\n- FTC disclosure violations\n- Brand mentions\n- Findings that need verification\n- Specific platforms (Instagram, YouTube, TikTok)`,
        actions: suggestedQuestions.slice(0, 3).map(q => ({ label: q, action: 'custom' })),
      });
    }

    setIsTyping(false);
  };

  const toggleFinding = (id: string) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-zinc-100">Orca AI Assistant</h1>
              <p className="text-xs text-zinc-500">Analyzing {dummyReport.creator.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RiskLevelBadge level={dummyReport.creator.riskLevel} size="sm" />
            <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <Download className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              expandedFindings={expandedFindings}
              onToggleFinding={toggleFinding}
              onAction={handleAction}
            />
          ))}

          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-zinc-800/50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Questions */}
      {messages.length < 5 && (
        <div className="border-t border-zinc-800 bg-zinc-900/30">
          <div className="max-w-3xl mx-auto px-6 py-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-xs text-zinc-500 shrink-0">Try asking:</span>
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="px-3 py-1.5 text-xs bg-zinc-800/50 text-zinc-400 rounded-full hover:bg-zinc-800 hover:text-zinc-200 transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-800 bg-zinc-900/50">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this creator..."
              className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  expandedFindings: Set<string>;
  onToggleFinding: (id: string) => void;
  onAction: (action: string) => void;
}

function MessageBubble({ message, expandedFindings, onToggleFinding, onAction }: MessageBubbleProps) {
  const isAi = message.type === 'ai';

  return (
    <div className={cn('flex items-start gap-3', !isAi && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isAi
          ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
          : 'bg-zinc-700'
      )}>
        {isAi ? (
          <Bot className="w-4 h-4 text-white" />
        ) : (
          <User className="w-4 h-4 text-zinc-300" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3',
        isAi
          ? 'bg-zinc-800/50 rounded-tl-sm'
          : 'bg-violet-500/20 rounded-tr-sm'
      )}>
        {/* Text content with markdown-style formatting */}
        <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {message.content.split('\n').map((line, i) => {
            // Bold text
            if (line.includes('**')) {
              const parts = line.split(/\*\*(.*?)\*\*/g);
              return (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>
                  {parts.map((part, j) =>
                    j % 2 === 1 ? (
                      <strong key={j} className="text-zinc-100 font-semibold">{part}</strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            }
            // Numbered list
            if (/^\d+\./.test(line)) {
              return (
                <p key={i} className={cn('pl-4', i > 0 && 'mt-2')}>
                  {line}
                </p>
              );
            }
            return line ? <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p> : null;
          })}
        </div>

        {/* Findings */}
        {message.findings && message.findings.length > 0 && (
          <div className="mt-4 space-y-2">
            {message.findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                isExpanded={expandedFindings.has(finding.id)}
                onToggle={() => onToggleFinding(finding.id)}
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.actions.map((action) => (
              <button
                key={action.label}
                onClick={() => onAction(action.action)}
                className="px-3 py-1.5 text-xs bg-zinc-700/50 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FindingCardProps {
  finding: Finding;
  isExpanded: boolean;
  onToggle: () => void;
}

function FindingCard({ finding, isExpanded, onToggle }: FindingCardProps) {
  return (
    <div className="border border-zinc-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-start gap-3 text-left hover:bg-zinc-700/20 transition-colors"
      >
        <SeverityBadge severity={finding.severity} size="sm" showLabel={false} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-200 line-clamp-1">
            {finding.title}
          </h4>
          <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
            {finding.summary}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-zinc-700/50 pt-3 space-y-3">
          {finding.postContent && (
            <>
              {finding.postContent.caption && (
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Caption</div>
                  <div className="text-sm text-zinc-300">
                    <HighlightedText
                      text={finding.postContent.caption}
                      highlights={finding.postContent.flaggedSpans}
                    />
                  </div>
                </div>
              )}
              {finding.postContent.transcript && (
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">Transcript</div>
                  <div className="text-sm text-zinc-300">
                    <HighlightedText
                      text={finding.postContent.transcript}
                      highlights={finding.postContent.flaggedSpans}
                      showReasons={true}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {finding.engagement && (
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              {finding.engagement.likes && <span>❤️ {formatEngagement(finding.engagement.likes)}</span>}
              {finding.engagement.comments && <span>💬 {formatEngagement(finding.engagement.comments)}</span>}
              {finding.engagement.views && <span>👁 {formatEngagement(finding.engagement.views)}</span>}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <a
              href={finding.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              View Source <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-emerald-500/20 rounded text-emerald-400 transition-colors">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors">
                <Flag className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
