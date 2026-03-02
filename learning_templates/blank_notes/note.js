// ── ブランクの幅を内容に合わせて自動調整 ──
function fitBlank(el) {
  const tmp = document.createElement('span');
  tmp.style.cssText =
    'visibility:hidden;position:absolute;font-family:Noto Serif JP,serif;font-size:1rem;padding:0 0.3em';
  tmp.textContent = el.value || el.placeholder || '　　　';
  document.body.appendChild(tmp);
  el.style.width = Math.max(tmp.offsetWidth, 60) + 'px';
  document.body.removeChild(tmp);
}

// ── 正規化（空白・大小文字を無視して比較） ──
function normalize(s) {
  return s.trim().replace(/\s/g, '').toLowerCase();
}

// ── 採点 ──
function checkAll() {
  const blanks = document.querySelectorAll('.blank');
  let correct = 0;
  blanks.forEach(b => {
    if (!b.value.trim()) return;
    b.classList.remove('correct', 'incorrect');
    if (normalize(b.value) === normalize(b.dataset.answer)) {
      b.classList.add('correct');
      correct++;
    } else {
      b.classList.add('incorrect');
    }
  });
  const total = blanks.length;
  const pct = total ? Math.round(correct / total * 100) : 0;
  const scoreEl = document.getElementById('score-val');
  if (scoreEl) scoreEl.textContent = pct + '%';
  const progressEl = document.getElementById('progress');
  if (progressEl) progressEl.style.width = pct + '%';
}

// ── 答えを全表示 ──
function revealAll() {
  document.querySelectorAll('.blank').forEach(b => {
    b.value = b.dataset.answer;
    b.classList.remove('incorrect');
    b.classList.add('correct');
    fitBlank(b);
  });
  document.querySelectorAll('.answer-key').forEach(k => k.classList.add('visible'));
  checkAll();
}

// ── リセット ──
function resetAll() {
  document.querySelectorAll('.blank').forEach(b => {
    b.value = '';
    b.classList.remove('correct', 'incorrect');
    fitBlank(b);
  });
  document.querySelectorAll('.answer-key').forEach(k => k.classList.remove('visible'));
  document.querySelectorAll('.flashcard').forEach(c => c.classList.remove('flipped'));
  const scoreEl = document.getElementById('score-val');
  if (scoreEl) scoreEl.textContent = '—';
  const progressEl = document.getElementById('progress');
  if (progressEl) progressEl.style.width = '0%';
}

// ── 初期化 ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.blank').forEach(b => {
    fitBlank(b);
    b.addEventListener('input', () => fitBlank(b));
    b.addEventListener('keydown', e => { if (e.key === 'Enter') checkAll(); });
  });
});
