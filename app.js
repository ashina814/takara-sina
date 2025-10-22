 const TOTAL = 300;
const STORAGE_KEY = 'lottery_ticket_manager_v2';
const ADMIN_PASS = 'admin123'; // 任意に変更OK

let tickets = [];
let selectedTicket = null;
let adminMode = false;

const gridEl = document.getElementById('grid');
const detailInfo = document.getElementById('detailInfo');
const ownerInput = document.getElementById('ownerInput');
const assignBtn = document.getElementById('assignBtn');
const unassignBtn = document.getElementById('unassignBtn');
const fileInput = document.getElementById('fileInput');
const exportJsonBtn = document.getElementById('exportJson');
const exportCsvBtn = document.getElementById('exportCsv');
const searchInput = document.getElementById('searchInput');
const onlyEmpty = document.getElementById('onlyEmpty');
const adminToggle = document.getElementById('adminToggle');
const adminIndicator = document.getElementById('adminIndicator');
const adminPanel = document.getElementById('adminPanel');
const logsEl = document.getElementById('logs');
const perPage = document.getElementById('perPage');
const resetAllBtn = document.getElementById('resetAll');

function initTickets() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      tickets = JSON.parse(data);
      if (tickets.length === TOTAL) return;
    } catch {}
  }
  tickets = Array.from({ length: TOTAL }, (_, i) => ({ num: i + 1, owner: null }));
  save();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  log('保存しました');
}

function log(msg) {
  const p = document.createElement('div');
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logsEl.prepend(p);
}

function render() {
  const term = searchInput.value.trim().toLowerCase();
  const onlyEmptyChecked = onlyEmpty.checked;
  const limit = parseInt(perPage.value, 10);

  gridEl.innerHTML = '';
  const filtered = tickets.filter(t => {
    if (onlyEmptyChecked && t.owner) return false;
    if (term && !(t.owner || '').toLowerCase().includes(term)) return false;
    return true;
  }).slice(0, limit);

  for (const t of filtered) {
    const div = document.createElement('div');
    div.className = 'ticket ' + (t.owner ? 'taken' : 'empty');
    div.dataset.num = t.num;
    div.innerHTML = `<div class="num">${t.num}</div><small>${t.owner || '空き'}</small>`;
    if (selectedTicket && selectedTicket.num === t.num) div.classList.add('highlight');
    div.addEventListener('click', () => selectTicket(t.num));
    gridEl.appendChild(div);
  }

  updateDetail();
}

function selectTicket(num) {
  selectedTicket = tickets.find(t => t.num === num);
  updateDetail();
  render();
}

function updateDetail() {
  if (!selectedTicket) {
    detailInfo.textContent = 'チケットを選択してください。';
    adminPanel.classList.remove('visible');
    return;
  }

  detailInfo.innerHTML = `チケット <strong>#${selectedTicket.num}</strong><br>所有者: <strong>${selectedTicket.owner || '空き'}</strong>`;

  if (adminMode) {
    adminPanel.classList.add('visible');
    ownerInput.value = selectedTicket.owner || '';
  } else {
    adminPanel.classList.remove('visible');
  }
}

// 管理モード切替
adminToggle.addEventListener('click', () => {
  if (!adminMode) {
    const pass = prompt('管理パスワードを入力:');
    if (pass === ADMIN_PASS) {
      adminMode = true;
      adminIndicator.textContent = '管理モード';
      adminIndicator.style.background = '#ffd54f';
      log('管理モードON');
    } else {
      alert('パスワードが違います');
    }
  } else {
    adminMode = false;
    adminIndicator.textContent = '一般表示';
    adminIndicator.style.background = '';
    log('管理モードOFF');
  }
  render();
});

// 割当／解除
assignBtn.addEventListener('click', () => {
  if (!selectedTicket) return alert('チケットを選んでください');
  const name = ownerInput.value.trim();
  if (!name) return alert('所有者名を入力してください');
  selectedTicket.owner = name;
  save();
  render();
  log(`#${selectedTicket.num} を ${name} に割当`);
});

unassignBtn.addEventListener('click', () => {
  if (!selectedTicket) return alert('チケットを選んでください');
  const prev = selectedTicket.owner;
  selectedTicket.owner = null;
  save();
  render();
  log(`#${selectedTicket.num} の割当を解除 (${prev || '未割当'})`);
});

// エクスポート
exportJsonBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(tickets, null, 2)], { type: 'application/json' });
  download(blob, 'tickets.json');
});

exportCsvBtn.addEventListener('click', () => {
  const rows = ['owner,ticket'];
  tickets.forEach(t => {
    if (t.owner) rows.push(`${escapeCsv(t.owner)},${t.num}`);
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  download(blob, 'tickets.csv');
});

// インポート
fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();

  if (file.name.endsWith('.json')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        tickets = parsed.map(t => ({ num: t.num, owner: t.owner || null }));
        save(); render(); log('JSONを読み込みました');
      }
    } catch {
      alert('JSONの読み込みに失敗');
    }
  } else {
    const lines = text.split(/\r?\n/).filter(Boolean);
    lines.slice(1).forEach(line => {
      const [owner, num] = line.split(',');
      const n = parseInt(num, 10);
      if (n >= 1 && n <= TOTAL) tickets[n - 1].owner = owner.trim();
    });
    save(); render(); log('CSVを読み込みました');
  }

  e.target.value = '';
});

function escapeCsv(s) {
  return /,|"/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// 全クリア
resetAllBtn.addEventListener('click', () => {
  if (!confirm('全ての割当をクリアしますか？')) return;
  tickets.forEach(t => (t.owner = null));
  save();
  render();
  log('全データをクリアしました');
});

searchInput.addEventListener('input', render);
onlyEmpty.addEventListener('change', render);
perPage.addEventListener('change', render);

initTickets();
render();