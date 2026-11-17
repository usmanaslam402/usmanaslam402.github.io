/* Analytics in action: interactive data-analyst demos (no dependencies) */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var started = {};
  function once(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    function go() { if (started[id]) return; started[id] = 1; try { fn(el); } catch (e) { if (window.console) console.error(e); } }
    if (reduce || !('IntersectionObserver' in window)) { go(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { threshold: 0.25 });
    io.observe(el);
  }
  function tween(el, from, to, ms, suffix, done) {
    if (!ms) { el.textContent = Math.round(to) + suffix; if (done) done(to); return; }
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / ms, 1), e = 1 - Math.pow(1 - p, 3), v = from + (to - from) * e;
      el.textContent = Math.round(v) + suffix;
      if (done) done(v);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- 1. impact: before / after bars (real project figures) ---------- */
  once('t-impact', function (el) {
    var rows = [
      { name: 'Pipeline build time', unit: '', b: 100, a: 60 },
      { name: 'Recurring job failures', unit: '', b: 100, a: 45 },
      { name: 'On-time data landing', unit: '%', b: 82, a: 99 }
    ];
    var box = $('.bars', el), btns = $$('.seg button', el);
    box.innerHTML = rows.map(function (r) {
      return '<div class="bar-row"><div>' + r.name + '</div><div class="bar-track"><div class="bar-fill"></div></div><div class="bar-val">0</div></div>';
    }).join('');
    var fills = $$('.bar-fill', box), vals = $$('.bar-val', box), cur = [0, 0, 0], userTouched = false;
    function render(s, animate) {
      btns.forEach(function (b) { var on = b.getAttribute('data-s') === s; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      rows.forEach(function (r, i) {
        fills[i].style.width = r[s] + '%';
        fills[i].classList.toggle('after', s === 'a');
        tween(vals[i], cur[i], r[s], animate ? 900 : 0, r.unit, function (v) { cur[i] = v; });
      });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { userTouched = true; render(b.getAttribute('data-s'), true); }); });
    if (reduce) { render('a', false); return; }
    render('b', true);
    setTimeout(function () { if (!userTouched) render('a', true); }, 1700);
  });

  /* ---------- 2. data-quality gate: donut + threshold slider ---------- */
  once('t-dq', function (el) {
    var r = rng(11), N = 1000, scores = [], i;
    for (i = 0; i < N; i++) scores.push(1 - 0.7 * Math.pow(r(), 12));
    var C = 2 * Math.PI * 54;
    $('.donut-wrap', el).innerHTML =
      '<svg viewBox="0 0 140 140" role="img" aria-label="Share of records passing the quality threshold">' +
      '<circle class="bg" cx="70" cy="70" r="54"></circle>' +
      '<circle class="fg" cx="70" cy="70" r="54" transform="rotate(-90 70 70)" stroke-dasharray="0 ' + C.toFixed(2) + '"></circle>' +
      '<text class="pct" x="70" y="72">0%</text><text class="sub" x="70" y="88">passed</text></svg>';
    var fg = $('.fg', el), pct = $('.pct', el), slider = $('#dq-thr', el), tv = $('#dq-v', el), pp = $('#dq-p', el), ff = $('#dq-f', el);
    function update() {
      var thr = slider.value / 100, pass = 0;
      for (var k = 0; k < N; k++) if (scores[k] >= thr) pass++;
      fg.setAttribute('stroke-dasharray', (C * pass / N).toFixed(2) + ' ' + C.toFixed(2));
      pct.textContent = (pass / N * 100).toFixed(1) + '%';
      tv.textContent = slider.value;
      pp.textContent = pass.toLocaleString(); ff.textContent = (N - pass).toLocaleString();
    }
    slider.addEventListener('input', update);
    if (reduce) { update(); } else { requestAnimationFrame(function () { requestAnimationFrame(update); }); }
  });

  /* ---------- 3. trend line with hover crosshair (sample data) ---------- */
  once('t-trend', function (el) {
    var n = 30, r = rng(7), data = [], avg = [], i, j;
    for (i = 0; i < n; i++) data.push(52 + i * 0.55 + 6 * Math.sin(i / 3.2) + (r() - 0.5) * 9);
    for (i = 0; i < n; i++) { var s = 0, c = 0; for (j = Math.max(0, i - 6); j <= i; j++) { s += data[j]; c++; } avg.push(s / c); }
    var VW = 600, VH = 230, L = 38, R = 12, T = 14, B = 28, pw = VW - L - R, ph = VH - T - B;
    var all = data.concat(avg), mn = Math.floor(Math.min.apply(null, all) / 5) * 5, mx = Math.ceil(Math.max.apply(null, all) / 5) * 5;
    function X(k) { return L + pw * k / (n - 1); }
    function Y(v) { return T + ph * (1 - (v - mn) / (mx - mn)); }
    function path(a) { return a.map(function (v, k) { return (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' '); }

    var grid = '', k;
    for (k = 0; k <= 4; k++) {
      var gv = mn + (mx - mn) * k / 4, gy = Y(gv).toFixed(1);
      grid += '<line class="gl" x1="' + L + '" x2="' + (VW - R) + '" y1="' + gy + '" y2="' + gy + '"></line><text class="ax" x="' + (L - 6) + '" y="' + (+gy + 3) + '" text-anchor="end">' + Math.round(gv) + 'k</text>';
    }
    [1, 10, 20, 30].forEach(function (d) { grid += '<text class="ax" x="' + X(d - 1).toFixed(1) + '" y="' + (VH - 8) + '" text-anchor="middle">Day ' + d + '</text>'; });

    var wrap = $('.chartwrap', el);
    wrap.innerHTML =
      '<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Line chart of daily records processed over 30 days, sample data">' +
      '<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.28"></stop><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"></stop></linearGradient></defs>' +
      grid + '<path class="area" fill="url(#tg)" style="opacity:0;transition:opacity .8s ease .5s"></path><path class="ln"></path>' +
      '<line class="cross" y1="' + T + '" y2="' + (VH - B) + '"></line><circle class="dotc" r="5"></circle></svg><div class="tip"></div>';
    var svg = $('svg', wrap), line = $('.ln', svg), area = $('.area', svg), cross = $('.cross', svg), dot = $('.dotc', svg), tip = $('.tip', wrap);
    var mode = 'd';

    function draw(m) {
      mode = m;
      var series = m === 'a' ? avg : data;
      line.setAttribute('class', 'ln' + (m === 'a' ? ' avg' : ''));
      dot.setAttribute('class', 'dotc' + (m === 'a' ? ' avg' : ''));
      line.setAttribute('d', path(series));
      area.setAttribute('d', path(series) + ' L' + X(n - 1).toFixed(1) + ' ' + (VH - B) + ' L' + X(0).toFixed(1) + ' ' + (VH - B) + ' Z');
      if (reduce) { area.style.opacity = 1; return; }
      var len = line.getTotalLength();
      line.style.transition = 'none'; area.style.transition = 'none'; area.style.opacity = 0;
      line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
      line.getBoundingClientRect();
      line.style.transition = 'stroke-dashoffset 1.3s ease'; area.style.transition = 'opacity .8s ease .6s';
      line.style.strokeDashoffset = 0; area.style.opacity = 1;
    }
    $$('.seg button', el).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.seg button', el).forEach(function (o) { var on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        draw(b.getAttribute('data-s'));
      });
    });

    function hover(e) {
      var rect = svg.getBoundingClientRect();
      var vx = (e.clientX - rect.left) / rect.width * VW;
      var idx = Math.max(0, Math.min(n - 1, Math.round((vx - L) / pw * (n - 1))));
      var series = mode === 'a' ? avg : data, x = X(idx), y = Y(series[idx]);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      tip.textContent = 'Day ' + (idx + 1) + ' · ' + series[idx].toFixed(1) + 'k records' + (mode === 'a' ? ' (7-day avg)' : '');
      tip.style.left = Math.max(12, Math.min(88, x / VW * 100)) + '%';
      wrap.classList.add('hov');
    }
    svg.addEventListener('pointermove', hover);
    svg.addEventListener('pointerdown', hover);
    svg.addEventListener('pointerleave', function () { wrap.classList.remove('hov'); });
    draw('d');
  });

  /* ---------- 4. SQL typing demo ---------- */
  once('t-sql', function (el) {
    var SQL =
      "-- 7-day trend of records and quality failures\n" +
      "WITH daily AS (\n" +
      "  SELECT load_date,\n" +
      "         COUNT(*) AS records,\n" +
      "         SUM(CASE WHEN dq_status = 'FAIL' THEN 1 ELSE 0 END) AS quarantined\n" +
      "  FROM silver.orders\n" +
      "  GROUP BY load_date\n" +
      ")\n" +
      "SELECT load_date,\n" +
      "       records,\n" +
      "       ROUND(100.0 * quarantined / records, 1) AS fail_pct,\n" +
      "       AVG(records) OVER (ORDER BY load_date ROWS 6 PRECEDING) AS avg_7d\n" +
      "FROM daily\n" +
      "ORDER BY load_date DESC\n" +
      "LIMIT 5;";
    var ROWS = [
      ['2026-11-12', '48,210', '1.8', '46,905'],
      ['2026-11-11', '47,654', '2.1', '46,512'],
      ['2026-11-10', '45,980', '1.6', '46,188'],
      ['2026-11-09', '46,302', '1.9', '45,930'],
      ['2026-11-08', '44,871', '2.4', '45,611']
    ];
    var code = $('.code', el), out = $('.out', el), runBtn = $('.run', el);
    var TOK = /('[^']*')|(--[^\n]*)|\b(WITH|AS|SELECT|FROM|GROUP BY|ORDER BY|LIMIT|OVER|ROWS|PRECEDING|CASE|WHEN|THEN|ELSE|END|DESC|SUM|COUNT|AVG|ROUND)\b|(\b\d+(?:\.\d+)?\b)/g;
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function hl(s) {
      return esc(s).replace(TOK, function (m, str, cm, kw, num) {
        if (str) return '<span class="s">' + str + '</span>';
        if (cm) return '<span class="c">' + cm + '</span>';
        if (kw) return '<span class="k">' + kw + '</span>';
        return '<span class="n">' + num + '</span>';
      });
    }
    function showOut() {
      var h = '<table><thead><tr><th>load_date</th><th>records</th><th>fail_pct</th><th>avg_7d</th></tr></thead><tbody>';
      ROWS.forEach(function (row, i) { h += '<tr style="--d:' + (i * 0.12).toFixed(2) + 's"><td>' + row.join('</td><td>') + '</td></tr>'; });
      out.innerHTML = h + '</tbody></table><div class="status">5 rows · sample output</div>';
    }
    var run = 0;
    function play() {
      var id = ++run, i = 0;
      out.innerHTML = '';
      if (reduce) { code.innerHTML = hl(SQL); showOut(); return; }
      (function tick() {
        if (id !== run) return;
        i = Math.min(SQL.length, i + 3);
        code.innerHTML = hl(SQL.slice(0, i)) + '<span class="caret"></span>';
        if (i < SQL.length) setTimeout(tick, 18);
        else { code.innerHTML = hl(SQL); setTimeout(function () { if (id === run) showOut(); }, 350); }
      })();
    }
    runBtn.addEventListener('click', play);
    play();
  });
})();
