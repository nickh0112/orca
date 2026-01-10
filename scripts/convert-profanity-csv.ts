/**
 * Script to convert profanity CSV files to TypeScript
 * Run with: npx tsx scripts/convert-profanity-csv.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ProfanityEntry {
  text: string;
  severity: number;
  category: string;
}

function parseCSV(filePath: string): ProfanityEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').slice(1); // Skip header
  const entries: ProfanityEntry[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Parse CSV line (handle commas in fields)
    const parts = line.split(',');
    if (parts.length < 8) continue;

    const text = parts[0].trim().toLowerCase();
    const severity = parseFloat(parts[7]) || 1.0;
    const category = parts[4].trim() || 'general';

    if (text) {
      entries.push({ text, severity, category });
    }
  }

  return entries;
}

function generateTypeScript(entries: ProfanityEntry[], language: string): string {
  // Group by severity for better organization
  const byCategory = new Map<string, ProfanityEntry[]>();

  for (const entry of entries) {
    const cat = entry.category || 'general';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(entry);
  }

  const output = `// Auto-generated profanity list for ${language}
// Source: creator-vetting-ms/csv/profanity_content_${language}.csv
// Generated: ${new Date().toISOString()}

export interface ProfanityWord {
  text: string;
  severity: number;
  category: string;
}

export const PROFANITY_LIST_${language.toUpperCase()}: ProfanityWord[] = ${JSON.stringify(entries, null, 2)};

export default PROFANITY_LIST_${language.toUpperCase()};
`;

  return output;
}

// Main
const csvDir = '/Users/nickhensel/Documents/creator-vetting-ms/csv';
const outputDir = '/Users/nickhensel/Documents/orca/src/lib/profanity/lists';

const languages = ['en', 'de'];

for (const lang of languages) {
  const csvPath = path.join(csvDir, `profanity_content_${lang}.csv`);

  if (!fs.existsSync(csvPath)) {
    console.log(`Skipping ${lang}: CSV file not found`);
    continue;
  }

  console.log(`Processing ${lang}...`);
  const entries = parseCSV(csvPath);
  const tsContent = generateTypeScript(entries, lang);

  const outputPath = path.join(outputDir, `${lang}.ts`);
  fs.writeFileSync(outputPath, tsContent);

  console.log(`  Written ${entries.length} entries to ${outputPath}`);
}

console.log('Done!');
