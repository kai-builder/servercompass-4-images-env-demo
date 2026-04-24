const express = require('express');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 3000);
const apiBaseUrl = process.env.API_BASE_URL || 'http://api:4000';

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value, maxLength) {
  const text = String(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function extractThemeColor(rawValue) {
  if (typeof rawValue !== 'string') {
    return '#0ea5e9';
  }

  const trimmed = rawValue.trim();
  const fallbackMatch = trimmed.match(/:-\s*(#[0-9a-fA-F]{3,8})\s*}/);
  if (fallbackMatch) {
    return fallbackMatch[1];
  }

  const hexMatch = trimmed.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) {
    return hexMatch[0];
  }

  return '#0ea5e9';
}

function hexToRgb(hexColor) {
  let normalized = hexColor.replace('#', '');
  if (normalized.length === 3 || normalized.length === 4) {
    normalized = normalized
      .slice(0, 3)
      .split('')
      .map((char) => char + char)
      .join('');
  } else {
    normalized = normalized.slice(0, 6);
  }

  if (normalized.length !== 6) {
    return { r: 14, g: 165, b: 233 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function mixColor(hexColor, amount, target = 255) {
  const { r, g, b } = hexToRgb(hexColor);
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const mix = (channel) => clamp(channel + (target - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function buildEnvSvg(payload) {
  const env = payload && payload.env ? payload.env : {};
  const entries = Object.entries(env).slice(0, 12);
  const width = 980;
  const baseHeight = 230;
  const rowHeight = 30;
  const height = Math.max(380, baseHeight + entries.length * rowHeight);
  const themeColor = extractThemeColor(env.THEME_COLOR);
  const headerStart = mixColor(themeColor, 0.18, 255);
  const headerEnd = mixColor(themeColor, 0.08, 255);
  const keyColor = mixColor(themeColor, 0.42, 255);

  const rows = entries
    .map(([key, value], index) => {
      const y = 205 + index * rowHeight;
      const bgFill = index % 2 === 0 ? '#0f1d34' : '#13233d';
      const displayValue = value == null || value === '' ? '(empty)' : value;
      return `
  <rect x="40" y="${y - 21}" width="900" height="26" rx="8" fill="${bgFill}" />
  <text x="58" y="${y - 4}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="14" fill="${keyColor}">${escapeXml(
    truncate(key, 32)
  )}</text>
  <text x="280" y="${y - 4}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="14" fill="#e2e8f0">${escapeXml(
    truncate(displayValue, 78)
  )}</text>`;
    })
    .join('\n');

  const hostname = payload && payload.hostname ? payload.hostname : '-';
  const generatedAt = payload && payload.generatedAt ? payload.generatedAt : '-';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">ServerCompass Env Snapshot</title>
  <desc id="desc">Rendered environment variables from the API container</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0b1220" />
      <stop offset="100%" stop-color="#172a46" />
    </linearGradient>
    <linearGradient id="header" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="${headerStart}" />
      <stop offset="100%" stop-color="${headerEnd}" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)" rx="20" />
  <rect x="0" y="0" width="${width}" height="88" fill="url(#header)" rx="20" />
  <text x="40" y="52" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff">ServerCompass ENV Snapshot</text>
  <text x="40" y="112" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16" fill="#93c5fd">hostname: ${escapeXml(
    truncate(hostname, 60)
  )}</text>
  <text x="40" y="138" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16" fill="#93c5fd">generatedAt: ${escapeXml(
    truncate(generatedAt, 60)
  )}</text>
  <text x="40" y="174" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16" fill="#cbd5e1">Key</text>
  <text x="280" y="174" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16" fill="#cbd5e1">Value</text>
${rows}
</svg>`;
}

app.get('/api/env', async (_req, res) => {
  try {
    const upstream = await fetch(`${apiBaseUrl}/env`);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (error) {
    res.status(502).json({
      error: 'Failed to reach API service',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get('/api/env-image.svg', async (_req, res) => {
  try {
    const upstream = await fetch(`${apiBaseUrl}/env`);
    const data = await upstream.json();
    const svg = buildEnvSvg(data);

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(upstream.ok ? 200 : 502).send(svg);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="980" height="360" viewBox="0 0 980 360" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="980" height="360" rx="20" fill="#111827" />
  <text x="40" y="70" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" fill="#f8fafc">ServerCompass ENV Snapshot</text>
  <text x="40" y="130" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="18" fill="#fca5a5">Failed to load env image</text>
  <text x="40" y="168" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="14" fill="#fecaca">${escapeXml(
    truncate(message, 110)
  )}</text>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).send(fallback);
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend running on port ${port}`);
});
