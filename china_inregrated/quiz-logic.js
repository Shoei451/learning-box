// ===== WEAK TRACKING (localStorage) =====
const WEAK_KEY = 'cultureQuiz_weakItems_v2';

function loadWeak() {
  try { return JSON.parse(localStorage.getItem(WEAK_KEY) || '{}'); }
  catch { return {}; }
}
function saveWeak(obj) {
  try { localStorage.setItem(WEAK_KEY, JSON.stringify(obj)); } catch {}
}
function recordMiss(name) {
  const w = loadWeak(); w[name] = (w[name] || 0) + 1; saveWeak(w);
}
function recordHit(name) {
  const w = loadWeak();
  if (w[name]) { w[name] = Math.max(0, w[name] - 1); if (!w[name]) delete w[name]; saveWeak(w); }
}
function getWeakList() {
  return Object.entries(loadWeak()).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([name,count]) => ({name,count}));
}
function getWeakCount() { return Object.values(loadWeak()).filter(v => v > 0).length; }

// ===== ICONS =====
// btn-icon class controls display size; used inside flex buttons so text aligns inline
const SVG = {
  home:  `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  reset: `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
  check: `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x:     `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
};

// ===== STATE =====
let state = {
  mode: 'menu',
  prevMode: null,
  currentQ: 0,
  score: 0,
  questions: [],
  selected: null,
  answered: false,
  multiSel: new Set(),
  matching: null,
  matchSelected: null,
  grouping: null,
  groupSelected: null,
  timeline: null,
};

function getPool(weakMode) {
  if (weakMode) {
    const names = new Set(getWeakList().map(w => w.name));
    return quizData.filter(p => names.has(p.name));
  }
  return quizData;
}

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function resetQuizState() {
  Object.assign(state, {
    currentQ: 0, score: 0, questions: [],
    selected: null, answered: false, multiSel: new Set(),
    matching: null, matchSelected: null,
    grouping: null, groupSelected: null,
    timeline: null,
  });
}

// ===== QUIZ GENERATORS =====
function genPersonToDynasty(pool) {
  const sample = shuffle(pool).slice(0, Math.min(10, pool.length));
  state.questions = sample.map(p => {
    const wrongs = shuffle(dynasties.filter(d => d !== p.dynasty)).slice(0, 3);
    return { q: p.name, options: shuffle([p.dynasty, ...wrongs]), correct: p.dynasty, person: p.name, type: 'single' };
  });
}

function genPersonToWork(pool) {
  const eligible = pool.filter(p => p.works.length > 0);
  const sample = shuffle(eligible).slice(0, Math.min(10, eligible.length));
  state.questions = sample.map(p => {
    const wrongs = shuffle(quizData.filter(x => x.name !== p.name && x.works.length > 0).map(x => x.works[0])).slice(0, 3);
    return { q: p.name, options: shuffle([p.works[0], ...wrongs]), correct: p.works[0], person: p.name, type: 'single', isWork: true };
  });
}

function genDynastyToPeople(pool) {
  // FIX: correct is derived from options actually shown, not from full pool
  const avail = dynasties.filter(d => pool.some(p => p.dynasty === d));
  const sample = shuffle(avail).slice(0, Math.min(5, avail.length));
  state.questions = sample.map(dynasty => {
    const correctPeople = pool.filter(p => p.dynasty === dynasty);
    const maxWrong = Math.min(4, 8 - correctPeople.length);
    const wrongPeople = shuffle(quizData.filter(p => p.dynasty !== dynasty)).slice(0, maxWrong);
    const opts = shuffle([...correctPeople, ...wrongPeople]).map(p => p.name);
    // derive correct from opts so users can actually select all correct answers
    const correctInOpts = opts.filter(name => correctPeople.some(c => c.name === name));
    return { q: dynasty, options: opts, correct: correctInOpts, type: 'multiple' };
  });
}

function genMatching(pool) {
  const eligible = pool.filter(p => p.works.length > 0);
  const sample = shuffle(eligible).slice(0, Math.min(6, eligible.length));
  state.matching = {
    people: sample.map((p, i) => ({ id: `p${i}`, text: p.name, pairIdx: i })),
    works: shuffle(sample.map((p, i) => ({ id: `w${i}`, text: p.works[0], pairIdx: i }))),
    matched: [], wrong: [],
    total: sample.length,
    personNames: sample.map(p => p.name),
  };
}

