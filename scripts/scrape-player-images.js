/**
 * IPL Player Image Scraper v4 - Profile Page Based
 * 
 * Scrapes headshot IDs from INDIVIDUAL player profile pages (not squad pages)
 * to guarantee correct player-to-image mapping.
 * 
 * Step 1: Get player slugs/profileIds from all 10 team squad pages
 * Step 2: Visit each player's profile page to get their correct headshot ID
 * Step 3: Download all images
 * Step 4: Generate CSV
 *
 * Usage: node scripts/scrape-player-images.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const TEAMS = [
  'chennai-super-kings',
  'delhi-capitals',
  'gujarat-titans',
  'kolkata-knight-riders',
  'lucknow-super-giants',
  'mumbai-indians',
  'punjab-kings',
  'rajasthan-royals',
  'royal-challengers-bengaluru',
  'sunrisers-hyderabad',
];

const SQUAD_URL = 'https://www.iplt20.com/teams/{team}/squad';
const PLAYER_URL = 'https://www.iplt20.com/players/{slug}/{id}';
const IMAGE_CDN = 'https://documents.iplt20.com/ipl/IPLHeadshot2026/{id}.png';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'player-images');
const CSV_PATH = path.join(OUTPUT_DIR, 'player_images.csv');
const CACHE_PATH = path.resolve(__dirname, 'player-data-ground-truth.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const f = fs.createWriteStream(dest);
      res.pipe(f);
      f.on('finish', () => { f.close(); resolve(); });
      f.on('error', (e) => { fs.unlink(dest, () => {}); reject(e); });
    }).on('error', reject);
  });
}

/** Extract player links from squad page HTML */
function extractPlayersFromSquad(html, team) {
  const players = [];
  const seen = new Set();
  // Match: href="/players/{slug}/{profileId}"
  const re = /href=["'](?:https?:\/\/www\.iplt20\.com)?\/players\/([a-z0-9-]+)\/(\d+)\s*["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1];
    const profileId = m[2];
    if (!seen.has(slug)) {
      seen.add(slug);
      // Try to extract player name from data attribute nearby
      const vicinity = html.substring(Math.max(0, m.index - 500), Math.min(html.length, m.index + 500));
      const nameMatch = vicinity.match(/data-player_name=["']([^"']+)["']/);
      const name = nameMatch
        ? nameMatch[1].trim()
        : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      players.push({ name, slug, profileId, team });
    }
  }
  return players;
}

