/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'player-images');
const CSV_PATH = path.join(OUTPUT_DIR, 'player_images.csv');
const PLAYER_GROUND_TRUTH_PATH = path.join(ROOT_DIR, 'scripts', 'player-data-ground-truth.json');
const IMAGE_CDN = 'https://documents.iplt20.com/ipl/IPLHeadshot2026/{id}.png';
const PLAYER_IMAGE_BASE_URL = (process.env.PLAYER_IMAGE_BASE_URL || '').trim().replace(/\/+$/, '');

function buildImageUrl(filename, headshotId) {
  if (!filename) {
    return '';
  }

  if (PLAYER_IMAGE_BASE_URL) {
    return PLAYER_IMAGE_BASE_URL + '/' + encodeURIComponent(filename);
  }

  return IMAGE_CDN.replace('{id}', headshotId);
}

const players = JSON.parse(fs.readFileSync(PLAYER_GROUND_TRUTH_PATH, 'utf-8'));

const csvHeader = 'player_name,slug,team,profile_id,headshot_id,image_filename,image_url,status';
const csvRows = players.map(p => {
  const hasHs = p.headshotId && p.headshotId.length > 0;
  const filename = hasHs ? p.slug + '_' + p.headshotId + '.png' : '';
  const url = hasHs ? buildImageUrl(filename, p.headshotId) : '';
  const filepath = filename ? path.join(OUTPUT_DIR, filename) : '';
  const exists = filepath && fs.existsSync(filepath) && fs.statSync(filepath).size > 1000;
  const status = !hasHs ? 'no_headshot' : (exists ? 'downloaded' : 'missing');
  const esc = (s) => (s.includes(',') || s.includes('"')) ? '"' + s.replace(/"/g, '""') + '"' : s;
  return [esc(p.name), p.slug, p.team, p.profileId, p.headshotId || '', filename, url, status].join(',');
});
fs.writeFileSync(CSV_PATH, [csvHeader, ...csvRows].join('\n'), 'utf-8');

const downloaded = csvRows.filter(r => r.endsWith(',downloaded')).length;
const missing = csvRows.filter(r => r.endsWith(',missing')).length;
const noHs = csvRows.filter(r => r.endsWith(',no_headshot')).length;

const images = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
let totalSize = 0;
images.forEach(f => { totalSize += fs.statSync(path.join(OUTPUT_DIR, f)).size; });

if (PLAYER_IMAGE_BASE_URL) {
  console.log('Using PLAYER_IMAGE_BASE_URL for image_url values: ' + PLAYER_IMAGE_BASE_URL);
}

console.log('CSV regenerated: ' + players.length + ' players');
console.log('downloaded=' + downloaded + '  missing=' + missing + '  no_headshot=' + noHs);
console.log('Image files: ' + images.length);
console.log('Total size: ' + (totalSize / 1024 / 1024).toFixed(1) + ' MB');
