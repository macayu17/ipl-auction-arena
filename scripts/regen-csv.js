/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'player-images');
const CSV_PATH = path.join(OUTPUT_DIR, 'player_images.csv');
const PLAYER_GROUND_TRUTH_PATH = path.join(ROOT_DIR, 'scripts', 'player-data-ground-truth.json');
const AUCTION_SHEET_PATH = path.join(ROOT_DIR, 'IPL AUCTION DATA SHEET.csv');
const SITEMAP_URL = 'https://www.iplt20.com/sitemap1.xml';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const IMAGE_CDN = 'https://documents.iplt20.com/ipl/IPLHeadshot2026/{id}.png';
const PLAYER_IMAGE_BASE_URL = (process.env.PLAYER_IMAGE_BASE_URL || '').trim().replace(/\/+$/, '');

const MANUAL_ALIAS_OVERRIDES = new Map(
  [
    ['aaron hardy', 'Aaron Hardie'],
    ['arshad khan', 'Mohd Arshad Khan'],
    ['azmatulah umarzai', 'Azmatullah Omarzai'],
    ['naman dhar', 'Naman Dhir'],
    ['nitish reddy', 'Nitish Kumar Reddy'],
    ['roman powel', 'Rovman Powell'],
    ['shahbaaz ahmed', 'Shahbaz Ahamad'],
    ['sunil narein', 'Sunil Narine'],
    ['venketesh iyer', 'Venkatesh Iyer'],
    ['devon convoy', 'Devon Conway'],
    ['nihal wadhera', 'Nehal Wadhera'],
    ['shemaron hetmyer', 'Shimron Hetmyer'],
    ['akash mandwal', 'Akash Madhwal'],
    ['gurnoor brar', 'Gurnoor Singh Brar'],
    ['josh hazelwood', 'Josh Hazlewood'],
    ['loki ferguson', 'Lockie Ferguson'],
    ['mohammad siraj', 'Mohammed Siraj'],
    ['mohseen khan', 'Mohsin Khan'],
    ['noor ahmed', 'Noor Ahmad'],
    ['vijay kumar vyashak', 'Vyshak Vijaykumar'],
    ['r sai kishore', 'Sai Kishore'],
    ['ravisrinivasan sai kishore', 'Sai Kishore'],
    ['henrick klassen', 'Heinrich Klaasen'],
    ['josh butler', 'Jos Buttler'],
    ['phillip salt', 'Phil Salt'],
    ['ryan rickleton', 'Ryan Rickelton'],
    ['tilak verma', 'N Tilak Varma'],
    ['mahisha tikshana', 'Maheesh Theekshana'],
    ['muhammed shami', 'Mohammad Shami'],
    ['varun chakroborty', 'Varun Chakaravarthy'],
    ["quinten d'cock", 'Quinton De Kock'],
  ].map(([left, right]) => [normalizeNameKey(left), right])
);

function normalizeNameKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function toCsvSafe(value) {
  const text = String(value ?? '');
  return text.includes(',') || text.includes('"')
    ? '"' + text.replace(/"/g, '""') + '"'
    : text;
}

function stripQuery(url) {
  return String(url || '').split('?')[0];
}

function normalizeTokens(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function diceCoefficient(left, right) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const bigrams = (value) => {
    const source = ` ${value} `;
    const set = new Set();
    for (let index = 0; index < source.length - 1; index += 1) {
      set.add(source.slice(index, index + 2));
    }
    return set;
  };

  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);

  let intersection = 0;
  for (const token of leftBigrams) {
    if (rightBigrams.has(token)) {
      intersection += 1;
    }
  }

  return (2 * intersection) / (leftBigrams.size + rightBigrams.size || 1);
}

