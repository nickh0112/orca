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
import type { Finding, RiskLevel } from '@/types';

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

interface CreatorPdfProps {
  creatorName: string;
  batchName: string;
  socialLinks: string[];
  riskLevel: RiskLevel;
  summary: string | null;
  findings: Finding[];
  generatedAt: Date;
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
}: CreatorPdfProps) {
  const riskColor = riskColors[riskLevel];
  const severityCounts = countSeverities(findings);

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
              <View style={styles.sectionHeader}>
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
                if (line.startsWith('- ')) {
                  return (
                    <Text key={i} style={styles.analysisBullet}>
                      • {line.replace('- ', '')}
                    </Text>
                  );
                }
                if (line.trim()) {
                  return (
                    <Text key={i} style={styles.analysisText}>
                      {line}
                    </Text>
                  );
                }
                return null;
              })}
            </View>
          )}

          {/* Social Profiles */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Social Profiles</Text>
            </View>
            <View style={styles.socialLinksGrid}>
              {socialLinks.map((link, i) => (
                <Link key={i} src={link} style={styles.socialLink}>
                  {link}
                </Link>
              ))}
            </View>
          </View>

          {/* Findings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
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
                    <Text style={styles.findingSummary}>{finding.summary}</Text>
                    <View style={styles.findingSourceRow}>
                      <Text style={styles.findingSourceLabel}>Source: </Text>
                      <Link src={finding.source.url} style={styles.findingSourceLink}>
                        {finding.source.title}
                        {finding.source.publishedDate && ` (${finding.source.publishedDate})`}
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
        <View style={styles.footer}>
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
