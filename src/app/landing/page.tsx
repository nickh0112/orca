import { LandingNav } from '@/components/landing/nav';
import { LandingHero } from '@/components/landing/hero';
import { FeatureSection } from '@/components/landing/feature-section';
import { Marquee } from '@/components/landing/marquee';
import { LandingFooter } from '@/components/landing/footer';
import { NoiseOverlay } from '@/components/landing/noise-overlay';
import {
  Shield,
  Zap,
  Users,
  BarChart3,
  TrendingUp,
  PieChart,
  FileText,
  Download,
  CheckCircle,
} from 'lucide-react';

const vettingFeatures = [
  {
    title: 'Batch Processing',
    description: 'Upload hundreds of creators at once. Our AI processes them in parallel for rapid turnaround.',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    title: 'Multi-Platform Analysis',
    description: 'Instagram, TikTok, YouTube, Twitter, Reddit. We analyze content across all major platforms.',
    icon: <Users className="w-5 h-5" />,
  },
  {
    title: 'Risk Detection',
    description: 'AI-powered detection of controversial content, brand safety issues, and reputational risks.',
    icon: <Shield className="w-5 h-5" />,
  },
];

const analyticsFeatures = [
  {
    title: 'Risk Distribution',
    description: 'Visual breakdown of low, medium, high, and critical risk creators in your pipeline.',
    icon: <PieChart className="w-5 h-5" />,
  },
  {
    title: 'Trend Analysis',
    description: 'Track vetting activity over time. Identify patterns and optimize your workflow.',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    title: 'Team Performance',
    description: 'Monitor team activity, completion rates, and individual performance metrics.',
    icon: <BarChart3 className="w-5 h-5" />,
  },
];

const reportsFeatures = [
  {
    title: 'Detailed Reports',
    description: 'Comprehensive creator profiles with content analysis, risk assessment, and recommendations.',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    title: 'PDF Export',
    description: 'Generate professional PDF reports to share with stakeholders and decision makers.',
    icon: <Download className="w-5 h-5" />,
  },
  {
    title: 'Clear Verdicts',
    description: 'AI-generated verdicts with severity levels. Know exactly where each creator stands.',
    icon: <CheckCircle className="w-5 h-5" />,
  },
];

const marqueeItems = [
  'Instagram Analysis',
  'TikTok Vetting',
  'YouTube Review',
  'Twitter Monitoring',
  'Reddit Scanning',
  'Brand Safety',
  'Risk Assessment',
  'AI-Powered',
  'Batch Processing',
  'PDF Reports',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white">
      <NoiseOverlay />
      <LandingNav />

      <LandingHero />

      {/* Marquee section */}
      <section className="py-12 border-y border-zinc-800/50">
        <Marquee items={marqueeItems} speed="slow" />
      </section>

      {/* Vetting Section */}
      <FeatureSection
        id="vetting"
        number="01"
        label="VETTING"
        title="Automated creator vetting at scale"
        description="Stop manually reviewing every creator. Our AI analyzes content, detects risks, and delivers actionable insights in minutes, not days."
        features={vettingFeatures}
      />

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      {/* Analytics Section */}
      <FeatureSection
        id="analytics"
        number="02"
        label="ANALYTICS"
        title="Data-driven decisions for your team"
        description="Understand your creator pipeline at a glance. Track risk distribution, monitor trends, and measure team performance with intuitive dashboards."
        features={analyticsFeatures}
        reversed
      />

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      {/* Reports Section */}
      <FeatureSection
        id="reports"
        number="03"
        label="REPORTS"
        title="Professional reports that drive action"
        description="Generate comprehensive creator reports with clear verdicts and recommendations. Export to PDF and share with your team."
        features={reportsFeatures}
      />

      {/* CTA Section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white tracking-tight mb-6">
            Ready to protect your brand?
          </h2>
          <p className="text-lg text-zinc-400 mb-10 max-w-2xl mx-auto">
            Join teams using Orca to vet creators faster and smarter.
            Start for free, upgrade when you're ready.
          </p>
          <a
            href="/en"
            className="inline-flex px-8 py-4 bg-white text-black font-medium rounded-full hover:bg-zinc-200 transition-all hover:scale-105"
          >
            Get started for free
          </a>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