function bestNameMatch(name, rows) {
  const targetKey = normalizeNameKey(name);
  const targetTokens = normalizeTokens(name);

  let bestRow = null;
  let bestScore = 0;

  for (const row of rows) {
    const candidateKey = normalizeNameKey(row.player_name);
    const candidateTokens = normalizeTokens(row.player_name);

    if (!candidateKey || Math.abs(candidateKey.length - targetKey.length) > 6) {
      continue;
    }

    if (candidateKey[0] !== targetKey[0]) {
      continue;
    }

    if (targetTokens.length > 0 && candidateTokens.length > 0) {
      const firstTokenMatches = targetTokens[0] === candidateTokens[0];
      if (!firstTokenMatches) {
        continue;
      }

      const hasTokenOverlap = targetTokens.some((token) => candidateTokens.includes(token));
      if (!hasTokenOverlap && targetTokens.length > 1 && candidateTokens.length > 1) {
        continue;
      }
    }

    const score = diceCoefficient(targetKey, candidateKey);

    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  if (!bestRow || bestScore < 0.75) {
    return null;
  }

  return {
    row: bestRow,
    score: bestScore,
  };
}

function extractPlayerProfileUrlsFromSitemap(xml) {
  const matches = xml.match(/<loc>https:\/\/www\.iplt20\.com\/players\/[a-z0-9-]+\/[0-9]+<\/loc>/g) ?? [];
  const urls = new Set();

  for (const tag of matches) {
    urls.add(tag.replace('<loc>', '').replace('</loc>', '').trim());
  }

  return Array.from(urls);
}

function extractHeadshotUrlFromProfileHtml(html) {
  const twitterImage = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i)?.[1] ?? '';
  const ogImage = html.match(/<meta\s+name="og:image"\s+content="([^"]+)"/i)?.[1] ?? '';
  const imageUrl = stripQuery(twitterImage || ogImage);

  if (!imageUrl || imageUrl.includes('/assets/images/ipl-thumbnail')) {
    return '';
  }

  return imageUrl;
}

function extractPlayerNameFromProfileHtml(html, fallbackSlug) {
  const ogTitle = html.match(/<meta\s+name="og:title"\s+content="([^"]+)"/i)?.[1] ?? '';
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '';
  const fromMeta = (ogTitle || title)
    .replace(/\s*\|\s*IPL.*$/i, '')
    .replace(/\s*-\s*IPL.*$/i, '')
    .trim();

  if (fromMeta) {
    return fromMeta;
  }

  return fallbackSlug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function mapLimit(items, concurrency, worker) {
  const queue = [...items];
  const output = [];

  const runners = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        continue;
      }

      output.push(await worker(item));
    }
  });

  await Promise.all(runners);
  return output;
}

function getAuctionSheetNames() {
  if (!fs.existsSync(AUCTION_SHEET_PATH)) {
    return [];
  }

  const parsed = Papa.parse(fs.readFileSync(AUCTION_SHEET_PATH, 'utf8'), {
    header: true,
    skipEmptyLines: true,
    transformHeader(header) {
      return String(header).trim();
    },
  });

  const key = Object.keys(parsed.data?.[0] ?? {}).find((header) => header.toLowerCase().includes('player'));
  if (!key) {
    return [];
  }

  return Array.from(
    new Set(
      parsed.data
        .map((row) => String(row[key] || '').trim())
        .filter(Boolean)
    )
  );
}

function mergeRows(primaryRows, incomingRow) {
  const key = normalizeNameKey(incomingRow.player_name);
  const existing = primaryRows.get(key);

  if (!existing) {
    primaryRows.set(key, incomingRow);
    return;
  }

  primaryRows.set(key, {
    player_name: incomingRow.player_name || existing.player_name,
    slug: incomingRow.slug || existing.slug,
    team: existing.team || incomingRow.team || '',
    profile_id: incomingRow.profile_id || existing.profile_id || '',
    headshot_id: incomingRow.headshot_id || existing.headshot_id || '',
    image_filename: existing.image_filename || incomingRow.image_filename || '',
    image_url: incomingRow.image_url || existing.image_url || '',
    status:
      existing.status === 'downloaded'
        ? 'downloaded'
        : incomingRow.status || existing.status || 'linked',
  });
}

