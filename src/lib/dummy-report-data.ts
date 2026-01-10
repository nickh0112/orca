/**
 * Dummy data for UI prototypes
 * This simulates a real creator vetting report with various findings
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Platform = 'instagram' | 'youtube' | 'tiktok' | 'web';
export type Category = 'legal' | 'brand_mention' | 'content_safety' | 'disclosure' | 'political' | 'controversy';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FlaggedSpan {
  start: number;
  end: number;
  text: string;
  reason: string;
  severity: Severity;
}

export interface PostContent {
  caption: string;
  transcript?: string;
  flaggedSpans: FlaggedSpan[];
}

export interface Engagement {
  likes?: number;
  comments?: number;
  views?: number;
  shares?: number;
}

export interface Finding {
  id: string;
  platform: Platform;
  category: Category;
  severity: Severity;
  title: string;
  summary: string;
  postContent?: PostContent;
  engagement?: Engagement;
  source: {
    url: string;
    title: string;
    date: string;
  };
  isUncertain?: boolean;
  uncertainReason?: string;
  connectedTo?: string[]; // IDs of related findings
}

export interface TriageSummary {
  executiveSummary: string;
  keyPoints: string[];
  recommendation: {
    action: 'approve' | 'caution' | 'review' | 'reject';
    rationale: string;
  };
  categoryScores: {
    legal: number;
    brandSafety: number;
    content: number;
    political: number;
  };
}

export interface DummyReport {
  creator: {
    name: string;
    riskLevel: RiskLevel;
    riskScore: number;
    platforms: Platform[];
    handles: {
      instagram?: string;
      youtube?: string;
      tiktok?: string;
    };
  };
  summary: TriageSummary;
  findings: Finding[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    uncertain: number;
    byPlatform: Record<Platform, number>;
    byCategory: Record<Category, number>;
  };
}

export const dummyReport: DummyReport = {
  creator: {
    name: "MrBeast",
    riskLevel: "CRITICAL",
    riskScore: 87,
    platforms: ["instagram", "youtube", "tiktok"],
    handles: {
      instagram: "mrbeast",
      youtube: "MrBeast",
      tiktok: "mrbeast",
    },
  },
  summary: {
    executiveSummary: "MrBeast presents significant brand safety risks due to multiple ongoing lawsuits, regulatory violations, and documented behavioral issues. While his massive audience (430M+ subscribers) is attractive, the volume and severity of allegations create substantial reputational liability for partner brands.",
    keyPoints: [
      "Multiple class-action lawsuits from Beast Games contestants alleging unsafe conditions and mistreatment",
      "FTC sponsor disclosure violations documented across 3 posts",
      "Past offensive content (racial slurs, homophobic language) resurfaced in 2024",
      "Children's Advertising Review Unit formal recommendations for Feastables",
      "NBA Charlotte Hornets dropped Feastables sponsorship after one season",
    ],
    recommendation: {
      action: "review",
      rationale: "Critical issues require thorough human review. If proceeding, require contractual protections including indemnification clauses and immediate termination rights.",
    },
    categoryScores: {
      legal: 4,
      brandSafety: 3,
      content: 3,
      political: 1,
    },
  },
  findings: [
    // CRITICAL - Legal Issues
    {
      id: "f1",
      platform: "web",
      category: "legal",
      severity: "critical",
      title: "Beast Games Class Action Lawsuit - Contestant Mistreatment",
      summary: "Multiple contestants have filed a class-action lawsuit alleging unsafe working conditions, unpaid wages, and mistreatment during the production of Amazon's 'Beast Games.' Plaintiffs describe 'dangerous' challenges and inadequate medical care.",
      source: {
        url: "https://variety.com/2024/tv/news/mrbeast-beast-games-lawsuit-1234567890/",
        title: "Variety",
        date: "2024-09-15",
      },
      connectedTo: ["f2"],
    },
    {
      id: "f2",
      platform: "web",
      category: "legal",
      severity: "critical",
      title: "Sexual Harassment Allegations in Beast Games Production",
      summary: "Female contestants allege sexual harassment during production, with claims of inappropriate behavior by production staff going unaddressed by show management.",
      source: {
        url: "https://deadline.com/2024/beast-games-harassment-allegations/",
        title: "Deadline",
        date: "2024-09-18",
      },
      connectedTo: ["f1"],
    },
    // CRITICAL - Regulatory
    {
      id: "f3",
      platform: "web",
      category: "disclosure",
      severity: "critical",
      title: "CARU Formal Recommendations - Children's Advertising Violations",
      summary: "The Children's Advertising Review Unit (CARU) issued formal recommendations to MrBeast and Feastables to improve advertising disclosures, product claims, and data collection practices affecting children.",
      source: {
        url: "https://www.ftc.gov/news-events/caru-mrbeast-feastables/",
        title: "BBB National Programs",
        date: "2024-07-22",
      },
      connectedTo: ["f4", "f5", "f6"],
    },
    // HIGH - Disclosure Issues (Instagram Posts)
    {
      id: "f4",
      platform: "instagram",
      category: "disclosure",
      severity: "high",
      title: "Undisclosed Nike Partnership Post",
      summary: "Post promotes Nike products without proper #ad or #sponsored disclosure, violating FTC guidelines for influencer marketing.",
      postContent: {
        caption: "Love rocking my new Air Max today! These kicks are fire 🔥 Best shoes I've ever owned fr fr",
        transcript: "Hey guys check out these amazing shoes Nike sent me, they're absolutely incredible. I've been wearing them everywhere, to the gym, to shoots, they're so comfortable. Honestly the best shoes I've ever had.",
        flaggedSpans: [
          { start: 37, end: 41, text: "Nike", reason: "Brand mentioned without #ad disclosure", severity: "high" },
        ],
      },
      engagement: { likes: 2400000, comments: 45000 },
      source: {
        url: "https://instagram.com/p/xyz123",
        title: "Instagram Post",
        date: "2024-03-15",
      },
      connectedTo: ["f3"],
    },
    {
      id: "f5",
      platform: "instagram",
      category: "disclosure",
      severity: "high",
      title: "Feastables Promotion Without Clear Sponsorship Disclosure",
      summary: "While MrBeast owns Feastables, the material connection is not clearly disclosed in this promotional post, which could mislead consumers.",
      postContent: {
        caption: "These new Feastables flavors are insane!! Which one are you trying first? 🍫",
        transcript: "Yo guys you have to try these new Feastables chocolate bars, we just dropped three new flavors and they're absolutely incredible. The peanut butter one is my favorite but honestly they're all amazing.",
        flaggedSpans: [
          { start: 10, end: 19, text: "Feastables", reason: "Owned brand promoted without disclosure of ownership", severity: "high" },
        ],
      },
      engagement: { likes: 3100000, comments: 67000 },
      source: {
        url: "https://instagram.com/p/abc456",
        title: "Instagram Post",
        date: "2024-04-02",
      },
      connectedTo: ["f3"],
    },
    {
      id: "f6",
      platform: "youtube",
      category: "disclosure",
      severity: "high",
      title: "Sponsored Segment Without Verbal Disclosure",
      summary: "Video contains a sponsored segment for a mobile game but lacks clear verbal disclosure at the start of the sponsored portion.",
      postContent: {
        caption: "I Spent 50 Hours Buried Alive",
        transcript: "...and speaking of things that are awesome, let me tell you about this amazing game I've been playing. It's called Raid Shadow Legends and it's completely free to download...",
        flaggedSpans: [
          { start: 75, end: 95, text: "Raid Shadow Legends", reason: "Sponsored content without clear disclosure", severity: "high" },
        ],
      },
      engagement: { views: 45000000, likes: 2100000, comments: 89000 },
      source: {
        url: "https://youtube.com/watch?v=def789",
        title: "YouTube Video",
        date: "2024-02-28",
      },
      connectedTo: ["f3"],
    },
    // HIGH - Past Offensive Content
    {
      id: "f7",
      platform: "web",
      category: "content_safety",
      severity: "critical",
      title: "Resurfaced Clips Containing Racial Slurs",
      summary: "Multiple clips from earlier content (2017-2018) resurfaced showing MrBeast using racial slurs. Creator has acknowledged and apologized but controversy reignited in 2024.",
      source: {
        url: "https://insider.com/mrbeast-old-clips-controversy-2024/",
        title: "Business Insider",
        date: "2024-08-10",
      },
      connectedTo: ["f8"],
    },
    {
      id: "f8",
      platform: "web",
      category: "content_safety",
      severity: "high",
      title: "Homophobic Language in Archived Videos",
      summary: "Archived videos contain homophobic language and jokes. While creator has distanced himself from this content, it remains accessible and continues to be cited in criticism.",
      source: {
        url: "https://them.us/story/mrbeast-old-homophobic-content/",
        title: "Them",
        date: "2024-08-12",
      },
      connectedTo: ["f7"],
    },
    // MEDIUM - Brand Safety
    {
      id: "f9",
      platform: "instagram",
      category: "brand_mention",
      severity: "medium",
      title: "Competitor Brand Visible in Background",
      summary: "Pepsi products visible in background of post. While not explicitly promoted, could create association issues for Coca-Cola partnerships.",
      postContent: {
        caption: "Behind the scenes of the new video! This one is gonna be CRAZY 🎬",
        transcript: undefined,
        flaggedSpans: [],
      },
      engagement: { likes: 1800000, comments: 32000 },
      source: {
        url: "https://instagram.com/p/ghi012",
        title: "Instagram Post",
        date: "2024-05-10",
      },
      isUncertain: true,
      uncertainReason: "Brand visibility may be incidental - requires visual review",
    },
    {
      id: "f10",
      platform: "tiktok",
      category: "brand_mention",
      severity: "medium",
      title: "Discussion of Energy Drink Brands",
      summary: "Video discusses various energy drink brands, expressing preference for Prime over competitors. Could conflict with other beverage partnerships.",
      postContent: {
        caption: "Which energy drink is actually the best? 🥤",
        transcript: "Okay so I've been trying all these energy drinks and honestly Prime is still my favorite. Red Bull is okay, Monster is too sweet, but Prime just hits different. Logan really knew what he was doing with that formula.",
        flaggedSpans: [
          { start: 60, end: 65, text: "Prime", reason: "Competitor brand endorsement", severity: "medium" },
          { start: 85, end: 93, text: "Red Bull", reason: "Competitor brand mention", severity: "low" },
          { start: 106, end: 113, text: "Monster", reason: "Competitor brand mention", severity: "low" },
        ],
      },
      engagement: { views: 12000000, likes: 890000, shares: 45000 },
      source: {
        url: "https://tiktok.com/@mrbeast/video/123",
        title: "TikTok Video",
        date: "2024-04-18",
      },
    },
    // MEDIUM - Political/Controversy
    {
      id: "f11",
      platform: "tiktok",
      category: "political",
      severity: "medium",
      title: "Comment on Political Figure Generates Controversy",
      summary: "Offhand comment about a political figure in a video sparked debate in comments and was picked up by political media outlets.",
      postContent: {
        caption: "Random thoughts while editing at 3am",
        transcript: "...I mean the whole political situation is just wild right now. I try to stay out of it but sometimes you just can't help but have an opinion you know? Anyway back to editing this video...",
        flaggedSpans: [
          { start: 16, end: 34, text: "political situation", reason: "Political commentary", severity: "medium" },
        ],
      },
      engagement: { views: 8500000, likes: 650000, comments: 125000 },
      source: {
        url: "https://tiktok.com/@mrbeast/video/456",
        title: "TikTok Video",
        date: "2024-03-22",
      },
    },
    // MEDIUM - Controversy
    {
      id: "f12",
      platform: "web",
      category: "controversy",
      severity: "medium",
      title: "Criticism of Philanthropy Videos as Exploitative",
      summary: "Academic and media criticism of MrBeast's philanthropy content as potentially exploitative, using disadvantaged individuals for views. Ongoing debate about ethics of filmed charitable giving.",
      source: {
        url: "https://theatlantic.com/culture/mrbeast-philanthropy-debate/",
        title: "The Atlantic",
        date: "2024-06-15",
      },
    },
    {
      id: "f13",
      platform: "web",
      category: "legal",
      severity: "medium",
      title: "2023 Reckless Driving Citation",
      summary: "MrBeast received a reckless driving citation in North Carolina in 2023. Citation was paid and no further legal action taken.",
      source: {
        url: "https://tmz.com/mrbeast-driving-citation-2023/",
        title: "TMZ",
        date: "2023-11-05",
      },
    },
    // LOW - Minor Issues
    {
      id: "f14",
      platform: "instagram",
      category: "content_safety",
      severity: "low",
      title: "Mild Profanity in Caption",
      summary: "Post caption contains word 'damn' which may conflict with family-friendly brand guidelines.",
      postContent: {
        caption: "This view is damn beautiful 🏔️ #vacation #nature",
        transcript: undefined,
        flaggedSpans: [
          { start: 13, end: 17, text: "damn", reason: "Mild profanity", severity: "low" },
        ],
      },
      engagement: { likes: 950000, comments: 12000 },
      source: {
        url: "https://instagram.com/p/jkl345",
        title: "Instagram Post",
        date: "2024-01-15",
      },
    },
    {
      id: "f15",
      platform: "youtube",
      category: "brand_mention",
      severity: "low",
      title: "Incidental Tesla Appearance",
      summary: "Tesla vehicle appears briefly in video. No endorsement or promotion, purely incidental.",
      postContent: {
        caption: "Last To Leave Circle Wins $500,000",
        transcript: "...okay so we're setting up the challenge here and - oh there goes my Tesla, I asked someone to move it - anyway as I was saying...",
        flaggedSpans: [
          { start: 73, end: 78, text: "Tesla", reason: "Brand mention (incidental)", severity: "low" },
        ],
      },
      engagement: { views: 89000000, likes: 3200000, comments: 145000 },
      source: {
        url: "https://youtube.com/watch?v=mno678",
        title: "YouTube Video",
        date: "2024-02-10",
      },
      isUncertain: true,
      uncertainReason: "Brand mention appears incidental - may not require disclosure",
    },
    {
      id: "f16",
      platform: "instagram",
      category: "content_safety",
      severity: "low",
      title: "Suggestive Comment Response",
      summary: "Creator's reply to a comment could be interpreted as mildly suggestive, though likely intended as humor.",
      postContent: {
        caption: "That's what she said 😏",
        transcript: undefined,
        flaggedSpans: [],
      },
      engagement: { likes: 450000, comments: 8900 },
      source: {
        url: "https://instagram.com/p/comment123",
        title: "Instagram Comment",
        date: "2024-04-25",
      },
      isUncertain: true,
      uncertainReason: "Context unclear - appears to be common joke format",
    },
    // Additional findings for variety
    {
      id: "f17",
      platform: "web",
      category: "controversy",
      severity: "high",
      title: "Charlotte Hornets End Feastables Partnership",
      summary: "NBA's Charlotte Hornets announced they will not renew their sponsorship deal with Feastables after one season, citing 'strategic realignment' though timing coincides with recent controversies.",
      source: {
        url: "https://sportsbusiness.com/hornets-feastables-partnership-ends/",
        title: "Sports Business Journal",
        date: "2024-08-25",
      },
      connectedTo: ["f3"],
    },
    {
      id: "f18",
      platform: "youtube",
      category: "content_safety",
      severity: "medium",
      title: "Dangerous Stunt Warning Concerns",
      summary: "Video features potentially dangerous stunt (burying alive challenge) that some safety experts have criticized as promoting risky behavior to young viewers.",
      postContent: {
        caption: "I Spent 50 Hours Buried Alive",
        transcript: "So I'm about to be buried alive for 50 hours. I've got air, food, water, but honestly this is terrifying. Don't try this at home kids... or do, I'm not your dad.",
        flaggedSpans: [
          { start: 133, end: 180, text: "Don't try this at home kids... or do, I'm not your dad", reason: "Undermined safety warning", severity: "medium" },
        ],
      },
      engagement: { views: 45000000, likes: 2100000, comments: 89000 },
      source: {
        url: "https://youtube.com/watch?v=def789",
        title: "YouTube Video",
        date: "2024-02-28",
      },
    },
    {
      id: "f19",
      platform: "tiktok",
      category: "brand_mention",
      severity: "low",
      title: "Gaming Setup Showcases Multiple Brands",
      summary: "Gaming setup tour shows Razer, Logitech, and other gaming peripherals. Common practice but could create conflicts with exclusive tech partnerships.",
      postContent: {
        caption: "My setup tour since y'all keep asking 🎮",
        transcript: "Okay so you guys keep asking about my setup. I've got the Razer keyboard, Logitech mouse, Samsung monitors... honestly I just use whatever feels best.",
        flaggedSpans: [
          { start: 56, end: 61, text: "Razer", reason: "Tech brand mention", severity: "low" },
          { start: 72, end: 80, text: "Logitech", reason: "Tech brand mention", severity: "low" },
          { start: 88, end: 95, text: "Samsung", reason: "Tech brand mention", severity: "low" },
        ],
      },
      engagement: { views: 15000000, likes: 1100000, shares: 89000 },
      source: {
        url: "https://tiktok.com/@mrbeast/video/789",
        title: "TikTok Video",
        date: "2024-05-05",
      },
    },
    {
      id: "f20",
      platform: "web",
      category: "legal",
      severity: "low",
      title: "2018 Arrest Record (Resolved)",
      summary: "Record of 2018 arrest for trespassing during video filming. Charges were dropped and incident is over 5 years old. Included for completeness.",
      source: {
        url: "https://localnews.com/youtuber-arrested-trespassing-2018/",
        title: "Local News Archive",
        date: "2018-06-12",
      },
      isUncertain: true,
      uncertainReason: "Old record (6+ years) - relevance may be limited",
    },
  ],
  stats: {
    total: 20,
    critical: 4,
    high: 5,
    medium: 6,
    low: 5,
    uncertain: 4,
    byPlatform: {
      instagram: 5,
      youtube: 3,
      tiktok: 4,
      web: 8,
    },
    byCategory: {
      legal: 4,
      brand_mention: 4,
      content_safety: 4,
      disclosure: 4,
      political: 1,
      controversy: 3,
    },
  },
};

// Helper functions for working with the data
export function getFindingsByPlatform(platform: Platform): Finding[] {
  return dummyReport.findings.filter(f => f.platform === platform);
}

export function getFindingsBySeverity(severity: Severity): Finding[] {
  return dummyReport.findings.filter(f => f.severity === severity);
}

export function getFindingsByCategory(category: Category): Finding[] {
  return dummyReport.findings.filter(f => f.category === category);
}

export function getCriticalAndHighFindings(): Finding[] {
  return dummyReport.findings.filter(f => f.severity === 'critical' || f.severity === 'high');
}

export function getUncertainFindings(): Finding[] {
  return dummyReport.findings.filter(f => f.isUncertain);
}

export function getConnectedFindings(findingId: string): Finding[] {
  const finding = dummyReport.findings.find(f => f.id === findingId);
  if (!finding?.connectedTo) return [];
  return dummyReport.findings.filter(f => finding.connectedTo?.includes(f.id));
}

export function groupFindingsByPlatform(): Record<Platform, Finding[]> {
  return {
    instagram: getFindingsByPlatform('instagram'),
    youtube: getFindingsByPlatform('youtube'),
    tiktok: getFindingsByPlatform('tiktok'),
    web: getFindingsByPlatform('web'),
  };
}

export function groupFindingsByCategory(): Record<Category, Finding[]> {
  return {
    legal: getFindingsByCategory('legal'),
    brand_mention: getFindingsByCategory('brand_mention'),
    content_safety: getFindingsByCategory('content_safety'),
    disclosure: getFindingsByCategory('disclosure'),
    political: getFindingsByCategory('political'),
    controversy: getFindingsByCategory('controversy'),
  };
}

// Sort findings by severity (critical first)
export function sortBySeverity(findings: Finding[]): Finding[] {
  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...findings].sort((a, b) => order[a.severity] - order[b.severity]);
}

// Format engagement numbers
export function formatEngagement(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

// Get severity color
export function getSeverityColor(severity: Severity): string {
  const colors: Record<Severity, string> = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'green',
  };
  return colors[severity];
}

// Get category label
export function getCategoryLabel(category: Category): string {
  const labels: Record<Category, string> = {
    legal: 'Legal',
    brand_mention: 'Brand Mention',
    content_safety: 'Content Safety',
    disclosure: 'Disclosure',
    political: 'Political',
    controversy: 'Controversy',
  };
  return labels[category];
}

// Get platform icon name (for lucide-react)
export function getPlatformIcon(platform: Platform): string {
  const icons: Record<Platform, string> = {
    instagram: 'Instagram',
    youtube: 'Youtube',
    tiktok: 'Music2', // TikTok-like icon
    web: 'Globe',
  };
  return icons[platform];
}
