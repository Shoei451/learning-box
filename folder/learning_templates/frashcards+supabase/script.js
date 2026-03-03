// ╔═══════════════════════════════════════╗
// ║  CONFIG — ここを編集                   ║
// ╚═══════════════════════════════════════╝
const SUPABASE_URL      = 'https://gjuqsyaugrsshmjerhme.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdXFzeWF1Z3Jzc2htamVyaG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzA3NTYsImV4cCI6MjA4MjA0Njc1Nn0.V8q5ddz5tPy7wBaQ73aGtmCZyqzA6pPciPRwRIZjJcs';
const TABLE_NAME        = 'koten_questions'; // Supabase のテーブル名
const APP_TITLE         = '古典常識';        // アプリのタイトル
// ╚═══════════════════════════════════════╝

// ─── State ───
let allQuestions = [];
let deck = [], deckIdx = 0;
let isFlipped = false, isTransitioning = false;
let mastery = {};
let selCat = 'mix', selCount = '20';
let editingId = null;
const sbUrl = SUPABASE_URL.trim().replace(/\/$/, '');
const sbKey = SUPABASE_ANON_KEY.trim();

// ─── App title ───
document.getElementById('appTitle').innerHTML = APP_TITLE + '<em>.</em>';
document.getElementById('heroTitle').innerHTML = APP_TITLE + '<em>.</em>';
document.getElementById('heroEyebrow').textContent = APP_TITLE + ' Quiz';
document.title = APP_TITLE;

// ═══ THEME ═══
document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('fc-theme', next);
});
(function() {
  const t = localStorage.getItem('fc-theme') || 'dark';
  document.documentElement.dataset.theme = t;
})();

// ═══ MODE SWITCH ═══
function switchMode(mode, btn) {
  document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.h-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-' + mode).classList.add('active');
  btn.classList.add('active');
  if (mode === 'editor') renderQList();
}

// ═══ SUPABASE ═══
async function sbFetch(method, path, body) {
  const res = await fetch(sbUrl + path, {
    method,
    headers: {
      'apikey': sbKey,
      'Authorization': 'Bearer ' + sbKey,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || res.statusText); }
  return res.status === 204 ? null : res.json();
}
function norm(r) {
  return { id: r.id, category: (r.category||'').trim(), question: r.question,
           answer: r.answer, explanation: r.explanation||'', image_url: r.image_url||'' };
}

async function loadFromSupabase(feedback = false) {
  if (!sbUrl || !sbKey) return;
  setSbStatus('', '接続中…');
  try {
    const data = await sbFetch('GET', `/rest/v1/${TABLE_NAME}?select=*&order=id`);
    allQuestions = data.map(norm);
    setSbStatus('ok', `接続済み（${allQuestions.length}件）`);
    if (feedback) showToast(`${allQuestions.length} 件を読み込みました`);
    buildCatChips();
    updateStartMeta();
    renderQList();
  } catch(e) {
    setSbStatus('err', 'エラー: ' + e.message);
    if (feedback) showToast('接続エラー: ' + e.message);
  }
}
function setSbStatus(type, msg) {
  const el = document.getElementById('sbStatus');
  el.textContent = msg;
  el.className = 'sb-status' + (type ? ' ' + type : '');
}

// ═══ START SCREEN ═══
function buildCatChips() {
  const cats = [...new Set(allQuestions.map(q => q.category))].filter(Boolean).sort();
  const wrap = document.getElementById('catChips');
  wrap.innerHTML = `<button class="chip active" data-cat="mix">Mix</button>` +
    cats.map(c => `<button class="chip" data-cat="${c}">${c}</button>`).join('');
  wrap.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      selCat = btn.dataset.cat;
      wrap.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateStartMeta();
    });
  });
  // restore selection
  const active = wrap.querySelector(`[data-cat="${selCat}"]`) || wrap.querySelector('[data-cat="mix"]');
  if (active) { wrap.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active')); active.classList.add('active'); }
}