async function buildRowsFromSitemap(existingRowsByKey, filenameByHeadshotId) {
  const sitemapXml = await fetchText(SITEMAP_URL);
  const profileUrls = extractPlayerProfileUrlsFromSitemap(sitemapXml);

  console.log(`Sitemap profiles discovered: ${profileUrls.length}`);

  const scraped = await mapLimit(profileUrls, 8, async (profileUrl) => {
    try {
      const html = await fetchText(profileUrl);
      const match = profileUrl.match(/\/players\/([a-z0-9-]+)\/([0-9]+)/i);

      if (!match) {
        return null;
      }

      const slug = match[1];
      const profileId = match[2];
      const playerName = extractPlayerNameFromProfileHtml(html, slug);
      const imageUrl = extractHeadshotUrlFromProfileHtml(html);
      const headshotId = imageUrl.match(/IPLHeadshot[0-9]{4}\/([0-9]+)\.png/i)?.[1] ?? '';

      const existing = existingRowsByKey.get(normalizeNameKey(playerName));
      const imageFilename =
        existing?.image_filename ||
        (headshotId ? filenameByHeadshotId.get(headshotId) ?? '' : '');

      return {
        player_name: playerName,
        slug,
        team: existing?.team || '',
        profile_id: profileId,
        headshot_id: headshotId,
        image_filename: imageFilename,
        image_url: imageUrl,
        status: imageFilename ? 'downloaded' : imageUrl ? 'linked' : 'missing',
      };
    } catch {
      return null;
    }
  });

  return scraped.filter(Boolean);
}

function buildRowsFromGroundTruth(filenameByHeadshotId) {
  if (!fs.existsSync(PLAYER_GROUND_TRUTH_PATH)) {
    return [];
  }

  const players = JSON.parse(fs.readFileSync(PLAYER_GROUND_TRUTH_PATH, 'utf-8'));

  return players
    .map((player) => {
      const headshotId = String(player.headshotId || '').trim();
      const hasHeadshot = headshotId.length > 0;
      const imageFilename = hasHeadshot
        ? `${player.slug}_${headshotId}.png`
        : '';

      if (hasHeadshot && imageFilename) {
        filenameByHeadshotId.set(headshotId, imageFilename);
      }

      const filePath = imageFilename ? path.join(OUTPUT_DIR, imageFilename) : '';
      const exists = filePath && fs.existsSync(filePath) && fs.statSync(filePath).size > 1000;

      return {
        player_name: String(player.name || '').trim(),
        slug: String(player.slug || '').trim(),
        team: String(player.team || '').trim(),
        profile_id: String(player.profileId || '').trim(),
        headshot_id: headshotId,
        image_filename: imageFilename,
        image_url: hasHeadshot ? IMAGE_CDN.replace('{id}', headshotId) : '',
        status: !hasHeadshot ? 'no_headshot' : exists ? 'downloaded' : 'missing',
      };
    })
    .filter((row) => row.player_name);
}

function getExistingManifestRows() {
  if (!fs.existsSync(CSV_PATH)) {
    return [];
  }

  const parsed = Papa.parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    header: true,
    skipEmptyLines: true,
    transformHeader(header) {
      return String(header).trim().toLowerCase();
    },
  });

  return parsed.data
    .map((row) => ({
      player_name: String(row.player_name || '').trim(),
      slug: String(row.slug || '').trim(),
      team: String(row.team || '').trim(),
      profile_id: String(row.profile_id || '').trim(),
      headshot_id: String(row.headshot_id || '').trim(),
      image_filename: String(row.image_filename || '').trim(),
      image_url: stripQuery(String(row.image_url || '').trim()),
      status: String(row.status || '').trim() || 'linked',
    }))
    .filter((row) => row.player_name);
}

