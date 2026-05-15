/**
 * Generate a static sitemap.xml from the transmog cache.
 *
 * Output → frontend/public/sitemap.xml (served at /sitemap.xml by both
 * the dev server and Vercel in production).
 *
 * Run after the cache is hydrated or whenever new sets are added:
 *   node scripts/generateSitemap.js [--base-url=https://transmogvault.vercel.app]
 *
 * The base URL defaults to https://transmogvault.vercel.app — override if
 * the production domain changes.
 */
const fs = require('fs');
const path = require('path');

const SETS_FILE = path.join(__dirname, '../data/blizzard_transmogs_cache.json');
const OUT_FILE  = path.join(__dirname, '../../frontend/public/sitemap.xml');

const arg = process.argv.find(a => a.startsWith('--base-url='));
const BASE_URL = (arg ? arg.split('=')[1] : 'https://transmogvault.vercel.app').replace(/\/+$/, '');

const sets = JSON.parse(fs.readFileSync(SETS_FILE, 'utf-8'));
const today = new Date().toISOString().slice(0, 10);

// Static routes get high priority; per-set pages are weight 0.6 since there
// are 3800 of them and search engines don't need to crawl all of them daily.
const staticRoutes = [
  { loc: '/',            priority: '1.0', changefreq: 'daily'   },
  { loc: '/catalog',     priority: '0.9', changefreq: 'daily'   },
  { loc: '/collections', priority: '0.7', changefreq: 'weekly'  },
];

const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
const xmlFooter = '</urlset>\n';

let body = '';
for (const r of staticRoutes) {
  body += `  <url>\n` +
          `    <loc>${BASE_URL}${r.loc}</loc>\n` +
          `    <lastmod>${today}</lastmod>\n` +
          `    <changefreq>${r.changefreq}</changefreq>\n` +
          `    <priority>${r.priority}</priority>\n` +
          `  </url>\n`;
}

for (const s of sets) {
  body += `  <url>\n` +
          `    <loc>${BASE_URL}/transmog/${s.id}</loc>\n` +
          `    <lastmod>${today}</lastmod>\n` +
          `    <changefreq>monthly</changefreq>\n` +
          `    <priority>0.6</priority>\n` +
          `  </url>\n`;
}

fs.writeFileSync(OUT_FILE, xmlHeader + body + xmlFooter);

const urlCount = staticRoutes.length + sets.length;
console.log(`✅ Wrote ${urlCount} URLs to ${OUT_FILE}`);
console.log(`   Base URL: ${BASE_URL}`);