function updateStartMeta() {
  const pool = allQuestions.filter(q => selCat === 'mix' || q.category === selCat);
  const n = selCount === 'all' ? pool.length : Math.min(+selCount, pool.length);
  document.getElementById('startMeta').textContent = `出題 ${n} 問 / 対象 ${pool.length} 問`;
}

document.querySelectorAll('[data-count]').forEach(btn => {
  btn.addEventListener('click', () => {
    selCount = btn.dataset.count;
    document.querySelectorAll('[data-count]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateStartMeta();
  });
});

function openStart() {
  mastery = {};
  document.getElementById('completeOverlay').style.display = 'none';
  document.getElementById('startOverlay').style.display = 'flex';
  updateStartMeta();
}

function startStudy() {
  if (!allQuestions.length) { showToast('問題がありません'); return; }
  document.getElementById('startOverlay').style.display = 'none';
  mastery = {};
  buildDeck();
}

// ═══ DECK ═══
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function buildDeck() {
  let pool = allQuestions.filter(q => selCat === 'mix' || q.category === selCat);
  if (selCount !== 'all') pool = shuffle([...pool]).slice(0, Math.min(+selCount, pool.length));
  deck = shuffle([...pool]);
  deckIdx = 0; isFlipped = false;
  renderCard();
}

// ═══ RENDER CARD ═══
function renderCard() {
  const body = document.getElementById('cardBody');
  body.style.transition = 'none';
  body.classList.remove('flipped');
  void body.offsetWidth;
  body.style.transition = '';
  isFlipped = false;
  setMasteryActive(false);

  if (!deck.length) {
    document.getElementById('cardQuestion').textContent = '該当する問題がありません';
    document.getElementById('deckIndicator').textContent = '0 / 0';
    return;
  }
  const q = deck[deckIdx];
  const total = deck.length;

  document.getElementById('progressFill').style.width = ((deckIdx + 1) / total * 100) + '%';
  document.getElementById('deckIndicator').textContent = (deckIdx + 1) + ' / ' + total;
  document.getElementById('prevBtn').disabled = deckIdx === 0;
  document.getElementById('nextBtn').disabled = deckIdx === total - 1;

  const badge = q.category || '';
  document.getElementById('frontBadge').textContent = badge;
  document.getElementById('backBadge').textContent  = badge;

  const img = document.getElementById('cardImage');
  if (q.image_url) { img.src = q.image_url; img.style.display = 'block'; }
  else img.style.display = 'none';

  document.getElementById('cardQuestion').textContent    = q.question;
  document.getElementById('cardAnswer').textContent      = q.answer;
  document.getElementById('cardExplanation').textContent = q.explanation || '';

  renderDots();
}
function renderDots() {
  const row = document.getElementById('masteryDots');
  if (deck.length > 60) { row.innerHTML = ''; return; }
  row.innerHTML = deck.map((q, i) => {
    const m = mastery[q.id] || '';
    return `<div class="m-dot ${m} ${i === deckIdx ? 'current' : ''}"></div>`;
  }).join('');
}
function setMasteryActive(on) {
  document.querySelectorAll('.mastery-btn').forEach(b => b.classList.toggle('active', on));
}

// ═══ FLIP & NAV ═══
function flipCard() {
  if (!deck.length || isTransitioning) return;
  isFlipped = !isFlipped;
  document.getElementById('cardBody').classList.toggle('flipped', isFlipped);
  setMasteryActive(isFlipped);
}
function transitionTo(idx, dir) {
  if (isTransitioning || idx < 0 || idx >= deck.length || idx === deckIdx) return;
  isTransitioning = true;
  const scene = document.getElementById('cardScene');
  const outCls = dir >= 0 ? 'swap-out-l' : 'swap-out-r';
  const inCls  = dir >= 0 ? 'swap-in-r'  : 'swap-in-l';
  scene.classList.add(outCls);
  setTimeout(() => {
    scene.classList.remove(outCls);
    deckIdx = idx; renderCard();
    void scene.offsetWidth;
    scene.classList.add(inCls);
    setTimeout(() => { scene.classList.remove(inCls); isTransitioning = false; }, 180);
  }, 140);
}
function nextCard() { if (!isTransitioning) { if (deckIdx < deck.length - 1) transitionTo(deckIdx + 1, 1); else showComplete(); } }
function prevCard() { if (!isTransitioning) transitionTo(deckIdx - 1, -1); }

// ═══ MASTERY ═══
function markCard(level) {
  if (!isFlipped || !deck.length || isTransitioning) return;
  mastery[deck[deckIdx].id] = level;
  renderDots();
  setTimeout(() => { if (deckIdx < deck.length - 1) transitionTo(deckIdx + 1, 1); else showComplete(); }, 220);
}

// ═══ COMPLETE ═══
function showComplete() {
  const total  = deck.length;
  const knew   = Object.values(mastery).filter(v => v==='knew').length;
  const unsure = Object.values(mastery).filter(v => v==='unsure').length;
  const forgot = Object.values(mastery).filter(v => v==='forgot').length;
  const unk    = total - knew - unsure - forgot;
  document.getElementById('completeStats').innerHTML = `
    <div class="stat-pill sp-knew">  <span class="sp-n">${knew}</span>  <span class="sp-l">わかった</span></div>
    <div class="stat-pill sp-unsure"><span class="sp-n">${unsure}</span><span class="sp-l">あやふや</span></div>
    <div class="stat-pill sp-forgot"><span class="sp-n">${forgot}</span><span class="sp-l">わからない</span></div>
    ${unk > 0 ? `<div class="stat-pill"><span class="sp-n">${unk}</span><span class="sp-l">未確認</span></div>` : ''}`;
  document.getElementById('completeOverlay').style.display = 'flex';
}
function reviewWeak() {
  document.getElementById('completeOverlay').style.display = 'none';
  const weak = deck.filter(q => mastery[q.id] !== 'knew');
  if (!weak.length) { showToast('すべて「わかった」！'); openStart(); return; }
  deck = shuffle(weak); deckIdx = 0; renderCard();
}

// ═══ KEYBOARD ═══
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  if (e.code==='Space')      { e.preventDefault(); flipCard(); }
  if (e.code==='ArrowRight') nextCard();
  if (e.code==='ArrowLeft')  prevCard();
  if (e.code==='Digit1' && isFlipped) markCard('forgot');
  if (e.code==='Digit2' && isFlipped) markCard('unsure');
  if (e.code==='Digit3' && isFlipped) markCard('knew');
});