function genGrouping(pool) {
  const sample = shuffle(pool).slice(0, Math.min(12, pool.length));
  state.grouping = {
    ungrouped: sample.map(p => ({ name: p.name, category: p.category })),
    placed: {},
    categories: [...new Set(sample.map(p => p.category))],
  };
}

function genTimeline(pool) {
  const withEra = pool.filter(p => p.era != null);
  const sample = shuffle(withEra).slice(0, Math.min(6, withEra.length));
  state.timeline = {
    items: shuffle(sample.map(p => ({ name: p.name, era: p.era }))),
    correct: [...sample].sort((a, b) => a.era - b.era).map(p => p.name),
  };
}

function genTrueFalse(pool) {
  const qs = [];
  pool.forEach(p => {
    qs.push({ q: `${p.name}は「${p.dynasty}」の人物である`, correct: true, person: p.name });
    const wd = shuffle(dynasties.filter(d => d !== p.dynasty))[0];
    qs.push({ q: `${p.name}は「${wd}」の人物である`, correct: false, person: p.name });
  });
  pool.filter(p => p.works.length > 0).forEach(p => {
    qs.push({ q: `${p.name}の主な功績に「${p.works[0]}」がある`, correct: true, person: p.name });
    const o = shuffle(quizData.filter(x => x.name !== p.name && x.works.length > 0))[0];
    if (o) qs.push({ q: `${p.name}の主な功績に「${o.works[0]}」がある`, correct: false, person: p.name });
  });
  state.questions = shuffle(qs).slice(0, 10).map(q => ({ ...q, type: 'truefalse' }));
}

// ===== START / NAVIGATION =====
function startQuiz(mode, weakMode) {
  resetQuizState();
  state.mode = mode;
  state.prevMode = mode;
  const pool = getPool(!!weakMode);
  if (mode === 'person-to-dynasty') genPersonToDynasty(pool);
  else if (mode === 'person-to-work') genPersonToWork(pool);
  else if (mode === 'dynasty-to-people') genDynastyToPeople(pool);
  else if (mode === 'truefalse') genTrueFalse(pool);
  else if (mode === 'matching') genMatching(pool);
  else if (mode === 'grouping') genGrouping(pool);
  else if (mode === 'timeline') genTimeline(pool);
  render();
}

function backToMenu() { state.mode = 'menu'; render(); }
function retryQuiz() { startQuiz(state.prevMode); }

// ===== TOPBAR =====
function renderTopbar(opts = {}) {
  const { title = '文化史クイズ', showProgress = false, total = 0, current = 0,
          score = null, showHome = true, showReset = false } = opts;
  const progress = showProgress ? `
    <div class="topbar__progress">
      <div class="topbar__progress-track">
        <div class="topbar__progress-fill" style="width:${total ? Math.round((current/total)*100) : 0}%"></div>
      </div>
      <div class="topbar__progress-label">${current} / ${total}</div>
    </div>` : '';
  const scoreBadge = score !== null ? `<div class="score-badge">正解 ${score}</div>` : '';
  const homeBtn  = showHome  ? `<button class="icon-btn" onclick="backToMenu()" title="メニュー">${SVG.home}</button>` : '';
  const resetBtn = showReset ? `<button class="icon-btn" onclick="retryQuiz()"  title="リセット">${SVG.reset}</button>` : '';
  return `<div class="topbar">
    <div class="topbar__left">${homeBtn}<div class="topbar__title">${title}</div></div>
    ${progress}
    <div class="topbar__right">${scoreBadge}${resetBtn}</div>
  </div>`;
}

