'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  pdf,
} from '@react-pdf/renderer';
import type { Finding, RiskLevel, VisualAnalysisData, LogoDetection, ContentClassification, TranscriptSegment } from '@/types';

// Whalar brand colors
const WHALAR = {
  lime: '#eafc41',
  black: '#000000',
  darkGray: '#1a1a1a',
  mediumGray: '#4a4a4a',
  lightGray: '#f5f5f5',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    backgroundColor: WHALAR.white,
  },
  headerBand: {
    backgroundColor: WHALAR.black,
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 30,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: WHALAR.lime,
    letterSpacing: 2,
  },
  reportType: {
    fontSize: 9,
    color: WHALAR.mediumGray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: WHALAR.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#888888',
  },
  riskBadge: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  riskText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Risk meter visualization
  riskMeterContainer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riskMeterBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  riskMeterSegment: {
    height: '100%',
  },
  riskMeterLabel: {
    fontSize: 9,
    color: '#888888',
  },
  // Risk stats row
  riskStatsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  riskStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riskStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskStatText: {
    fontSize: 9,
    color: '#888888',
  },
  content: {
    padding: 40,
    paddingBottom: 60, // Space for fixed footer
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: WHALAR.lime,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: WHALAR.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summary: {
    fontSize: 11,
    color: WHALAR.mediumGray,
    lineHeight: 1.7,
  },
  analysisHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: WHALAR.black,
    marginTop: 12,
    marginBottom: 6,
  },
  analysisBullet: {
    fontSize: 10,
    color: WHALAR.mediumGray,
    lineHeight: 1.6,
    marginLeft: 12,
    marginBottom: 4,
  },
  analysisText: {
    fontSize: 10,
    color: WHALAR.mediumGray,
    lineHeight: 1.6,
    marginBottom: 4,
  },
  finding: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: WHALAR.lightGray,
    borderRadius: 4,
    borderLeftWidth: 4,
  },
  findingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  findingTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: WHALAR.black,
    flex: 1,
  },
  severityBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginLeft: 8,
  },
  severityText: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  findingSummary: {
    fontSize: 10,
    color: WHALAR.mediumGray,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  findingSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  findingSourceLabel: {
    fontSize: 9,
    color: '#888888',
  },
  findingSourceLink: {
    fontSize: 9,
    color: WHALAR.black,
    textDecoration: 'underline',
  },
  socialLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialLink: {
    fontSize: 10,
    color: WHALAR.black,
    backgroundColor: WHALAR.lightGray,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    textDecoration: 'none',
    marginRight: 8,
    marginBottom: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHALAR.black,
    paddingVertical: 16,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrand: {
    fontSize: 10,
    fontWeight: 'bold',
    color: WHALAR.lime,
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 9,
    color: '#666666',
  },
  noFindings: {
    fontSize: 11,
    color: WHALAR.mediumGray,
    textAlign: 'center',
    paddingVertical: 30,
    backgroundColor: WHALAR.lightGray,
    borderRadius: 4,
  },
  // Brand Exposure Section
  brandExposureTable: {
    marginTop: 8,
  },
  brandExposureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  brandExposureHeader: {
    backgroundColor: WHALAR.lightGray,
  },
  brandExposureLabel: {
    flex: 2,
    fontSize: 10,
    color: WHALAR.black,
  },
  brandExposureValue: {
    flex: 1,
    fontSize: 10,
    color: WHALAR.mediumGray,
    textAlign: 'right',
  },
  brandExposureBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  brandExposureBar: {
    flex: 2,
    height: 8,
    backgroundColor: '#e4e4e7',
    borderRadius: 4,
    overflow: 'hidden',
    marginLeft: 8,
  },
  brandExposureFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Safety Score Section
  safetyScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: WHALAR.lightGray,
    borderRadius: 4,
  },
  safetyScoreGauge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safetyScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  safetyScoreCategories: {
    flex: 1,
    gap: 6,
  },
  safetyScoreCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safetyScoreCategoryLabel: {
    width: 80,
    fontSize: 9,
    color: WHALAR.mediumGray,
  },
  safetyScoreCategoryBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e4e4e7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  safetyScoreCategoryFill: {
    height: '100%',
    borderRadius: 3,
  },
  safetyScoreCategoryValue: {
    width: 24,
    fontSize: 9,
    textAlign: 'right',
  },
  // Transcript Section
  transcriptContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: WHALAR.lightGray,
    borderRadius: 4,
  },
  transcriptSegment: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  transcriptTimestamp: {
    width: 40,
    fontSize: 9,
    color: WHALAR.mediumGray,
    fontFamily: 'Courier',
  },
  transcriptText: {
    flex: 1,
    fontSize: 10,
    color: WHALAR.black,
    lineHeight: 1.4,
  },
  transcriptHighlight: {
    backgroundColor: '#a855f7',
    color: WHALAR.white,
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  // Timeline Visualization
  timelineContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: WHALAR.lightGray,
    borderRadius: 4,
  },
  timelineBar: {
    height: 20,
    backgroundColor: '#e4e4e7',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  timelineMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  timelineLegend: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  timelineLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timelineLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLegendText: {
    fontSize: 8,
    color: WHALAR.mediumGray,
  },
});

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  LOW: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  MEDIUM: { bg: WHALAR.lime, text: WHALAR.black, border: '#d4e600' },
  HIGH: { bg: '#fed7aa', text: '#9a3412', border: '#f97316' },
  CRITICAL: { bg: '#fecaca', text: '#991b1b', border: '#ef4444' },
  UNKNOWN: { bg: '#e4e4e7', text: '#52525b', border: '#a1a1aa' },
};

const severityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: '#dcfce7', text: '#166534' },
  medium: { bg: WHALAR.lime, text: WHALAR.black },
  high: { bg: '#fed7aa', text: '#9a3412' },
  critical: { bg: '#fecaca', text: '#991b1b' },
};

// Clean web scraping artifacts from text
function sanitizeScrapedText(text: string): string {
  return text
    // Remove markdown links but keep text: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove standalone brackets with content: [Skip to Content] -> Skip to Content
    .replace(/\[([^\]]+)\]/g, '$1')
    // Remove repeated navigation items
    .replace(/(\b(Home|News|Sign In|Subscribe|Skip to \w+|Menu)\b\s*)+/gi, '')
    // Remove HTML entities
    .replace(/&#\d+;/g, '')
    // Clean up multiple spaces/newlines
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim();
}

// Parse markdown bold/italic for display
function parseMarkdownText(text: string): Array<{ text: string; bold?: boolean }> {
  const parts: Array<{ text: string; bold?: boolean }> = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index) });
    }
    parts.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ text }];
}

// Format ISO date string to readable format
function formatSourceDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Parse social URL to display format
function formatSocialLink(url: string): string {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.replace('www.', '');

    if (host.includes('instagram.com')) {
      const handle = urlObj.pathname.split('/').filter(Boolean)[0];
      return handle ? `@${handle}` : url;
    }
    if (host.includes('tiktok.com')) {
      const handle = urlObj.pathname.split('/').filter(Boolean)[0];
      return handle ? `${handle}` : url;
    }
    if (host.includes('youtube.com')) {
      const handle = urlObj.pathname.split('/').filter(Boolean).pop();
      return handle ? `YouTube: ${handle}` : url;
    }
    if (host.includes('twitter.com') || host.includes('x.com')) {
      const handle = urlObj.pathname.split('/').filter(Boolean)[0];
      return handle ? `@${handle}` : url;
    }
    return url;
  } catch {
    return url;
  }
}

interface CreatorPdfProps {
  creatorName: string;
  batchName: string;
  socialLinks: string[];
  riskLevel: RiskLevel;
  summary: string | null;
  findings: Finding[];
  generatedAt: Date;
  // Enhanced video analysis data
  videoAnalysis?: {
    logoDetections?: LogoDetection[];
    contentClassification?: ContentClassification;
    transcriptSegments?: TranscriptSegment[];
    transcript?: string;
    videoDuration?: number;
  };
}

// Helper to format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get color for safety score
function getSafetyScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green
  if (score >= 50) return '#eab308'; // yellow
  return '#ef4444'; // red
}

