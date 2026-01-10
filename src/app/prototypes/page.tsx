'use client';

import Link from 'next/link';
import {
  Monitor,
  Newspaper,
  Columns3,
  MessageCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Image,
  Layers,
  Grid3X3,
  LayoutGrid,
  BookOpen,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const prototypes = [
  {
    id: 'command-center',
    name: 'Command Center',
    description: 'Military/ops dashboard with risk radar, critical alerts, and platform feeds. Power user focused.',
    icon: Monitor,
    gradient: 'from-cyan-500 to-blue-600',
    features: ['Risk Radar Visualization', 'Critical Alerts Panel', 'Platform-based Feed', 'Expandable Content'],
    bestFor: 'Power users who review many creators daily',
  },
  {
    id: 'newspaper',
    name: 'Newspaper',
    description: 'Editorial/magazine layout with elegant typography and storytelling flow. Full content inline.',
    icon: Newspaper,
    gradient: 'from-zinc-400 to-zinc-600',
    features: ['Editorial Typography', 'Full Content Inline', 'Collapsible Sections', 'Pull Quote Verdicts'],
    bestFor: 'Stakeholders who need to understand context quickly',
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'Trello-style review workflow with drag-and-drop cards. Track progress through columns.',
    icon: Columns3,
    gradient: 'from-emerald-500 to-teal-600',
    features: ['Drag & Drop Cards', 'Progress Tracking', 'Detail Side Panel', 'Batch Actions'],
    bestFor: 'High-volume review workflows and teams',
  },
  {
    id: 'chat',
    name: 'Chat Interface',
    description: 'AI assistant that presents findings conversationally. Ask follow-up questions naturally.',
    icon: MessageCircle,
    gradient: 'from-violet-500 to-fuchsia-600',
    features: ['Conversational UI', 'Follow-up Questions', 'Progressive Disclosure', 'Quick Actions'],
    bestFor: 'Less technical reviewers and discovery workflow',
  },
  {
    id: 'timeline',
    name: 'Timeline Evidence',
    description: 'Detective-style evidence board with chronological view, pinning, and connected findings.',
    icon: Clock,
    gradient: 'from-amber-500 to-orange-600',
    features: ['Chronological Timeline', 'Pin Evidence', 'Connected Findings', 'Investigation Notes'],
    bestFor: 'Complex cases, legal review, and documentation',
  },
  {
    id: 'media-gallery',
    name: 'Media Gallery',
    description: 'Visual-first gallery view with real data. See actual images and video thumbnails from flagged content.',
    icon: Image,
    gradient: 'from-pink-500 to-rose-600',
    features: ['Real Report Data', 'Image/Video Thumbnails', 'Platform Filtering', 'Click to Expand'],
    bestFor: 'Visual content review and quick media scanning',
  },
];

// Split View prototypes - different visual approaches to the same layout
const splitViewPrototypes = [
  {
    id: 'split-minimal',
    name: 'Split View: Minimal',
    description: 'Ultra-clean aesthetic with maximum whitespace. Content breathes, UI disappears.',
    icon: Layers,
    features: ['Invisible Borders', 'Light Typography', 'Content Focus', 'Subtle Hierarchy'],
    bestFor: 'Clean presentations, stakeholder reviews',
  },
  {
    id: 'split-dense',
    name: 'Split View: Dense',
    description: 'High information density with tabular data. Compact spacing for power users.',
    icon: Grid3X3,
    features: ['Compact Rows', 'Data-Forward', 'Tabular Layout', 'Fast Scanning'],
    bestFor: 'Power users, high-volume review',
  },
  {
    id: 'split-cards',
    name: 'Split View: Cards',
    description: 'Clear visual blocks with generous padding. Approachable and structured.',
    icon: LayoutGrid,
    features: ['Visual Blocks', 'Rounded Corners', 'Layered Depth', 'Clear Actions'],
    bestFor: 'General users, clear visual hierarchy',
  },
  {
    id: 'split-editorial',
    name: 'Split View: Editorial',
    description: 'Magazine-inspired with serif headlines. Premium, refined typography.',
    icon: BookOpen,
    features: ['Serif Typography', 'Generous Leading', 'Section Dividers', 'Pull Quotes'],
    bestFor: 'Executive summaries, formal reports',
  },
  {
    id: 'split-mono',
    name: 'Split View: Mono',
    description: 'Terminal aesthetic with monospace font. Keyboard hints, developer feel.',
    icon: Terminal,
    features: ['Monospace Font', 'Keyboard Nav', 'Command Style', 'j/k Navigation'],
    bestFor: 'Developers, keyboard-first users',
  },
];

export default function PrototypesIndex() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
        <div className="max-w-6xl mx-auto px-6 py-20 relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">Report UI Prototypes</h1>
              <p className="text-zinc-500">11 different approaches to creator vetting reports</p>
            </div>
          </div>

          <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
            Each prototype explores a different way to present creator vetting information.
            They all show the same data but with different UX patterns, visual styles, and
            interaction models.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="px-3 py-1.5 bg-zinc-800/50 rounded-full text-xs text-zinc-400">
              Full Post Content
            </div>
            <div className="px-3 py-1.5 bg-zinc-800/50 rounded-full text-xs text-zinc-400">
              Highlighted Flagged Text
            </div>
            <div className="px-3 py-1.5 bg-zinc-800/50 rounded-full text-xs text-zinc-400">
              Platform Grouping
            </div>
            <div className="px-3 py-1.5 bg-zinc-800/50 rounded-full text-xs text-zinc-400">
              Severity Filtering
            </div>
            <div className="px-3 py-1.5 bg-zinc-800/50 rounded-full text-xs text-zinc-400">
              Expandable Details
            </div>
          </div>
        </div>
      </div>

      {/* Prototypes Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prototypes.map((proto) => {
            const Icon = proto.icon;

            return (
              <Link
                key={proto.id}
                href={`/prototypes/${proto.id}`}
                className="group relative bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all duration-300"
              >
                {/* Gradient header */}
                <div className={cn(
                  'h-32 bg-gradient-to-br relative overflow-hidden',
                  proto.gradient
                )}>
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-12 h-12 text-white/80" />
                  </div>
                  {/* Hover arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-white/80" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                    {proto.name}
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
                    {proto.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {proto.features.slice(0, 3).map((feature) => (
                      <span
                        key={feature}
                        className="px-2 py-0.5 bg-zinc-800/50 rounded text-[10px] text-zinc-500"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Best for */}
                  <div className="pt-4 border-t border-zinc-800">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Best For</div>
                    <div className="text-xs text-zinc-400">{proto.bestFor}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Split View Section */}
        <div className="mt-16 pt-12 border-t border-zinc-800">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Layers className="w-5 h-5 text-zinc-500" />
              <h2 className="text-xl font-semibold text-zinc-100">Split View Variations</h2>
            </div>
            <p className="text-zinc-500 max-w-2xl">
              Five different visual styles for the same Split View layout pattern: content grid on the left,
              context panel on the right. Same UX, different aesthetics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {splitViewPrototypes.map((proto) => {
              const Icon = proto.icon;

              return (
                <Link
                  key={proto.id}
                  href={`/prototypes/${proto.id}`}
                  className="group bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-all"
                >
                  {/* Icon header */}
                  <div className="h-20 bg-zinc-800/50 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-zinc-200 mb-1 group-hover:text-white transition-colors">
                      {proto.name.replace('Split View: ', '')}
                    </h3>
                    <p className="text-xs text-zinc-500 mb-3 line-clamp-2">
                      {proto.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1">
                      {proto.features.slice(0, 2).map((feature) => (
                        <span
                          key={feature}
                          className="px-1.5 py-0.5 bg-zinc-800/50 rounded text-[9px] text-zinc-600"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 p-6 bg-zinc-900/30 border border-zinc-800 rounded-xl">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Using the Prototypes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-zinc-500">
            <div>
              <h4 className="text-zinc-400 font-medium mb-2">Dummy Data</h4>
              <p>All prototypes use the same MrBeast dummy data with 20 findings across Instagram, YouTube, TikTok, and web sources.</p>
            </div>
            <div>
              <h4 className="text-zinc-400 font-medium mb-2">Highlighted Content</h4>
              <p>Flagged portions of captions and transcripts are highlighted with color-coded severity levels and hover tooltips.</p>
            </div>
            <div>
              <h4 className="text-zinc-400 font-medium mb-2">Interactions</h4>
              <p>Click, expand, filter, and explore. Each prototype has different interaction patterns to evaluate.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