// ===== MENU =====
function renderMenu() {
  const weakCount = getWeakCount();
  const weakSection = weakCount > 0 ? `
    <div class="menu-section-label">苦手問題</div>
    <div class="menu-grid">
      <div class="menu-card" onclick="startQuiz('person-to-dynasty',true)" style="grid-column:1/-1;position:relative">
        <div class="menu-card__weak-badge">${weakCount}</div>
        <div class="menu-card__icon">🔥</div>
        <div class="menu-card__title">苦手問題を復習</div>
        <div class="menu-card__desc">間違えた問題を中心に出題</div>
        <div class="menu-card__meta">${weakCount} 問 蓄積中</div>
      </div>
    </div>` : '';

  return `${renderTopbar({ showHome: false })}
    <div class="page-body"><div class="container">
      <div class="menu-header">
        <div class="menu-header__eyebrow">中国王朝</div>
        <div class="menu-header__title">文化史クイズ</div>
        <div class="menu-header__sub">人物 · 作品 · 王朝を覚える</div>
      </div>
      ${weakSection}
      <div class="menu-section-label">クイズ形式</div>
      <div class="menu-grid">
        <div class="menu-card" onclick="startQuiz('person-to-dynasty')">
          <div class="menu-card__icon">👤</div>
          <div class="menu-card__title">人物 → 王朝</div>
          <div class="menu-card__desc">人物名から活躍した王朝を選ぶ</div>
          <div class="menu-card__meta">4択 · 10問</div>
        </div>
        <div class="menu-card" onclick="startQuiz('person-to-work')">
          <div class="menu-card__icon">📖</div>
          <div class="menu-card__title">人物 → 作品</div>
          <div class="menu-card__desc">人物名から代表作を選ぶ</div>
          <div class="menu-card__meta">4択 · 10問</div>
        </div>
        <div class="menu-card" onclick="startQuiz('dynasty-to-people')">
          <div class="menu-card__icon">🏯</div>
          <div class="menu-card__title">王朝 → 人物</div>
          <div class="menu-card__desc">王朝に該当する人物を全て選ぶ</div>
          <div class="menu-card__meta">複数選択 · 5問</div>
        </div>
        <div class="menu-card" onclick="startQuiz('matching')">
          <div class="menu-card__icon">🔗</div>
          <div class="menu-card__title">人物 ↔ 作品</div>
          <div class="menu-card__desc">人物と作品をクリックで組み合わせる</div>
          <div class="menu-card__meta">マッチング · 6組</div>
        </div>
        <div class="menu-card" onclick="startQuiz('truefalse')">
          <div class="menu-card__icon">◯✗</div>
          <div class="menu-card__title">正誤問題</div>
          <div class="menu-card__desc">記述の正誤を判定する</div>
          <div class="menu-card__meta">◯✗ · 10問</div>
        </div>
        <div class="menu-card" onclick="startQuiz('timeline')">
          <div class="menu-card__icon">⏱</div>
          <div class="menu-card__title">時代順整序</div>
          <div class="menu-card__desc">↑↓ボタンで人物を並べ替える</div>
          <div class="menu-card__meta">並べ替え · 6人</div>
        </div>
      </div>
      <div class="menu-section-label mt-3">
        <a href="persons.html" style="color:inherit;text-decoration:none">人物一覧 →</a>
      </div>
      ${weakCount > 0 ? renderWeakSection() : ''}
    </div></div>`;
}

