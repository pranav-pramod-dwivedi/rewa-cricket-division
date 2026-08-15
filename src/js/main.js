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

  // ---- Players page: interactive sorting & filtering ----
  var grid = document.getElementById('players-list-grid');
  if (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.player-card-item'));
    var searchInput = document.getElementById('player-search-input');
    var roleSelect = document.getElementById('player-role-select');
    var teamSelect = document.getElementById('player-team-select');
    var statusSelect = document.getElementById('player-status-select');
    var sortSelect = document.getElementById('player-sort-select');
    var resetBtn = document.getElementById('player-filter-reset');
    var emptyResetBtn = document.getElementById('empty-reset-btn');
    var countDisplay = document.getElementById('player-count-display');
    var noMatchEl = document.getElementById('no-players-match');

    var updatePlayers = function () {
      var q = (searchInput ? searchInput.value : '').toLowerCase().trim();
      var role = roleSelect ? roleSelect.value : '';
      var teamId = teamSelect ? teamSelect.value : '';
      var status = statusSelect ? statusSelect.value : '';
      var sortBy = sortSelect ? sortSelect.value : 'name-asc';

      var visible = [];

      cards.forEach(function (card) {
        var name = card.getAttribute('data-name') || '';
        var cardRole = card.getAttribute('data-role') || '';
        var cardTeamId = card.getAttribute('data-team-id') || '';
        var isOfficial = card.getAttribute('data-official') === 'true';

        var matchesQuery = !q || name.indexOf(q) !== -1 || cardRole.toLowerCase().indexOf(q) !== -1;
        var matchesRole = !role || cardRole.toLowerCase().indexOf(role.toLowerCase()) !== -1;
        var matchesTeam = !teamId || cardTeamId === teamId;
        var matchesStatus = !status || (status === 'official' && isOfficial);

        if (matchesQuery && matchesRole && matchesTeam && matchesStatus) {
          card.style.display = '';
          visible.push(card);
        } else {
          card.style.display = 'none';
        }
      });

      // Sort visible cards
      visible.sort(function (a, b) {
        var nameA = a.getAttribute('data-name') || '';
        var nameB = b.getAttribute('data-name') || '';
        var runsA = parseInt(a.getAttribute('data-runs') || '0', 10);
        var runsB = parseInt(b.getAttribute('data-runs') || '0', 10);
        var wktsA = parseInt(a.getAttribute('data-wickets') || '0', 10);
        var wktsB = parseInt(b.getAttribute('data-wickets') || '0', 10);
        var matA = parseInt(a.getAttribute('data-matches') || '0', 10);
        var matB = parseInt(b.getAttribute('data-matches') || '0', 10);

        if (sortBy === 'name-asc') return nameA.localeCompare(nameB);
        if (sortBy === 'name-desc') return nameB.localeCompare(nameA);
        if (sortBy === 'runs-desc') return runsB - runsA || nameA.localeCompare(nameB);
        if (sortBy === 'wickets-desc') return wktsB - wktsA || nameA.localeCompare(nameB);
        if (sortBy === 'matches-desc') return matB - matA || nameA.localeCompare(nameB);
        return nameA.localeCompare(nameB);
      });

      // Re-append sorted visible elements to container
      visible.forEach(function (card) {
        grid.appendChild(card);
      });

      // Update count display
      if (countDisplay) {
        countDisplay.innerHTML = 'Showing <strong>' + visible.length + '</strong> of ' + cards.length + ' players';
      }

      if (noMatchEl) {
        if (visible.length === 0) {
          noMatchEl.classList.remove('hidden');
        } else {
          noMatchEl.classList.add('hidden');
        }
      }
    };

    var resetFilters = function () {
      if (searchInput) searchInput.value = '';
      if (roleSelect) roleSelect.value = '';
      if (teamSelect) teamSelect.value = '';
      if (statusSelect) statusSelect.value = '';
      if (sortSelect) sortSelect.value = 'name-asc';
      updatePlayers();
    };

    if (searchInput) searchInput.addEventListener('input', updatePlayers);
    if (roleSelect) roleSelect.addEventListener('change', updatePlayers);
    if (teamSelect) teamSelect.addEventListener('change', updatePlayers);
    if (statusSelect) statusSelect.addEventListener('change', updatePlayers);
    if (sortSelect) sortSelect.addEventListener('change', updatePlayers);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetFilters);
  }

  // Footer year
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
