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

export function getPlatformFromUrl(url: string): string {
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter/X';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('youtube.com')) return 'YouTube';
  if (url.includes('facebook.com')) return 'Facebook';
  if (url.includes('twitch.tv')) return 'Twitch';
  return 'Other';
}
