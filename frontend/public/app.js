const envRows = document.getElementById('env-rows');
const refreshBtn = document.getElementById('refresh-btn');
const status = document.getElementById('status');
const hostname = document.getElementById('hostname');
const generatedAt = document.getElementById('generated-at');
const serviceStatus = document.getElementById('service-status');
const envImage = document.getElementById('env-image');

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

function applyThemeColor(rawValue) {
  const themeColor = extractThemeColor(rawValue);
  document.documentElement.style.setProperty('--accent', themeColor);
}

function normalizeEnvValue(rawValue) {
  if (typeof rawValue !== 'string') {
    return rawValue ?? '(empty)';
  }

  const trimmed = rawValue.trim();
  const fallbackMatch = trimmed.match(/^\$\{[A-Za-z_][A-Za-z0-9_]*(?:(:?[-?]))([^}]*)\}$/);
  if (fallbackMatch) {
    return fallbackMatch[2];
  }

  return trimmed;
}

function refreshEnvImage() {
  envImage.src = `/api/env-image.svg?t=${Date.now()}`;
}

function renderRows(envObj) {
  envRows.innerHTML = '';

  Object.entries(envObj).forEach(([key, value]) => {
    const row = document.createElement('tr');

    const keyCell = document.createElement('td');
    keyCell.textContent = key;

    const valueCell = document.createElement('td');
    valueCell.textContent = normalizeEnvValue(value);

    row.appendChild(keyCell);
    row.appendChild(valueCell);
    envRows.appendChild(row);
  });
}

async function refreshEnv() {
  status.textContent = 'Loading...';

  try {
    const response = await fetch('/api/env');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Request failed');
    }

    renderRows(payload.env || {});
    applyThemeColor(payload.env ? payload.env.THEME_COLOR : null);
    hostname.textContent = payload.hostname || '-';
    generatedAt.textContent = payload.generatedAt || '-';
    serviceStatus.textContent = JSON.stringify(payload.services || {}, null, 2);
    refreshEnvImage();
    status.textContent = 'Loaded';
  } catch (error) {
    status.textContent = `Error: ${error.message}`;
    serviceStatus.textContent = '';
    refreshEnvImage();
  }
}

refreshBtn.addEventListener('click', refreshEnv);
refreshEnv();