// ═══ EDITOR ═══
function resetForm() {
  editingId = null;
  document.getElementById('formTitle').textContent = '問題を追加';
  ['f_category','f_question','f_answer','f_explanation','f_imageUrl'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('imagePreview').innerHTML = '';
}
function previewImg() {
  const url = document.getElementById('f_imageUrl').value.trim();
  document.getElementById('imagePreview').innerHTML =
    url ? `<img src="${url}" onerror="this.parentNode.innerHTML='読込エラー'">` : '';
}

async function saveQuestion() {
  const category    = document.getElementById('f_category').value.trim();
  const question    = document.getElementById('f_question').value.trim();
  const answer      = document.getElementById('f_answer').value.trim();
  const explanation = document.getElementById('f_explanation').value.trim();
  const image_url   = document.getElementById('f_imageUrl').value.trim();
  if (!category) { showToast('カテゴリを入力してください'); return; }
  if (!question) { showToast('問題文を入力してください'); return; }
  if (!answer)   { showToast('答えを入力してください'); return; }
  const obj = { category, question, answer, explanation, image_url };
  try {
    if (editingId !== null) {
      await sbFetch('PATCH', `/rest/v1/${TABLE_NAME}?id=eq.${editingId}`, obj);
      const i = allQuestions.findIndex(q => q.id === editingId);
      allQuestions[i] = { id: editingId, ...obj };
      showToast('更新しました');
    } else {
      const [row] = await sbFetch('POST', `/rest/v1/${TABLE_NAME}`, obj);
      allQuestions.push(norm(row));
      showToast('保存しました');
    }
  } catch(e) { showToast('エラー: ' + e.message); return; }
  resetForm(); buildCatChips(); updateStartMeta(); renderQList();
}

function editQuestion(id) {
  const q = allQuestions.find(x => x.id === id);
  if (!q) return;
  editingId = id;
  document.getElementById('formTitle').textContent = '問題を編集';
  document.getElementById('f_category').value    = q.category;
  document.getElementById('f_question').value    = q.question;
  document.getElementById('f_answer').value      = q.answer;
  document.getElementById('f_explanation').value = q.explanation || '';
  document.getElementById('f_imageUrl').value    = q.image_url   || '';
  previewImg();
  document.querySelector('.q-form').scrollIntoView({ behavior: 'smooth' });
}

async function deleteQuestion(id) {
  if (!confirm('この問題を削除しますか？')) return;
  try { await sbFetch('DELETE', `/rest/v1/${TABLE_NAME}?id=eq.${id}`); }
  catch(e) { showToast('削除エラー: ' + e.message); return; }
  allQuestions = allQuestions.filter(q => q.id !== id);
  buildCatChips(); updateStartMeta(); renderQList(); showToast('削除しました');
}

function renderQList() {
  const list = document.getElementById('qList');
  document.getElementById('qListCount').textContent = allQuestions.length + '件';
  if (!allQuestions.length) {
    list.innerHTML = '<p class="empty-msg">問題がありません。Supabaseから読み込むか、問題を追加してください。</p>'; return;
  }
  list.innerHTML = allQuestions.map((q, i) => `
    <div class="q-list-item">
      <span class="qli-n">${i+1}</span>
      <span class="qli-t">${q.question.length > 52 ? q.question.slice(0,52)+'…' : q.question}</span>
      <span class="qli-badge">${q.category}</span>
      <div class="qli-actions">
        <button class="qli-edit" onclick="editQuestion(${q.id})">編集</button>
        <button class="qli-del"  onclick="deleteQuestion(${q.id})">削除</button>
      </div>
    </div>
  `).join('');
}

// ═══ CSV IMPORT / EXPORT ═══
function exportCSV() {
  const header = 'category,question,answer,explanation,image_url';
  const rows = allQuestions.map(q =>
    [csvEsc(q.category), csvEsc(q.question), csvEsc(q.answer),
     csvEsc(q.explanation||''), csvEsc(q.image_url||'')].join(',')
  );
  download('flashcards.csv', [header,...rows].join('\n'), 'text/csv;charset=utf-8');
}
function exportJSON() {
  download('flashcards.json', JSON.stringify(allQuestions, null, 2), 'application/json');
}
function csvEsc(s) { s = String(s||''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; }
function download(name, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: mime }));
  a.download = name; a.click();
}

