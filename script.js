// ===== Definisi DFA =====
const STATES = {
  Mati:    { led: 'off',   desc: 'Charger belum terhubung ke HP.' },
  Mengisi: { led: 'amber', desc: 'HP sedang diisi daya.' },
  Penuh:   { led: 'green', desc: 'Baterai sudah penuh. Aman dicabut.' },
  Error:   { led: 'red',   desc: 'Ada gangguan. Cabut HP atau tekan Reset.' }
};
const START = 'Mati';
const ACCEPT = ['Penuh'];
const ALPHABET = ['P', 'U', 'F', 'E', 'R'];
const NAMES = { P: 'Colok', U: 'Cabut', F: 'Penuh', E: 'Gangguan', R: 'Reset' };

// δ(state, simbol) -> state berikutnya (fungsi total: semua pasangan terdefinisi)
const DELTA = {
  Mati:    { P: 'Mengisi', U: 'Mati',  F: 'Mati',    E: 'Mati',  R: 'Mati' },
  Mengisi: { P: 'Mengisi', U: 'Mati',  F: 'Penuh',   E: 'Error', R: 'Mengisi' },
  Penuh:   { P: 'Penuh',   U: 'Mati',  F: 'Penuh',   E: 'Error', R: 'Penuh' },
  Error:   { P: 'Error',   U: 'Mati',  F: 'Error',   E: 'Error', R: 'Mati' }
};

// ===== Elemen =====
const $ = id => document.getElementById(id);
const led = $('led'), stateName = $('stateName'), stateDesc = $('stateDesc');
const level = $('level'), levelText = $('levelText'), logEl = $('log'), table = $('table');

let current = START;
let battery = 20;
let last = null; // { from, sym }

// ===== Tabel transisi =====
function buildTable() {
  let h = '<thead><tr><th>δ</th>' + ALPHABET.map(s => `<th>${s}<br><small>${NAMES[s]}</small></th>`).join('') + '</tr></thead><tbody>';
  for (const q of Object.keys(DELTA)) {
    const cls = [q === START ? 'start' : '', ACCEPT.includes(q) ? 'final' : ''].join(' ');
    h += `<tr data-q="${q}"><td class="${cls}">${q}</td>` +
         ALPHABET.map(s => `<td data-s="${s}">${DELTA[q][s]}</td>`).join('') + '</tr>';
  }
  table.innerHTML = h + '</tbody>';
}

function render() {
  const s = STATES[current];
  led.className = 'led ' + s.led;
  led.setAttribute('aria-label', 'Lampu indikator: ' + current);
  stateName.textContent = current;
  stateDesc.textContent = s.desc;
  level.style.width = battery + '%';
  levelText.textContent = Math.round(battery) + '%';

  table.querySelectorAll('tr').forEach(r => r.classList.toggle('now', r.dataset.q === current));
  table.querySelectorAll('td.last').forEach(c => c.classList.remove('last'));
  if (last) {
    const cell = table.querySelector(`tr[data-q="${last.from}"] td[data-s="${last.sym}"]`);
    if (cell) cell.classList.add('last');
  }
}

function addLog(from, sym, to) {
  const li = document.createElement('li');
  li.innerHTML = `<b>${from}</b> --${sym}--> <b>${to}</b>`;
  logEl.prepend(li);
  while (logEl.children.length > 30) logEl.lastChild.remove();
}

// ===== Satu langkah DFA =====
function step(sym) {
  const from = current;
  const to = DELTA[from][sym];
  last = { from, sym };
  current = to;
  addLog(from, sym, to);
  render();
}

// ===== Tombol input =====
document.querySelectorAll('[data-sym]').forEach(b =>
  b.addEventListener('click', () => step(b.dataset.sym)));

$('btnUse').addEventListener('click', () => { battery = 20; render(); });

// ===== Simulasi pengisian baterai =====
setInterval(() => {
  if (current !== 'Mengisi') return;
  battery = Math.min(100, battery + 1);
  if (battery >= 100) step('F'); // baterai penuh -> input F otomatis
  else render();
}, 150);

// ===== Uji string =====
function runString(str) {
  let q = START;
  const path = [q];
  for (const ch of str) {
    q = DELTA[q][ch];
    path.push(q);
  }
  return { path, accepted: ACCEPT.includes(q) };
}

$('btnRun').addEventListener('click', () => {
  const str = $('strInput').value.toUpperCase().replace(/\s+/g, '');
  const trace = $('trace'), verdict = $('verdict');
  const bad = [...str].filter(c => !ALPHABET.includes(c));
  if (!str || bad.length) {
    trace.innerHTML = '';
    verdict.className = 'verdict no';
    verdict.textContent = bad.length
      ? 'Simbol tidak dikenal: ' + [...new Set(bad)].join(', ') + '. Gunakan P, U, F, E, R.'
      : 'Isi urutan input dulu.';
    return;
  }
  const { path, accepted } = runString(str);
  let html = `<span class="chip">${path[0]}</span>`;
  for (let i = 0; i < str.length; i++)
    html += `<span class="arrow">--${str[i]}--&gt;</span><span class="chip">${path[i + 1]}</span>`;
  trace.innerHTML = html;
  verdict.className = 'verdict ' + (accepted ? 'ok' : 'no');
  verdict.textContent = accepted
    ? `Diterima: berakhir di ${path.at(-1)} (keadaan akhir).`
    : `Ditolak: berakhir di ${path.at(-1)}, bukan keadaan akhir.`;
});
$('strInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnRun').click(); });

buildTable();
render();
$('btnRun').click();
