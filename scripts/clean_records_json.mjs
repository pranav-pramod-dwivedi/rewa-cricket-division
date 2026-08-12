import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data/records.json');

const db = JSON.parse(readFileSync(DATA, 'utf8'));

function isJunkLine(line) {
  const l = line.trim();
  if (!l) return true;
  const lower = l.toLowerCase();

  // HTML / JSON / Scraped code
  if (l.startsWith('<') || l.includes('class=') || l.includes('{"@context') || l.includes('VideoObject') || l.includes('schema.org') || l.includes('WPSideBar')) return true;

  // Cricbuzz / CricHeroes brand / watermark noise
  if (lower.includes('cricbuzz') || lower.includes('cricheroes') || lower.includes('cin u72901')) return true;

  // Sign up / Login / Ads / Sponsored text
  if (lower.includes('sponsored') || lower.includes('sign up') || lower.includes('sign in') || lower.includes('login') || lower.includes('log in') || lower.includes('get quote') || lower.includes('register') || lower.includes('learn more') || lower.includes('go premium')) return true;
  if (lower.includes('ramky') || lower.includes('scaler') || lower.includes('nambiar') || lower.includes('iforex') || lower.includes('hearing loss')) return true;
  if (lower.includes('confused between ai') || lower.includes('trading? start here') || lower.includes('side income') || lower.includes('township') || lower.includes('bhk smart homes')) return true;

  // Navigation, headers, footers
  if (lower.includes('live scores') || lower.includes('start scoring') || lower.includes('download scorecard') || lower.includes('every match deserves') || lower.includes('keep a match record')) return true;

  const exactJunk = [
    'home', 'matches', 'tournaments', 'associations', 'network', 'community', 'looking',
    'add ons', 'go live', 'super sponsor', 'tournament guide', 'cricket tips', 'news',
    'faqs', 'blogs', 'organize tournament', 'cricket tools', 'store', 'jobs', 'contact us',
    'past', 'summary', 'scorecard', 'commentary', 'analysis', 'heroes', 'mvp', 'teams',
    'gallery', 'best performances', 'about', 'privacy policy', 'terms of service',
    'paid service terms', 'icc policy', 'rankings', 'archives', 'series', 'videos', 'schedule',
    'all', 'alllive nowtoday', 'international', 'league', 'domestic', 'women'
  ];
  if (exactJunk.includes(lower)) return true;

  if (l.startsWith('TOTAL VIEWS:') || l.startsWith('LIVE VIEWERS:')) return true;
  if (l.includes('SLK vs ABF') || l.includes('BRM vs LDN') || l.includes('IRE vs AFG') || l.includes('UAE vs SCO') || l.includes('The Hundred') || l.includes('CPL 20') || l.includes('TNPL 20') || l.includes('DPL 20')) return true;
  if (l.includes('Gill very much ready') || l.includes('Tests or T20s') || l.includes('Dhoni or Rohit')) return true;

  return false;
}

function cleanMatchNotes(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const cleanLines = [];
  for (const l of lines) {
    if (!isJunkLine(l)) {
      cleanLines.push(l.trim());
    }
  }
  return cleanLines.join('\n').trim();
}

let cleanedMatches = 0;
for (const m of db.matches) {
  if (m.notes) {
    const oldNotes = m.notes;
    const newNotes = cleanMatchNotes(oldNotes);
    if (oldNotes !== newNotes) {
      m.notes = newNotes;
      cleanedMatches++;
    }
  }
}

let cleanedPlayers = 0;
for (const p of db.players) {
  if (p.bio) {
    const oldBio = p.bio;
    let newBio = p.bio.replace(/\s*\(Source:\s*Cricbuzz\)/gi, '')
      .replace(/\s*\(source:\s*cricbuzz\)/gi, '')
      .replace(/cricbuzz/gi, '')
      .trim();
    if (oldBio !== newBio) {
      p.bio = newBio;
      cleanedPlayers++;
    }
  }
}

writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
console.log(`Successfully cleaned ${cleanedMatches} matches and ${cleanedPlayers} player bios in records.json`);
