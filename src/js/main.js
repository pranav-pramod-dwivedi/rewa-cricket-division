// ============================================================
// Rewa Cricket Division — minimal vanilla JS.
// Progressive enhancement only; SEO content is in the HTML.
// ============================================================
(function () {
  'use strict';

  // Mobile navigation toggle
  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav]');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // ---- Search: clear buttons (header + search page) ----
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  document.querySelectorAll('[data-search-clear]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-search-clear-target') || 'q');
      if (!input) input = document.querySelector('.header-search input[name="q"]');
      if (!input) input = document.querySelector('.search-page-form input[name="q"]');
      if (input) {
        input.value = '';
        input.focus();
      }
      var results = document.querySelector('[data-search-results]');
      var count = document.querySelector('[data-search-count]');
      if (results) {
        results.innerHTML = '<p class="card-meta">Type a query above and press Search, or use the search box in the header.</p>';
        results.classList.remove('search-has-results');
      }
      if (count) count.classList.add('hidden');
      // header clear button visibility
      var clearBtn = document.querySelector('.header-search [data-search-clear]');
      if (clearBtn) clearBtn.hidden = true;
      // tidy URL
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });
  });

  // show/hide the header clear (×) button as the user types
  var headerInput = document.querySelector('.header-search input[name="q"]');
  var headerClear = document.querySelector('.header-search [data-search-clear]');
  if (headerInput && headerClear) {
    headerInput.addEventListener('input', function () {
      headerClear.hidden = headerInput.value.length === 0;
    });
    headerClear.addEventListener('click', function () {
      headerInput.value = '';
      headerClear.hidden = true;
      headerInput.focus();
    });
  }

  // ---- Search page: run query client-side against the search index ----
  var resultsEl = document.querySelector('[data-search-results]');
  var countEl = document.querySelector('[data-search-count]');
  var pageForm = document.querySelector('.search-page-form');

  if (resultsEl) {
    var qParam = new URLSearchParams(window.location.search).get('q') || '';
    var input = document.getElementById('sq');
    if (input && qParam) input.value = qParam;

    var normalize = function (s) {
      return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    };

    var render = function (items, q) {
      var qn = normalize(q);
      var terms = qn.split(/\s+/).filter(Boolean);
      var scored = items
        .map(function (it) {
          var hay = normalize(it.title + ' ' + it.description + ' ' + it.path);
          var score = 0;
          terms.forEach(function (t) {
            if (hay.indexOf(t) !== -1) score += 1;
            if (normalize(it.title).indexOf(t) !== -1) score += 2;
          });
          return { it: it, score: score };
        })
        .filter(function (x) {
          return x.score > 0;
        })
        .sort(function (a, b) {
          return b.score - a.score || a.it.title.localeCompare(b.it.title);
        })
        .slice(0, 40);

      if (!q) {
        resultsEl.innerHTML = '<p class="card-meta">Type a query above and press Search, or use the search box in the header.</p>';
        countEl.classList.add('hidden');
        return;
      }
      if (!scored.length) {
        resultsEl.innerHTML = '<p>No results for <strong>' + esc(q) + '</strong> in the archive.</p><p class="card-meta">Try a player name, team, tournament or venue.</p>';
        countEl.classList.add('hidden');
        return;
      }
      countEl.classList.remove('hidden');
      countEl.textContent = scored.length + (scored.length === 1 ? ' result' : ' results') + ' for "' + q + '"';
      resultsEl.classList.add('search-has-results');
      resultsEl.innerHTML =
        '<div class="grid grid-2">' +
        scored
          .map(function (x) {
            var d = x.it.description
              ? '<div class="card-meta">' + esc(x.it.description.slice(0, 140)) + '</div>'
              : '';
            return '<a class="card row-card card-link" href="' + esc(x.it.path) + '">' +
              '<span><span class="card-title">' + esc(x.it.title) + '</span>' + d + '</span></a>';
          })
          .join('\n') +
        '</div>';
    };

    if (qParam) {
      fetch('/search-index.json')
        .then(function (r) {
          return r.json();
        })
        .then(function (idx) {
          render(idx, qParam);
        })
        .catch(function () {
          resultsEl.innerHTML = '<p class="card-meta">Search index unavailable. Please try again later.</p>';
        });
    }
  }

  // Footer year
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