function importCSV() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const lines = e.target.result.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(Boolean);
    if (lines.length < 2) { showToast('データが見つかりません'); return; }
    // skip header
    const rows = lines.slice(1).map(parseCsvLine);
    let ok = 0, failed = 0;
    for (const cols of rows) {
      if (cols.length < 3) continue;
      const obj = {
        category:    (cols[0]||'').trim(),
        question:    (cols[1]||'').trim(),
        answer:      (cols[2]||'').trim(),
        explanation: (cols[3]||'').trim(),
        image_url:   (cols[4]||'').trim(),
      };
      if (!obj.category || !obj.question || !obj.answer) { failed++; continue; }
      try {
        const [row] = await sbFetch('POST', `/rest/v1/${TABLE_NAME}`, obj);
        allQuestions.push(norm(row));
        ok++;
      } catch(err) { failed++; }
    }
    showToast(`${ok} 件インポート${failed > 0 ? '、' + failed + ' 件失敗' : ''}`);
    buildCatChips(); updateStartMeta(); renderQList();
    document.getElementById('csvFile').value = '';
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCsvLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

// ═══ TOAST ═══
let _toastT;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('visible');
  clearTimeout(_toastT);
  _toastT = setTimeout(() => t.classList.remove('visible'), 2500);
}

// ═══ INIT ═══
buildCatChips();
updateStartMeta();
loadFromSupabase(false);