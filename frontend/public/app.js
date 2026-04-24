const envRows = document.getElementById('env-rows');
const refreshBtn = document.getElementById('refresh-btn');
const status = document.getElementById('status');
const hostname = document.getElementById('hostname');
const generatedAt = document.getElementById('generated-at');
const serviceStatus = document.getElementById('service-status');
const envImage = document.getElementById('env-image');

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
    valueCell.textContent = value ?? '(empty)';

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