async function main() {
  const csvHeader = 'player_name,slug,team,profile_id,headshot_id,image_filename,image_url,status';
  const filenameByHeadshotId = new Map();
  const rowsByKey = new Map();

  const existingRows = getExistingManifestRows();
  for (const row of existingRows) {
    if (row.headshot_id && row.image_filename) {
      filenameByHeadshotId.set(row.headshot_id, row.image_filename);
    }
    mergeRows(rowsByKey, row);
  }

  const groundTruthRows = buildRowsFromGroundTruth(filenameByHeadshotId);
  for (const row of groundTruthRows) {
    mergeRows(rowsByKey, row);
  }

  const sitemapRows = await buildRowsFromSitemap(rowsByKey, filenameByHeadshotId);
  for (const row of sitemapRows) {
    mergeRows(rowsByKey, row);
  }

  const auctionSheetNames = getAuctionSheetNames();
  let aliasCount = 0;
  const stillMissingFromSheet = [];

  for (const name of auctionSheetNames) {
    const key = normalizeNameKey(name);
    if (rowsByKey.has(key)) {
      continue;
    }

    const manualTarget = MANUAL_ALIAS_OVERRIDES.get(key);
    if (manualTarget) {
      const manualMatch = Array.from(rowsByKey.values()).find(
        (row) => normalizeNameKey(row.player_name) === normalizeNameKey(manualTarget)
      );

      if (manualMatch) {
        mergeRows(rowsByKey, {
          ...manualMatch,
          player_name: name,
          status: 'alias',
        });
        aliasCount += 1;
        continue;
      }
    }

    const match = bestNameMatch(name, Array.from(rowsByKey.values()));

    if (!match) {
      stillMissingFromSheet.push(name);
      continue;
    }

    mergeRows(rowsByKey, {
      ...match.row,
      player_name: name,
      status: 'alias',
    });
    aliasCount += 1;
  }

  const finalRows = Array.from(rowsByKey.values())
    .sort((left, right) => left.player_name.localeCompare(right.player_name));

  const csvRows = finalRows.map((row) => [
    toCsvSafe(row.player_name),
    toCsvSafe(row.slug),
    toCsvSafe(row.team),
    toCsvSafe(row.profile_id),
    toCsvSafe(row.headshot_id),
    toCsvSafe(row.image_filename),
    toCsvSafe(row.image_url),
    toCsvSafe(row.status),
  ].join(','));

  fs.writeFileSync(CSV_PATH, [csvHeader, ...csvRows].join('\n'), 'utf-8');

  const imageFiles = fs.readdirSync(OUTPUT_DIR).filter((fileName) => fileName.endsWith('.png'));
  let totalSize = 0;
  imageFiles.forEach((fileName) => {
    totalSize += fs.statSync(path.join(OUTPUT_DIR, fileName)).size;
  });

  const sheetMapped = auctionSheetNames.length - stillMissingFromSheet.length;

  console.log('CSV regenerated with sitemap + aliases');
  console.log(`Rows written: ${finalRows.length}`);
  console.log(`Alias rows added: ${aliasCount}`);
  console.log(`Auction sheet names mapped: ${sheetMapped}/${auctionSheetNames.length}`);
  if (stillMissingFromSheet.length > 0) {
    console.log('Still unmatched auction-sheet names:');
    stillMissingFromSheet.slice(0, 60).forEach((name) => console.log('  - ' + name));
  }
  console.log(`Image files: ${imageFiles.length}`);
  console.log('Total local image size: ' + (totalSize / 1024 / 1024).toFixed(1) + ' MB');

  if (PLAYER_IMAGE_BASE_URL) {
    console.log('PLAYER_IMAGE_BASE_URL is configured: ' + PLAYER_IMAGE_BASE_URL);
  }
}

main().catch((error) => {
  console.error('Failed to regenerate player image CSV');
  console.error(error);
  process.exit(1);
});