// Brand Exposure Table Component
function BrandExposureTable({ logoDetections, videoDuration = 60 }: { logoDetections: LogoDetection[]; videoDuration?: number }) {
  const sortedBrands = [...logoDetections].sort((a, b) => b.totalDuration - a.totalDuration);
  const maxDuration = Math.max(...sortedBrands.map(l => l.totalDuration), 1);

  return (
    <View style={styles.brandExposureTable}>
      {/* Header */}
      <View style={[styles.brandExposureRow, styles.brandExposureHeader]}>
        <Text style={[styles.brandExposureLabel, { fontWeight: 'bold' }]}>Brand</Text>
        <Text style={[styles.brandExposureValue, { fontWeight: 'bold' }]}>Duration</Text>
        <View style={styles.brandExposureBar} />
      </View>

      {/* Rows */}
      {sortedBrands.slice(0, 10).map((logo, i) => {
        const percentage = (logo.totalDuration / maxDuration) * 100;
        return (
          <View key={i} style={styles.brandExposureRow}>
            <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.brandExposureLabel}>{logo.brand}</Text>
              {logo.likelySponsor && (
                <View style={[styles.brandExposureBadge, { backgroundColor: '#a855f7' }]}>
                  <Text style={{ fontSize: 7, color: WHALAR.white }}>SPONSOR</Text>
                </View>
              )}
            </View>
            <Text style={styles.brandExposureValue}>{formatDuration(logo.totalDuration)}</Text>
            <View style={styles.brandExposureBar}>
              <View
                style={[
                  styles.brandExposureFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: logo.likelySponsor ? '#a855f7' : '#71717a',
                  },
                ]}
              />
            </View>
          </View>
        );
      })}

      {sortedBrands.length > 10 && (
        <Text style={{ fontSize: 9, color: WHALAR.mediumGray, marginTop: 8 }}>
          +{sortedBrands.length - 10} more brands detected
        </Text>
      )}
    </View>
  );
}

// Helper to extract score from category score (handles both number and object formats)
function extractCategoryScore(value: number | { score: number; reason?: string } | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value === 'number') return value;
  return value.score ?? fallback;
}