/** Extract headshot ID from player profile page HTML */
function extractHeadshotFromProfile(html) {
  // Look for IPLHeadshot2026/{id}.png pattern
  const match = html.match(/IPLHeadshot2026\/(\d+)\.png/);
  return match ? match[1] : null;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IPL Player Image Scraper v4 (Profile-Page Based)');
  console.log('  Guaranteed correct player-to-image mapping');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── Step 1: Get all players from squad pages ──
  console.log('📋 Step 1: Collecting players from squad pages...\n');
  let allPlayers = [];

  for (const team of TEAMS) {
    const url = SQUAD_URL.replace('{team}', team);
    console.log(`  🏏 ${team}...`);
    try {
      const html = (await fetchUrl(url)).toString('utf-8');
      const players = extractPlayersFromSquad(html, team);
      console.log(`     ✅ ${players.length} players`);
      allPlayers.push(...players);
    } catch (e) {
      console.log(`     ❌ ${e.message}`);
    }
    await sleep(300);
  }

  // Deduplicate
  const unique = new Map();
  for (const p of allPlayers) {
    if (!unique.has(p.slug)) unique.set(p.slug, p);
  }
  allPlayers = Array.from(unique.values());
  console.log(`\n  Total unique players: ${allPlayers.length}\n`);

  // ── Step 2: Get headshot IDs from individual profile pages ──
  console.log('📸 Step 2: Fetching headshot IDs from profile pages...\n');

  let profilesFetched = 0;
  let profilesFailed = 0;

  for (let i = 0; i < allPlayers.length; i++) {
    const p = allPlayers[i];
    const url = PLAYER_URL.replace('{slug}', p.slug).replace('{id}', p.profileId);

    try {
      const html = (await fetchUrl(url)).toString('utf-8');
      const headshotId = extractHeadshotFromProfile(html);
      p.headshotId = headshotId;
      profilesFetched++;
      process.stdout.write(`  [${i + 1}/${allPlayers.length}] ✅ ${p.name} → ${headshotId || 'NONE'}              \r`);
    } catch (e) {
      profilesFailed++;
      p.headshotId = null;
      console.log(`  [${i + 1}/${allPlayers.length}] ❌ ${p.name}: ${e.message}`);
    }

    // Throttle: wait longer every 10 requests
    await sleep(i % 10 === 9 ? 500 : 200);
  }

  console.log('\n');
  const withHs = allPlayers.filter(p => p.headshotId);
  const noHs = allPlayers.filter(p => !p.headshotId);
  console.log(`  Profiles fetched: ${profilesFetched}, failed: ${profilesFailed}`);
  console.log(`  With headshot: ${withHs.length}, without: ${noHs.length}`);
  if (noHs.length > 0) {
    noHs.forEach(p => console.log(`    ⚠️  ${p.name} (${p.team})`));
  }

  // Save ground truth
  fs.writeFileSync(CACHE_PATH, JSON.stringify(allPlayers, null, 2), 'utf-8');
  console.log(`\n  💾 Ground truth saved: ${CACHE_PATH}\n`);

  // ── Step 3: Clean up & download images ──
  console.log('📥 Step 3: Downloading images...\n');

  // Clean existing
  const existing = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  existing.forEach(f => fs.unlinkSync(path.join(OUTPUT_DIR, f)));
  console.log(`  🧹 Cleaned ${existing.length} old files\n`);

  let downloaded = 0, failed = 0;
  const failedList = [];

  for (let i = 0; i < withHs.length; i++) {
    const p = withHs[i];
    const filename = `${p.slug}_${p.headshotId}.png`;
    p.imageFilename = filename;
    const filepath = path.join(OUTPUT_DIR, filename);
    const imageUrl = IMAGE_CDN.replace('{id}', p.headshotId);

    try {
      await downloadFile(imageUrl, filepath);
      downloaded++;
      process.stdout.write(`  [${i + 1}/${withHs.length}] ✅ ${p.name}                              \r`);
    } catch (e) {
      failed++;
      failedList.push(p);
      console.log(`  [${i + 1}/${withHs.length}] ❌ ${p.name} (${p.headshotId}): ${e.message}`);
    }
    if (i % 5 === 0) await sleep(150);
  }

  console.log('\n');
  console.log(`  ✅ Downloaded: ${downloaded}`);
  console.log(`  ❌ Failed: ${failed}\n`);

  // ── Step 4: Generate CSV ──
  console.log('📄 Step 4: Generating CSV...\n');

  const csvHeader = 'player_name,slug,team,profile_id,headshot_id,image_filename,image_url,status';
  const csvRows = allPlayers.map(p => {
    const hasHs = !!p.headshotId;
    const url = hasHs ? IMAGE_CDN.replace('{id}', p.headshotId) : '';
    const filename = p.imageFilename || '';
    const wasFailed = failedList.find(f => f.slug === p.slug);
    const status = !hasHs ? 'no_headshot' : (wasFailed ? 'failed' : 'downloaded');
    const esc = (s) => (s.includes(',') || s.includes('"')) ? '"' + s.replace(/"/g, '""') + '"' : s;
    return [esc(p.name), p.slug, p.team, p.profileId, p.headshotId || '', filename, url, status].join(',');
  });
  fs.writeFileSync(CSV_PATH, [csvHeader, ...csvRows].join('\n'), 'utf-8');
  console.log(`  ✅ CSV: ${CSV_PATH}`);

  // Verify
  const imgs = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  let totalSize = 0;
  imgs.forEach(f => { totalSize += fs.statSync(path.join(OUTPUT_DIR, f)).size; });

  console.log(`\n📊 Final verification:`);
  console.log(`  Players: ${allPlayers.length}`);
  console.log(`  Images: ${imgs.length}`);
  console.log(`  Size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log('\n🎉 Done!\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
