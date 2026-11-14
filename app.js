// 열두띠 오늘운세 - 띠 선택 + 그날의 운세 파일(fortunes/YYYY-MM-DD.json) 표시
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
  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var AREAS = [['money', '금전운'], ['love', '애정운'], ['health', '건강운'], ['work', '일·학업']];
  var STORE_KEY = 'fortune.sign';

  var $ = function (id) { return document.getElementById(id); };
  var state = { sign: null, data: null, shownDate: null, today: null };

  // ---- 날짜 계산 (한국 시간 기준) ----
  function todayKST() {
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return parts; // YYYY-MM-DD
  }
  function splitDate(s) { var p = s.split('-').map(Number); return { y: p[0], m: p[1], d: p[2] }; }
  function cycle(i) { i = ((i % 60) + 60) % 60; return { ko: STEMS[i % 10] + BRANCHES[i % 12], hanja: STEMS_H[i % 10] + BRANCHES_H[i % 12] }; }
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

  // ---- 저장 (없어도 동작) ----
  function loadSign() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function saveSign(id) { try { localStorage.setItem(STORE_KEY, id); } catch (e) { /* 저장 불가 환경 */ } }

  // ---- 운세 파일 불러오기 ----
  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return r.json();
    });
  }
  function loadFortunes(date) {
    return getJSON('fortunes/' + date + '.json').catch(function () {
      return getJSON('fortunes/index.json').then(function (idx) { return getJSON('fortunes/' + idx.latest + '.json'); });
    });
  }

  // ---- 그리기 ----
  function renderHeader() {
    var y = splitDate(state.today).y;
    var yg = yearGanzhi(y), dg = dayGanzhi(state.today);
    $('date').textContent = formatDate(state.today);
    $('ganzhi').textContent = yg.ko + '년 ' + dg.ko + '일 (' + dg.hanja + '日)';
  }

  function renderSigns() {
    var box = $('signs');
    box.textContent = '';
    SIGNS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sign';
      b.id = 'sign-' + s.id;
      b.setAttribute('aria-pressed', String(state.sign === s.id));
      b.setAttribute('aria-label', s.ko + '띠');
      b.innerHTML = '<span class="hanja" aria-hidden="true">' + s.hanja + '</span><span class="ko">' + s.ko + '</span>';
      b.addEventListener('click', function () { select(s.id); $('hint').textContent = ''; });
      box.appendChild(b);
    });
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function renderCard() {
    var card = $('card');
    card.textContent = '';
    if (!state.data) return;
    var idx = SIGNS.findIndex(function (s) { return s.id === state.sign; });
    var sign = SIGNS[idx];
    var f = state.data.signs[sign.id];

    if (state.shownDate !== state.today) {
      card.appendChild(el('p', 'notice', '오늘 운세가 아직 준비되지 않아 ' + formatDate(state.shownDate) + ' 운세를 보여 드려요.'));
    }

    var top = el('div', 'card-top');
    var left = el('div');
    left.appendChild(el('h2', null, sign.ko + '띠 (' + sign.hanja + ')'));
    left.appendChild(el('p', 'years', birthYears(idx, splitDate(state.today).y)));
    var seal = el('div', 'seal');
    seal.setAttribute('aria-label', '오늘 운세 지수 ' + f.score + '점');
    seal.innerHTML = '<b>' + f.score + '</b><small>운세 지수</small>';
    top.appendChild(left); top.appendChild(seal);
    card.appendChild(top);

    card.appendChild(el('p', 'summary', f.summary));

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
    card.appendChild(ul);

    var dl = el('dl', 'lucky');
    [['행운의 색', f.lucky.color], ['행운의 숫자', String(f.lucky.number)], ['좋은 방향', f.lucky.direction]].forEach(function (p) {
      var d = el('div'); d.appendChild(el('dt', null, p[0])); d.appendChild(el('dd', null, p[1])); dl.appendChild(d);
    });
    card.appendChild(dl);

    card.appendChild(el('p', 'advice', f.advice));

    var actions = el('div', 'actions');
    var share = el('button', 'btn', '운세 공유하기');
    share.type = 'button'; share.id = 'share';
    var status = el('span', 'status'); status.id = 'share-status'; status.setAttribute('role', 'status');
    share.addEventListener('click', function () { shareFortune(sign, f, status, card); });
    actions.appendChild(share); actions.appendChild(status);
    card.appendChild(actions);
  }

  function shareText(sign, f) {
    return '[' + formatDate(state.shownDate) + ' ' + sign.ko + '띠 운세] 운세 지수 ' + f.score + '점\n' +
      f.summary + '\n행운의 색 ' + f.lucky.color + ' · 숫자 ' + f.lucky.number + ' · 방향 ' + f.lucky.direction + '\n“' + f.advice + '”';
  }

  function shareFortune(sign, f, status, card) {
    var text = shareText(sign, f);
    function fallback() {
      var box = document.getElementById('copybox');
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
      navigator.share({ title: sign.ko + '띠 오늘운세', text: text }).then(function () { status.textContent = '공유했어요.'; }, function (e) {
        if (e && e.name === 'AbortError') return; // 사용자가 취소
        copy();
      });
    } else { copy(); }
  }

  function select(id) {
    state.sign = id;
    saveSign(id);
    SIGNS.forEach(function (s) { var b = $('sign-' + s.id); if (b) b.setAttribute('aria-pressed', String(s.id === id)); });
    renderCard();
  }

  // ---- 출생 연도 입력 ----
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
    renderHeader();
    renderSigns();
    if (!saved) $('hint').textContent = '내 띠를 고르거나 출생 연도를 입력해 주세요. 지금은 올해 띠를 보여 드려요.';
    $('birth-year').addEventListener('input', onYear);

    loadFortunes(state.today).then(function (data) {
      state.data = data;
      state.shownDate = data.date;
      $('generated').textContent = formatDate(data.date) + '분 · ' + (data.generatedBy || 'AI') + ' 작성';
      renderCard();
    }).catch(function () {
      var card = $('card');
      card.textContent = '';
      card.appendChild(el('p', 'error', '운세를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.'));
    });

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      try { navigator.serviceWorker.register('sw.js').catch(function () { /* 미리보기 환경 등 */ }); } catch (e) { /* 무시 */ }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