// Safety Score Breakdown Component
function SafetyScoreBreakdown({ classification, brandSafetyRating }: { classification?: ContentClassification; brandSafetyRating?: string }) {
  const overallScore = classification?.overallSafetyScore
    ? Math.round(classification.overallSafetyScore * 100)
    : brandSafetyRating === 'safe' ? 85
    : brandSafetyRating === 'caution' ? 55
    : 25;

  const cs = classification?.categoryScores;
  const categories = [
    { label: 'Brand Safety', score: extractCategoryScore(cs?.brandSafety, overallScore) },
    { label: 'Violence', score: extractCategoryScore(cs?.violence, Math.min(overallScore + 10, 100)) },
    { label: 'Adult Content', score: extractCategoryScore(cs?.adultContent, Math.min(overallScore + 5, 100)) },
    { label: 'Political', score: extractCategoryScore(cs?.political, overallScore) },
    { label: 'Substance', score: extractCategoryScore(cs?.substanceUse, Math.min(overallScore + 15, 100)) },
  ];

  const scoreColor = getSafetyScoreColor(overallScore);

  return (
    <View style={styles.safetyScoreContainer}>
      {/* Gauge */}
      <View style={[styles.safetyScoreGauge, { borderColor: scoreColor }]}>
        <Text style={[styles.safetyScoreValue, { color: scoreColor }]}>{overallScore}</Text>
      </View>

      {/* Category bars */}
      <View style={styles.safetyScoreCategories}>
        {categories.map((cat, i) => (
          <View key={i} style={styles.safetyScoreCategory}>
            <Text style={styles.safetyScoreCategoryLabel}>{cat.label}</Text>
            <View style={styles.safetyScoreCategoryBar}>
              <View
                style={[
                  styles.safetyScoreCategoryFill,
                  {
                    width: `${cat.score}%`,
                    backgroundColor: getSafetyScoreColor(cat.score),
                  },
                ]}
              />
            </View>
            <Text style={[styles.safetyScoreCategoryValue, { color: getSafetyScoreColor(cat.score) }]}>
              {cat.score}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Transcript Excerpts Component
function TranscriptExcerpts({ segments, brands = [], showHeading = false }: { segments: TranscriptSegment[]; brands?: string[]; showHeading?: boolean }) {
  // Aggregate consecutive short segments into sentences
  const aggregatedSegments: TranscriptSegment[] = [];
  let currentSegment: TranscriptSegment | null = null;

  for (const segment of segments) {
    // Skip very short segments (single words) - aggregate them
    if (currentSegment !== null && segment.start - currentSegment.end < 0.5) {
      // Append to current segment
      currentSegment = {
        start: currentSegment.start,
        end: segment.end,
        text: currentSegment.text + ' ' + segment.text,
      };
    } else {
      // Start new segment
      if (currentSegment !== null && currentSegment.text.split(' ').length >= 3) {
        aggregatedSegments.push(currentSegment);
      }
      currentSegment = { start: segment.start, end: segment.end, text: segment.text };
    }
  }

  // Add last segment if substantial
  if (currentSegment !== null && currentSegment.text.split(' ').length >= 3) {
    aggregatedSegments.push(currentSegment);
  }

  // Get key excerpts (first 5 meaningful segments)
  const keyExcerpts = aggregatedSegments.slice(0, 5);

  // If no meaningful excerpts, don't show the section
  if (keyExcerpts.length === 0) {
    return null;
  }

  return (
    <View>
      {showHeading && (
        <Text style={styles.analysisHeading}>Key Transcript Excerpts</Text>
      )}
      <View style={styles.transcriptContainer}>
        {keyExcerpts.map((segment, i) => (
          <View key={i} style={styles.transcriptSegment}>
            <Text style={styles.transcriptTimestamp}>{formatDuration(segment.start)}</Text>
            <Text style={styles.transcriptText}>{segment.text}</Text>
          </View>
        ))}
        {aggregatedSegments.length > 5 && (
          <Text style={{ fontSize: 9, color: WHALAR.mediumGray, marginTop: 4 }}>
            ... {aggregatedSegments.length - 5} more excerpts
          </Text>
        )}
      </View>
    </View>
  );
}

// Timeline Visualization Component
function TimelineVisualization({ logoDetections, videoDuration = 60 }: { logoDetections: LogoDetection[]; videoDuration?: number }) {
  // Flatten all appearances
  const allAppearances: Array<{ brand: string; start: number; end: number; color: string }> = [];
  logoDetections.forEach(logo => {
    logo.appearances.forEach(app => {
      allAppearances.push({
        brand: logo.brand,
        start: app.startTime,
        end: app.endTime,
        color: logo.likelySponsor ? '#a855f7' : '#71717a',
      });
    });
  });

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineBar}>
        {allAppearances.map((app, i) => {
          const left = (app.start / videoDuration) * 100;
          const width = Math.max(((app.end - app.start) / videoDuration) * 100, 1);
          return (
            <View
              key={i}
              style={[
                styles.timelineMarker,
                {
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: app.color,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Time labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 8, color: WHALAR.mediumGray }}>0:00</Text>
        <Text style={{ fontSize: 8, color: WHALAR.mediumGray }}>{formatDuration(videoDuration)}</Text>
      </View>

      {/* Legend */}
      <View style={styles.timelineLegend}>
        <View style={styles.timelineLegendItem}>
          <View style={[styles.timelineLegendDot, { backgroundColor: '#a855f7' }]} />
          <Text style={styles.timelineLegendText}>Likely Sponsor</Text>
        </View>
        <View style={styles.timelineLegendItem}>
          <View style={[styles.timelineLegendDot, { backgroundColor: '#71717a' }]} />
          <Text style={styles.timelineLegendText}>Incidental</Text>
        </View>
      </View>
    </View>
  );
}

// Helper to count severity levels
function countSeverities(findings: Finding[]) {
  return {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
  };
}

// Helper to aggregate video analysis data from findings
function aggregateVideoAnalysisFromFindings(findings: Finding[]): CreatorPdfProps['videoAnalysis'] {
  const logoDetections: LogoDetection[] = [];
  const transcriptSegments: TranscriptSegment[] = [];
  let contentClassification: ContentClassification | undefined;
  let transcript = '';
  let videoDuration = 0;

  for (const finding of findings) {
    const va = finding.socialMediaSource?.visualAnalysis as VisualAnalysisData | undefined;
    if (!va) continue;

    // Aggregate logo detections
    if (va.logoDetections) {
      for (const logo of va.logoDetections) {
        const existing = logoDetections.find(l => l.brand === logo.brand);
        if (existing) {
          existing.appearances.push(...logo.appearances);
          existing.totalDuration += logo.totalDuration;
          existing.likelySponsor = existing.likelySponsor || logo.likelySponsor;
        } else {
          logoDetections.push({ ...logo });
        }
      }
    }

    // Aggregate transcript segments
    if (va.transcriptSegments) {
      transcriptSegments.push(...va.transcriptSegments);
    }

    // Use first content classification found
    if (!contentClassification && va.contentClassification) {
      contentClassification = va.contentClassification;
    }

    // Aggregate video duration
    if (va.videoDuration) {
      videoDuration += va.videoDuration;
    }
  }

  if (logoDetections.length === 0 && transcriptSegments.length === 0 && !contentClassification) {
    return undefined;
  }

  return {
    logoDetections: logoDetections.length > 0 ? logoDetections : undefined,
    contentClassification,
    transcriptSegments: transcriptSegments.length > 0 ? transcriptSegments : undefined,
    transcript,
    videoDuration: videoDuration || 60,
  };
}

// Risk meter component for the header
function RiskMeter({ counts }: { counts: ReturnType<typeof countSeverities> }) {
  const total = counts.critical + counts.high + counts.medium + counts.low;
  if (total === 0) return null;

  return (
    <View style={styles.riskMeterContainer}>
      <View style={styles.riskMeterBar}>
        {counts.critical > 0 && (
          <View style={[styles.riskMeterSegment, {
            width: `${(counts.critical / total) * 100}%`,
            backgroundColor: '#ef4444'
          }]} />
        )}
        {counts.high > 0 && (
          <View style={[styles.riskMeterSegment, {
            width: `${(counts.high / total) * 100}%`,
            backgroundColor: '#f97316'
          }]} />
        )}
        {counts.medium > 0 && (
          <View style={[styles.riskMeterSegment, {
            width: `${(counts.medium / total) * 100}%`,
            backgroundColor: '#eab308'
          }]} />
        )}
        {counts.low > 0 && (
          <View style={[styles.riskMeterSegment, {
            width: `${(counts.low / total) * 100}%`,
            backgroundColor: '#22c55e'
          }]} />
        )}
      </View>
    </View>
  );
}

function CreatorPdfDocument({
  creatorName,
  batchName,
  socialLinks,
  riskLevel,
  summary,
  findings,
  generatedAt,
  videoAnalysis,
}: CreatorPdfProps) {
  const riskColor = riskColors[riskLevel];
  const severityCounts = countSeverities(findings);

  // Extract video analysis data from findings if not provided separately
  const aggregatedVideoAnalysis = videoAnalysis || aggregateVideoAnalysisFromFindings(findings);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Band */}
        <View style={styles.headerBand}>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>ORCA</Text>
            <Text style={styles.reportType}>Creator Vetting Report</Text>
          </View>
          <Text style={styles.title}>{creatorName}</Text>
          <Text style={styles.subtitle}>{batchName}</Text>
          <View style={[styles.riskBadge, { backgroundColor: riskColor.bg }]}>
            <Text style={[styles.riskText, { color: riskColor.text }]}>
              {riskLevel} RISK
            </Text>
          </View>

          {/* Risk meter visualization */}
          <RiskMeter counts={severityCounts} />

          {/* Risk stats */}
          <View style={styles.riskStatsRow}>
            {severityCounts.critical > 0 && (
              <View style={styles.riskStatItem}>
                <View style={[styles.riskStatDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.riskStatText}>{severityCounts.critical} Critical</Text>
              </View>
            )}
            {severityCounts.high > 0 && (
              <View style={styles.riskStatItem}>
                <View style={[styles.riskStatDot, { backgroundColor: '#f97316' }]} />
                <Text style={styles.riskStatText}>{severityCounts.high} High</Text>
              </View>
            )}
            {severityCounts.medium > 0 && (
              <View style={styles.riskStatItem}>
                <View style={[styles.riskStatDot, { backgroundColor: '#eab308' }]} />
                <Text style={styles.riskStatText}>{severityCounts.medium} Medium</Text>
              </View>
            )}
            {severityCounts.low > 0 && (
              <View style={styles.riskStatItem}>
                <View style={[styles.riskStatDot, { backgroundColor: '#22c55e' }]} />
                <Text style={styles.riskStatText}>{severityCounts.low} Low</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* AI Analysis */}
          {summary && (
            <View style={styles.section}>
              <View style={styles.sectionHeader} minPresenceAhead={100}>
                <Text style={styles.sectionTitle}>AI Analysis</Text>
              </View>
              {summary.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return (
                    <Text key={i} style={styles.analysisHeading}>
                      {line.replace('## ', '')}
                    </Text>
                  );
                }
                if (line.startsWith('- ') || line.startsWith('• ')) {
                  const bulletText = line.replace(/^[-•]\s*/, '');
                  const parts = parseMarkdownText(bulletText);
                  return (
                    <Text key={i} style={styles.analysisBullet}>
                      {'• '}
                      {parts.map((part, j) =>
                        part.bold
                          ? <Text key={j} style={{ fontWeight: 'bold' }}>{part.text}</Text>
                          : part.text
                      )}
                    </Text>
                  );
                }
                if (line.trim()) {
                  const parts = parseMarkdownText(line);
                  return (
                    <Text key={i} style={styles.analysisText}>
                      {parts.map((part, j) =>
                        part.bold
                          ? <Text key={j} style={{ fontWeight: 'bold' }}>{part.text}</Text>
                          : part.text
                      )}
                    </Text>
                  );
                }
                return null;
              })}
            </View>
          )}

          {/* Video Insights Section (new) */}
          {aggregatedVideoAnalysis && (
            <View style={styles.section}>
              <View style={styles.sectionHeader} minPresenceAhead={100}>
                <Text style={styles.sectionTitle}>Video Analysis Insights</Text>
              </View>

              {/* Safety Score Breakdown */}
              {(aggregatedVideoAnalysis.contentClassification || findings.some(f => f.socialMediaSource?.visualAnalysis?.brandSafetyRating)) && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.analysisHeading}>Safety Score Breakdown</Text>
                  <SafetyScoreBreakdown
                    classification={aggregatedVideoAnalysis.contentClassification}
                    brandSafetyRating={findings.find(f => f.socialMediaSource?.visualAnalysis?.brandSafetyRating)?.socialMediaSource?.visualAnalysis?.brandSafetyRating}
                  />
                </View>
              )}

              {/* Brand Exposure */}
              {aggregatedVideoAnalysis.logoDetections && aggregatedVideoAnalysis.logoDetections.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.analysisHeading}>Brand Exposure Summary</Text>
                  <BrandExposureTable
                    logoDetections={aggregatedVideoAnalysis.logoDetections}
                    videoDuration={aggregatedVideoAnalysis.videoDuration}
                  />
                  <TimelineVisualization
                    logoDetections={aggregatedVideoAnalysis.logoDetections}
                    videoDuration={aggregatedVideoAnalysis.videoDuration}
                  />
                </View>
              )}

              {/* Key Transcript Excerpts - only shows if there are meaningful aggregated excerpts */}
              {aggregatedVideoAnalysis.transcriptSegments && aggregatedVideoAnalysis.transcriptSegments.length > 0 && (
                <TranscriptExcerpts
                  segments={aggregatedVideoAnalysis.transcriptSegments}
                  brands={aggregatedVideoAnalysis.logoDetections?.map(l => l.brand)}
                  showHeading={true}
                />
              )}
            </View>
          )}

          {/* Social Profiles */}
          <View style={styles.section}>
            <View style={styles.sectionHeader} minPresenceAhead={100}>
              <Text style={styles.sectionTitle}>Social Profiles</Text>
            </View>
            <View style={styles.socialLinksGrid}>
              {socialLinks.map((link, i) => (
                <Link key={i} src={link} style={styles.socialLink}>
                  {formatSocialLink(link)}
                </Link>
              ))}
            </View>
          </View>

          {/* Findings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader} minPresenceAhead={100}>
              <Text style={styles.sectionTitle}>
                Findings ({findings.length})
              </Text>
            </View>
            {findings.length > 0 ? (
              findings.map((finding, i) => {
                const severityColor = severityColors[finding.severity] || severityColors.low;
                return (
                  <View
                    key={i}
                    wrap={false}
                    style={[
                      styles.finding,
                      { borderLeftColor: riskColors[finding.severity.toUpperCase() as RiskLevel]?.border || '#a1a1aa' },
                    ]}
                  >
                    <View style={styles.findingHeader}>
                      <Text style={styles.findingTitle}>{finding.title}</Text>
                      <View style={[styles.severityBadge, { backgroundColor: severityColor.bg }]}>
                        <Text style={[styles.severityText, { color: severityColor.text }]}>
                          {finding.severity}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.findingSummary} orphans={3} widows={3}>
                      {sanitizeScrapedText(finding.summary)}
                    </Text>
                    <View style={styles.findingSourceRow}>
                      <Text style={styles.findingSourceLabel}>Source: </Text>
                      <Link src={finding.source.url} style={styles.findingSourceLink}>
                        {finding.source.title}
                        {finding.source.publishedDate && ` (${formatSourceDate(finding.source.publishedDate)})`}
                      </Link>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noFindings}>
                No significant findings for this creator.
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>ORCA</Text>
          <Text style={styles.footerText}>
            Generated {generatedAt.toLocaleDateString()} at {generatedAt.toLocaleTimeString()} • Powered by AI
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateCreatorPdf(props: CreatorPdfProps): Promise<Blob> {
  const doc = <CreatorPdfDocument {...props} />;
  const blob = await pdf(doc).toBlob();
  return blob;
}
