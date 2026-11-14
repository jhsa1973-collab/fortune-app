// 열두띠 오늘운세 - [오늘의 운세] / [신년운세] 두 메뉴
// 데이터: fortunes/YYYY-MM-DD.json (오늘), fortunes/year-YYYY.json (신년)
(function () {
  'use strict';

  var SIGNS = [
    { id: 'rat', ko: '쥐', hanja: '子' }, { id: 'ox', ko: '소', hanja: '丑' },
    { id: 'tiger', ko: '호랑이', hanja: '寅' }, { id: 'rabbit', ko: '토끼', hanja: '卯' },
    { id: 'dragon', ko: '용', hanja: '辰' }, { id: 'snake', ko: '뱀', hanja: '巳' },
    { id: 'horse', ko: '말', hanja: '午' }, { id: 'goat', ko: '양', hanja: '未' },
    { id: 'monkey', ko: '원숭이', hanja: '申' }, { id: 'rooster', ko: '닭', hanja: '酉' },
    { id: 'dog', ko: '개', hanja: '戌' }, { id: 'pig', ko: '돼지', hanja: '亥' }
  ];
  var STEMS = '갑을병정무기경신임계', STEMS_H = '甲乙丙丁戊己庚辛壬癸';
  var BRANCHES = '자축인묘진사오미신유술해', BRANCHES_H = '子丑寅卯辰巳午未申酉戌亥';
  // 천간 오행 색 (갑을 푸른, 병정 붉은, 무기 황금, 경신 흰, 임계 검은)
  var STEM_COLOR = ['푸른', '푸른', '붉은', '붉은', '황금', '황금', '흰', '흰', '검은', '검은'];
  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var AREAS = [['money', '금전운'], ['love', '애정운'], ['health', '건강운'], ['work', '일·학업']];
  var SEASONS = [['spring', '봄'], ['summer', '여름'], ['autumn', '가을'], ['winter', '겨울']];
  var TAG_INFO = {
    '삼합': '좋은 궁합', '육합': '가장 좋은 궁합', '충': '변화가 많음', '형': '다툼 주의',
    '원진': '오해 주의', '날삼재': '나가는 삼재', '본명년': '내 띠의 해'
  };
  var GOOD_TAGS = ['삼합', '육합'];
  var STORE_KEY = 'fortune.sign';
  var MODES = ['today', 'newyear'];

  var $ = function (id) { return document.getElementById(id); };
  var state = { mode: 'today', sign: null, today: null, day: null, year: null };

  // ---- 날짜 계산 (한국 시간 기준) ----
  function todayKST() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function splitDate(s) { var p = s.split('-').map(Number); return { y: p[0], m: p[1], d: p[2] }; }
  function cycle(i) { i = ((i % 60) + 60) % 60; return { ko: STEMS[i % 10] + BRANCHES[i % 12], hanja: STEMS_H[i % 10] + BRANCHES_H[i % 12], stem: i % 10, branch: i % 12 }; }
  function yearGanzhi(y) { return cycle(y - 4); }
  function dayGanzhi(s) {
    // 기준: 2000-01-01 = 戊午日 (60갑자 54번째)
    var t = splitDate(s);
    var days = Math.round((Date.UTC(t.y, t.m - 1, t.d) - Date.UTC(2000, 0, 1)) / 864e5);
    return cycle(54 + days);
  }
  function signIndexFromYear(y) { return (((y - 4) % 12) + 12) % 12; }
  function birthYears(idx, thisYear) {
    var out = [];
    for (var y = thisYear - 1; y >= 1930 && out.length < 6; y--) if (signIndexFromYear(y) === idx) out.push(String(y).slice(2) + '년생');
    return out.join(' · ');
  }
  function formatDate(s) {
    var t = splitDate(s);
    var w = WEEKDAYS[new Date(Date.UTC(t.y, t.m - 1, t.d)).getUTCDay()];
    return t.y + '년 ' + t.m + '월 ' + t.d + '일 ' + w + '요일';
  }
  function yearTitle(y) {
    var g = yearGanzhi(y);
    return { name: y + '년 ' + g.ko + '년', hanja: g.hanja + '年', animal: STEM_COLOR[g.stem] + ' ' + SIGNS[g.branch].ko + '의 해' };
  }

  // ---- 저장 (없어도 동작) ----
  function loadSign() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function saveSign(id) { try { localStorage.setItem(STORE_KEY, id); } catch (e) { /* 저장 불가 환경 */ } }

  // ---- 파일 불러오기 ----
  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return r.json();
    });
  }
  function loadDay(date) {
    return getJSON('fortunes/' + date + '.json').catch(function () {
      return getJSON('fortunes/index.json').then(function (idx) { return getJSON('fortunes/' + idx.latest + '.json'); });
    });
  }
  function loadYear() {
    return getJSON('fortunes/year-index.json').then(function (idx) { return getJSON('fortunes/year-' + idx.latest + '.json'); });
  }

  // ---- 공통 그리기 도구 ----
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function currentSign() { var i = SIGNS.findIndex(function (s) { return s.id === state.sign; }); return { idx: i, sign: SIGNS[i] }; }

  function cardTop(sign, idx, score, scoreLabel) {
    var top = el('div', 'card-top');
    var left = el('div');
    left.appendChild(el('h2', null, sign.ko + '띠 (' + sign.hanja + ')'));
    left.appendChild(el('p', 'years', birthYears(idx, splitDate(state.today).y)));
    var seal = el('div', 'seal');
    seal.setAttribute('aria-label', scoreLabel + ' ' + score + '점');
    seal.appendChild(el('b', null, String(score)));
    seal.appendChild(el('small', null, scoreLabel));
    top.appendChild(left); top.appendChild(seal);
    return top;
  }
  function areaList(f) {
    var ul = el('ul', 'areas');
    AREAS.forEach(function (a) {
      var v = f[a[0]];
      var li = el('li', 'area');
      li.appendChild(el('span', 'label', a[1]));
      var bar = el('span', 'bar'); var fill = el('i'); fill.style.width = Math.max(0, Math.min(100, v.score)) + '%'; bar.appendChild(fill);
      li.appendChild(bar);
      li.appendChild(el('span', 'num', String(v.score)));
      li.appendChild(el('p', null, v.text));
      ul.appendChild(li);
    });
    return ul;
  }
  function luckyGrid(pairs) {
    var dl = el('dl', 'lucky');
    pairs.forEach(function (p) { var d = el('div'); d.appendChild(el('dt', null, p[0])); d.appendChild(el('dd', null, p[1])); dl.appendChild(d); });
    return dl;
  }
  function shareRow(card, title, text) {
    var actions = el('div', 'actions');
    var share = el('button', 'btn', '운세 공유하기');
    share.type = 'button'; share.id = 'share';
    var status = el('span', 'status'); status.id = 'share-status'; status.setAttribute('role', 'status');
    share.addEventListener('click', function () { shareText(title, text, status, card); });
    actions.appendChild(share); actions.appendChild(status);
    return actions;
  }
  function shareText(title, text, status, card) {
    function fallback() {
      var box = $('copybox');
      if (!box) { box = el('textarea', 'copybox'); box.id = 'copybox'; box.readOnly = true; card.appendChild(box); }
      box.value = text; box.focus(); box.select();
      status.textContent = '복사가 막혀 있어요. 선택된 글을 길게 눌러 복사해 주세요.';
    }
    function copy() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { status.textContent = '운세를 복사했어요.'; }, fallback);
      } else { fallback(); }
    }
    if (navigator.share) {
      navigator.share({ title: title, text: text }).then(function () { status.textContent = '공유했어요.'; }, function (e) {
        if (e && e.name === 'AbortError') return;
        copy();
      });
    } else { copy(); }
  }
  function showError(msg) { var card = $('card'); card.textContent = ''; card.appendChild(el('p', 'error', msg)); }

  // ---- 머리 ----
  function renderHeader() {
    if (state.mode === 'today') {
      var y = splitDate(state.today).y, yg = yearGanzhi(y), dg = dayGanzhi(state.today);
      $('date').textContent = formatDate(state.today);
      $('ganzhi').textContent = yg.ko + '년 ' + dg.ko + '일 (' + dg.hanja + '日)';
    } else {
      var yr = state.year ? state.year.year : splitDate(state.today).y + 1;
      var t = yearTitle(yr);
      $('date').textContent = t.name + ' 신년운세';
      $('ganzhi').textContent = t.hanja + ' · ' + t.animal;
    }
  }

  // ---- 오늘의 운세 카드 ----
  function renderToday(card) {
    var d = state.day;
    if (!d) return;
    var cs = currentSign(), f = d.signs[cs.sign.id];
    if (d.date !== state.today) card.appendChild(el('p', 'notice', '오늘 운세가 아직 준비되지 않아 ' + formatDate(d.date) + ' 운세를 보여 드려요.'));
    card.appendChild(cardTop(cs.sign, cs.idx, f.score, '오늘 운세'));
    card.appendChild(el('p', 'summary', f.summary));
    card.appendChild(areaList(f));
    card.appendChild(luckyGrid([['행운의 색', f.lucky.color], ['행운의 숫자', String(f.lucky.number)], ['좋은 방향', f.lucky.direction]]));
    card.appendChild(el('p', 'advice', f.advice));
    var text = '[' + formatDate(d.date) + ' ' + cs.sign.ko + '띠 운세] 운세 지수 ' + f.score + '점\n' + f.summary +
      '\n행운의 색 ' + f.lucky.color + ' · 숫자 ' + f.lucky.number + ' · 방향 ' + f.lucky.direction + '\n“' + f.advice + '”';
    card.appendChild(shareRow(card, cs.sign.ko + '띠 오늘운세', text));
    $('generated').textContent = formatDate(d.date) + '분 · ' + (d.generatedBy || 'AI') + ' 작성';
  }

  // ---- 신년운세 카드 ----
  function renderYear(card) {
    var Y = state.year;
    if (!Y) return;
    var cs = currentSign(), f = Y.signs[cs.sign.id], t = yearTitle(Y.year);
    card.appendChild(cardTop(cs.sign, cs.idx, f.score, Y.year + ' 운세'));

    if (f.tags && f.tags.length) {
      var tags = el('ul', 'tags');
      tags.setAttribute('aria-label', '올해와의 관계');
      f.tags.forEach(function (tg) {
        var li = el('li', 'tag' + (GOOD_TAGS.indexOf(tg) >= 0 ? ' good' : ''));
        li.appendChild(el('b', null, tg));
        if (TAG_INFO[tg]) li.appendChild(el('span', null, TAG_INFO[tg]));
        tags.appendChild(li);
      });
      card.appendChild(tags);
    }

    card.appendChild(el('p', 'summary', f.summary));
    card.appendChild(areaList(f));

    var sec = el('section', 'seasons');
    sec.appendChild(el('h3', null, '계절별 흐름'));
    var dl = el('dl');
    SEASONS.forEach(function (s) { var d = el('div'); d.appendChild(el('dt', null, s[1])); d.appendChild(el('dd', null, f.seasons[s[0]])); dl.appendChild(d); });
    sec.appendChild(dl);
    card.appendChild(sec);

    var months = el('dl', 'months');
    [['좋은 달', f.goodMonths, 'good'], ['조심할 달', f.cautionMonths, 'caution']].forEach(function (m) {
      var d = el('div', m[2]); d.appendChild(el('dt', null, m[0])); d.appendChild(el('dd', null, m[1])); months.appendChild(d);
    });
    card.appendChild(months);

    card.appendChild(luckyGrid([['행운의 색', f.lucky.color], ['행운의 숫자', String(f.lucky.number)], ['행운의 물건', f.lucky.item]]));
    card.appendChild(el('p', 'advice', f.advice));
    if (Y.note) card.appendChild(el('p', 'note', Y.note));

    var text = '[' + t.name + ' ' + cs.sign.ko + '띠 신년운세] 운세 지수 ' + f.score + '점' +
      (f.tags && f.tags.length ? ' (' + f.tags.join(' · ') + ')' : '') + '\n' + f.summary +
      '\n좋은 달 ' + f.goodMonths + ' · 조심할 달 ' + f.cautionMonths + '\n행운의 색 ' + f.lucky.color + ' · 숫자 ' + f.lucky.number + ' · 물건 ' + f.lucky.item + '\n“' + f.advice + '”';
    card.appendChild(shareRow(card, cs.sign.ko + '띠 ' + Y.year + ' 신년운세', text));
    $('generated').textContent = t.name + ' 신년운세 · ' + (Y.generatedBy || 'AI') + ' 작성';
  }

  function renderCard() {
    var card = $('card');
    card.textContent = '';
    if (state.mode === 'today') renderToday(card); else renderYear(card);
    if (!card.firstChild) card.appendChild(el('p', 'status', '운세를 불러오는 중이에요…'));
  }

  // ---- 메뉴 ----
  function renderTabs() {
    MODES.forEach(function (m) {
      var b = $('tab-' + m);
      var on = state.mode === m;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
  }
  function setMode(m, fromHash) {
    if (MODES.indexOf(m) < 0) m = 'today';
    state.mode = m;
    if (!fromHash) { try { history.replaceState(null, '', '#' + m); } catch (e) { location.hash = m; } }
    renderTabs(); renderHeader(); renderCard();
    ensureData();
  }
  function ensureData() {
    if (state.mode === 'today' && !state.day) {
      loadDay(state.today).then(function (d) { state.day = d; if (state.mode === 'today') { renderHeader(); renderCard(); } })
        .catch(function () { if (state.mode === 'today') showError('오늘 운세를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.'); });
    }
    if (state.mode === 'newyear' && !state.year) {
      loadYear().then(function (y) { state.year = y; if (state.mode === 'newyear') { renderHeader(); renderCard(); } })
        .catch(function () { if (state.mode === 'newyear') showError('신년운세를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.'); });
    }
  }

  // ---- 띠 선택 ----
  function renderSigns() {
    var box = $('signs');
    box.textContent = '';
    SIGNS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sign'; b.id = 'sign-' + s.id;
      b.setAttribute('aria-pressed', String(state.sign === s.id));
      b.setAttribute('aria-label', s.ko + '띠');
      b.innerHTML = '<span class="hanja" aria-hidden="true">' + s.hanja + '</span><span class="ko">' + s.ko + '</span>';
      b.addEventListener('click', function () { select(s.id); $('hint').textContent = ''; });
      box.appendChild(b);
    });
  }
  function select(id) {
    state.sign = id;
    saveSign(id);
    SIGNS.forEach(function (s) { var b = $('sign-' + s.id); if (b) b.setAttribute('aria-pressed', String(s.id === id)); });
    renderCard();
  }
  function onYear() {
    var v = $('birth-year').value.trim();
    var hint = $('hint');
    if (!/^\d{4}$/.test(v)) { hint.textContent = ''; return; }
    var y = Number(v), now = splitDate(state.today).y;
    if (y < 1900 || y > now) { hint.textContent = '1900년부터 ' + now + '년 사이로 입력해 주세요.'; return; }
    var s = SIGNS[signIndexFromYear(y)];
    select(s.id);
    hint.textContent = y + '년생은 ' + s.ko + '띠예요. 1~2월 설 이전에 태어났다면 앞 띠일 수 있어요.';
  }

  // ---- 시작 ----
  function start() {
    state.today = todayKST();
    var saved = loadSign();
    state.sign = SIGNS.some(function (s) { return s.id === saved; }) ? saved : SIGNS[signIndexFromYear(splitDate(state.today).y)].id;
    renderSigns();
    if (!saved) $('hint').textContent = '내 띠를 고르거나 출생 연도를 입력해 주세요. 지금은 올해 띠를 보여 드려요.';
    $('birth-year').addEventListener('input', onYear);

    MODES.forEach(function (m, i) {
      var b = $('tab-' + m);
      b.addEventListener('click', function () { setMode(m); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          var next = MODES[(i + (e.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length];
          setMode(next); $('tab-' + next).focus(); e.preventDefault();
        }
      });
    });
    window.addEventListener('hashchange', function () { var h = location.hash.slice(1); if (h !== state.mode) setMode(h, true); });
    setMode(location.hash.slice(1) || 'today', true);

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      try { navigator.serviceWorker.register('sw.js').catch(function () { /* 미리보기 환경 등 */ }); } catch (e) { /* 무시 */ }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