function renderWeakSection() {
  const list = getWeakList().slice(0, 5);
  if (!list.length) return '';
  return `<div class="mt-3">
    <div class="weak-section__title">苦手ランキング（上位5）</div>
    <div class="weak-list">${list.map(w => {
      const p = quizData.find(x => x.name === w.name);
      return `<div class="weak-item">
        <div class="weak-item__left">
          <div class="weak-item__name">${w.name}</div>
          <div class="weak-item__detail">${p ? `${p.dynasty} · ${p.category}` : ''}</div>
        </div>
        <div class="weak-item__count">ミス ${w.count}回</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

// ===== ANSWER HANDLERS =====
function handleAnswer(answer) {
  if (state.answered) return;
  state.selected = answer;
  state.answered = true;
  const q = state.questions[state.currentQ];
  if (answer === q.correct) { state.score++; if (q.person) recordHit(q.person); }
  else { if (q.person) recordMiss(q.person); }
  render();
}

function handleMultiSel(opt) {
  if (state.answered) return;
  state.multiSel.has(opt) ? state.multiSel.delete(opt) : state.multiSel.add(opt);
  render();
}

function submitMulti() {
  if (state.answered) return;
  state.answered = true;
  const q = state.questions[state.currentQ];
  const correctSet = new Set(q.correct);
  const ok = state.multiSel.size === correctSet.size && [...state.multiSel].every(a => correctSet.has(a));
  if (ok) state.score++;
  q.correct.forEach(name => state.multiSel.has(name) ? recordHit(name) : recordMiss(name));
  render();
}

function nextQuestion() {
  if (state.currentQ < state.questions.length - 1) {
    state.currentQ++;
    state.selected = null;
    state.answered = false;
    state.multiSel = new Set();
  } else {
    state.mode = 'results';
  }
  render();
}

// ===== MATCHING =====
function handleMatchClick(id, type) {
  const m = state.matching;
  const item = type === 'person' ? m.people.find(p => p.id === id) : m.works.find(w => w.id === id);
  if (!item || m.matched.includes(id) || m.wrong.includes(id)) return;

  if (!state.matchSelected) { state.matchSelected = item; render(); return; }
  if (state.matchSelected.id[0] === id[0]) { state.matchSelected = item; render(); return; }

  const person = type === 'person' ? item : state.matchSelected;
  const work   = type === 'work'   ? item : state.matchSelected;
  const ok = person.pairIdx === work.pairIdx;

  if (ok) {
    m.matched.push(person.id, work.id);
    state.score++;
    recordHit(m.personNames[person.pairIdx]);
  } else {
    m.wrong.push(person.id, work.id);
    recordMiss(m.personNames[person.pairIdx]);
    setTimeout(() => { m.wrong = m.wrong.filter(x => x !== person.id && x !== work.id); render(); }, 900);
  }
  state.matchSelected = null;
  render();
  if (m.matched.length === m.total * 2) setTimeout(() => { state.mode = 'results'; render(); }, 600);
}

// ===== GROUPING =====
function handleGroupChipClick(name) {
  state.groupSelected = state.groupSelected === name ? null : name;
  render();
}
function handleGroupCategoryClick(cat) {
  if (!state.groupSelected) return;
  const g = state.grouping;
  const item = g.ungrouped.find(i => i.name === state.groupSelected);
  if (!item) return;
  g.ungrouped = g.ungrouped.filter(i => i.name !== state.groupSelected);
  if (!g.placed[cat]) g.placed[cat] = [];
  g.placed[cat].push(item);
  item.category === cat ? (state.score++, recordHit(item.name)) : recordMiss(item.name);
  state.groupSelected = null;
  render();
  if (g.ungrouped.length === 0) setTimeout(() => { state.mode = 'results'; render(); }, 600);
}

// ===== TIMELINE — button-based, no drag =====
function moveTimelineItem(idx, dir) {
  const items = state.timeline.items;
  const target = idx + dir;
  if (target < 0 || target >= items.length) return;
  [items[idx], items[target]] = [items[target], items[idx]];
  render();
}
function submitTimeline() {
  const user = state.timeline.items.map(i => i.name);
  state.score = user.reduce((acc, name, i) => acc + (name === state.timeline.correct[i] ? 1 : 0), 0);
  state.mode = 'results';
  render();
}

// ===== RENDER FUNCTIONS =====
function modeLabel(m) {
  return {
    'person-to-dynasty':'人物→王朝','person-to-work':'人物→作品',
    'dynasty-to-people':'王朝→人物','matching':'マッチング',
    'grouping':'カテゴリ分類','timeline':'時代順整序','truefalse':'正誤問題',
  }[m] || 'クイズ';
}

function renderSingleQuiz() {
  const q = state.questions[state.currentQ];
  const total = state.questions.length;
  const isMulti = q.type === 'multiple';

  const optsHtml = q.options.map(opt => {
    const isSel = isMulti ? state.multiSel.has(opt) : state.selected === opt;
    const isCorrect = isMulti ? q.correct.includes(opt) : opt === q.correct;
    let cls = 'option-btn';
    let icon = '';
    if (state.answered) {
      if (isCorrect) { cls += ' correct'; icon = `<span class="option-btn__icon">${SVG.check}</span>`; }
      else if (isSel) { cls += ' incorrect'; icon = `<span class="option-btn__icon">${SVG.x}</span>`; }
    } else if (isSel) cls += ' selected';
    const onclick = isMulti
      ? `handleMultiSel('${opt.replace(/'/g,"\\'")}')`
      : `handleAnswer('${opt.replace(/'/g,"\\'")}')`;
    return `<button class="${cls}" onclick="${onclick}" ${state.answered && !isMulti ? 'disabled' : ''}>${icon}${opt}</button>`;
  }).join('');

  const feedback = state.answered
    ? (() => {
        const ok = isMulti
          ? (state.multiSel.size === q.correct.length && [...state.multiSel].every(a => q.correct.includes(a)))
          : state.selected === q.correct;
        return ok
          ? `<div class="feedback-bar correct">✓ 正解</div>`
          : `<div class="feedback-bar incorrect">× 不正解 — 正解: ${Array.isArray(q.correct) ? q.correct.join('・') : q.correct}</div>`;
      })()
    : '';

  const action = isMulti && !state.answered
    ? `<button class="action-btn action-btn--primary" onclick="submitMulti()" ${state.multiSel.size === 0 ? 'disabled' : ''}>確定</button>`
    : state.answered
      ? `<button class="action-btn action-btn--primary" onclick="nextQuestion()">${state.currentQ < total-1 ? '次の問題 →' : '結果を見る →'}</button>`
      : '';

  const hint = q.type === 'multiple' ? '該当する人物を全て選んでください' : q.isWork ? 'この人物の代表作は？' : 'この人物が活躍した王朝は？';

  return `${renderTopbar({ title: modeLabel(state.mode), showProgress: true, total, current: state.currentQ+1, score: state.score, showReset: true })}
    <div class="page-body"><div class="container">
      <div class="quiz-box">
        <div class="quiz-box__question-label">問 ${state.currentQ+1} / ${total}</div>
        <div class="quiz-box__question">${q.q}</div>
        <div class="quiz-box__hint">${hint}</div>
        <div class="options-grid">${optsHtml}</div>
        ${feedback}${action}
      </div>
    </div></div>`;
}

function renderTrueFalse() {
  const q = state.questions[state.currentQ];
  const total = state.questions.length;
  const tfCls = (val) => {
    if (!state.answered) return 'tf-btn' + (state.selected === val ? ' selected' : '');
    if (q.correct === val) return 'tf-btn correct';
    if (state.selected === val) return 'tf-btn incorrect';
    return 'tf-btn';
  };
  const feedback = state.answered
    ? (state.selected === q.correct
        ? `<div class="feedback-bar correct">✓ 正解</div>`
        : `<div class="feedback-bar incorrect">× 不正解</div>`)
    : '';
  const action = state.answered
    ? `<button class="action-btn action-btn--primary" onclick="nextQuestion()">${state.currentQ < total-1 ? '次の問題 →' : '結果を見る →'}</button>` : '';

  return `${renderTopbar({ title:'正誤問題', showProgress:true, total, current:state.currentQ+1, score:state.score, showReset:true })}
    <div class="page-body"><div class="container">
      <div class="quiz-box">
        <div class="quiz-box__question-label">問 ${state.currentQ+1} / ${total}</div>
        <div class="quiz-box__question" style="font-size:1.05rem;line-height:1.55">${q.q}</div>
        <div class="quiz-box__hint mt-2">この記述は正しい？</div>
        <div class="tf-grid">
          <button class="${tfCls(true)}"  onclick="handleAnswer(true)"  ${state.answered?'disabled':''}><span>◯</span><span class="tf-label">正しい</span></button>
          <button class="${tfCls(false)}" onclick="handleAnswer(false)" ${state.answered?'disabled':''}><span>✗</span><span class="tf-label">間違い</span></button>
        </div>
        ${feedback}${action}
      </div>
    </div></div>`;
}

function renderMatching() {
  const m = state.matching;
  const done = m.matched.length / 2;
  const itemHtml = (arr, type) => arr.map(item => {
    const isMatched = m.matched.includes(item.id);
    const isWrong   = m.wrong.includes(item.id);
    const isSel     = state.matchSelected?.id === item.id;
    let cls = 'matching-item';
    if (isMatched)    cls += ' matched-correct';
    else if (isWrong) cls += ' matched-incorrect';
    else if (isSel)   cls += ' selected';
    const dis = isMatched || isWrong ? 'style="pointer-events:none"' : '';
    return `<div class="${cls}" ${dis} onclick="handleMatchClick('${item.id}','${type}')">${item.text}</div>`;
  }).join('');

  return `${renderTopbar({ title:'人物 ↔ 作品', score:`${done}/${m.total}`, showReset:true })}
    <div class="page-body"><div class="container--wide">
      <div class="matching-progress">${state.matchSelected ? `「${state.matchSelected.text}」選択中` : '人物をクリック → 作品をクリック'} &nbsp; ${done} / ${m.total}</div>
      <div class="matching-layout">
        <div><div class="matching-col__header">人物</div><div class="matching-items">${itemHtml(m.people,'person')}</div></div>
        <div><div class="matching-col__header">作品・功績</div><div class="matching-items">${itemHtml(m.works,'work')}</div></div>
      </div>
    </div></div>`;
}

function renderGrouping() {
  const g = state.grouping;
  const ungrouped = g.ungrouped.map(item => {
    const sel = state.groupSelected === item.name;
    return `<span class="group-chip ${sel?'chip-selected':''}" onclick="handleGroupChipClick('${item.name.replace(/'/g,"\\'")}')">${item.name}</span>`;
  }).join('');
  const cats = g.categories.map(cat => {
    const items = (g.placed[cat]||[]).map(i => `<span class="group-chip ${i.category===cat?'chip-correct':'chip-wrong'}">${i.name}</span>`).join('');
    return `<div class="grouping-category ${state.groupSelected?'cat-active':''}" onclick="handleGroupCategoryClick('${cat}')">
      <div class="grouping-category__name">${cat}</div>
      <div class="grouping-category__items">${items||'<span style="font-size:.75rem;color:var(--text-faint)">ここに配置</span>'}</div>
    </div>`;
  }).join('');
  const inst = state.groupSelected ? `「${state.groupSelected}」を選択中 — カテゴリをクリック` : '人物をクリックして選択 → カテゴリをクリックして配置';
  return `${renderTopbar({ title:'カテゴリ分類', score:state.score, showReset:true })}
    <div class="page-body"><div class="container--wide">
      <div class="quiz-box">
        <div class="quiz-box__hint">${inst}</div>
        <div class="mt-2"><div class="matching-col__header">未分類</div>
          <div class="grouping-ungrouped mt-1">${ungrouped||'<span style="font-size:.8rem;color:var(--text-faint)">全員配置済み</span>'}</div>
        </div>
        <div class="grouping-categories mt-2">${cats}</div>
      </div>
    </div></div>`;
}

function renderTimeline() {
  const items = state.timeline.items;
  const listHtml = items.map((item, idx) => `
    <div class="timeline-item">
      <div class="timeline-item__move">
        <button class="tl-btn" onclick="moveTimelineItem(${idx},-1)" ${idx===0?'disabled':''}>↑</button>
        <button class="tl-btn" onclick="moveTimelineItem(${idx}, 1)" ${idx===items.length-1?'disabled':''}>↓</button>
      </div>
      <div class="timeline-item__name">${item.name}</div>
      <div class="timeline-item__rank">${idx+1}</div>
    </div>`).join('');

  return `${renderTopbar({ title:'時代順整序', showReset:true })}
    <div class="page-body"><div class="container">
      <div class="quiz-box">
        <div class="quiz-box__question-label">↑↓ で並べ替え — 古い順（上）→ 新しい順（下）</div>
        <div class="timeline-list">${listHtml}</div>
        <button class="action-btn action-btn--primary mt-2" onclick="submitTimeline()">解答を確定</button>
      </div>
    </div></div>`;
}

function renderResults() {
  const m = state.prevMode;
  let total = state.questions.length;
  if (m === 'matching') total = state.matching.total;
  if (m === 'grouping') total = Object.values(state.grouping.placed).flat().length + state.grouping.ungrouped.length;
  if (m === 'timeline') total = state.timeline.items.length;
  const pct = Math.round((state.score / (total||1)) * 100);

  return `${renderTopbar({ title:'結果', showHome:true })}
    <div class="page-body"><div class="container">
      <div class="results-card">
        <div class="results-card__eyebrow">${modeLabel(m)}</div>
        <div class="results-card__score">${state.score}</div>
        <div class="results-card__fraction">/ ${total} 問</div>
        <div class="results-card__percentage">${pct}%</div>
      </div>
      <div class="results-actions">
        <button class="action-btn action-btn--secondary" onclick="backToMenu()">${SVG.home}<span>メニュー</span></button>
        <button class="action-btn action-btn--primary"   onclick="retryQuiz()">${SVG.reset}<span>もう一度</span></button>
      </div>
      ${renderWeakSection()}
    </div></div>`;
}

// ===== MAIN RENDER =====
function render() {
  const m = state.mode;
  document.getElementById('app').innerHTML =
    m === 'menu'             ? renderMenu() :
    m === 'truefalse'        ? renderTrueFalse() :
    m === 'matching'         ? renderMatching() :
    m === 'grouping'         ? renderGrouping() :
    m === 'timeline'         ? renderTimeline() :
    m === 'results'          ? renderResults() :
    renderSingleQuiz();
}

render();
