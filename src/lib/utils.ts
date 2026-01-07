import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export function extractUsername(url: string): string | null {
  const patterns = [
    /(?:instagram\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com)\/(?:@)?([^\/\?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export interface SocialHandle {
  platform: 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'reddit' | 'unknown';
  handle: string;
  url: string;
}

export function extractSocialHandles(urls: string[]): SocialHandle[] {
  const handles: SocialHandle[] = [];

  for (const url of urls) {
    const lowerUrl = url.toLowerCase();

    // Instagram
    const igMatch = url.match(/instagram\.com\/(?:@)?([^\/\?]+)/i);
    if (igMatch && igMatch[1] !== 'p' && igMatch[1] !== 'reel' && igMatch[1] !== 'stories') {
      handles.push({ platform: 'instagram', handle: igMatch[1], url });
      continue;
    }

    // TikTok
    const ttMatch = url.match(/tiktok\.com\/(?:@)?([^\/\?]+)/i);
    if (ttMatch) {
      handles.push({ platform: 'tiktok', handle: ttMatch[1].replace('@', ''), url });
      continue;
    }

    // Twitter/X
    const twMatch = url.match(/(?:twitter\.com|x\.com)\/(?:@)?([^\/\?]+)/i);
    if (twMatch && twMatch[1] !== 'status' && twMatch[1] !== 'i') {
      handles.push({ platform: 'twitter', handle: twMatch[1], url });
      continue;
    }

    // YouTube
    const ytMatch = url.match(/youtube\.com\/(?:@|channel\/|c\/)?([^\/\?]+)/i);
    if (ytMatch && ytMatch[1] !== 'watch' && ytMatch[1] !== 'shorts') {
      handles.push({ platform: 'youtube', handle: ytMatch[1], url });
      continue;
    }

    // Reddit
    const rdMatch = url.match(/reddit\.com\/(?:u|user)\/([^\/\?]+)/i);
    if (rdMatch) {
      handles.push({ platform: 'reddit', handle: rdMatch[1], url });
      continue;
    }
  }

  return handles;
}

export function getPlatformFromUrl(url: string): string {
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter/X';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('youtube.com')) return 'YouTube';
  if (url.includes('facebook.com')) return 'Facebook';
  if (url.includes('twitch.tv')) return 'Twitch';
  return 'Other';
}
