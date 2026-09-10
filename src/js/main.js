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
  var suggestChips = document.querySelectorAll('.search-suggest-chip');

  if (resultsEl) {
    var qParam = new URLSearchParams(window.location.search).get('q') || '';
    var input = document.getElementById('sq');
    if (input && qParam) input.value = qParam;

    var cachedIndex = null;

    var normalize = function (s) {
      return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    };

    var highlight = function (text, terms) {
      if (!text) return '';
      var safe = esc(text);
      terms.forEach(function (t) {
        if (!t || t.length < 2) return;
        var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        safe = safe.replace(re, '<mark class="search-highlight">$1</mark>');
      });
      return safe;
    };

    var render = function (items, q) {
      var rawQ = (q || '').trim();
      if (!rawQ) {
        resultsEl.innerHTML = '<p class="card-meta">Type a query above and press Search, or click any suggestion chip above.</p>';
        if (countEl) countEl.classList.add('hidden');
        resultsEl.classList.remove('search-has-results');
        return;
      }

      var qn = normalize(rawQ);
      var terms = qn.split(/\s+/).filter(Boolean);

      var scored = items
        .map(function (it) {
          var titleNorm = normalize(it.title || '');
          var descNorm = normalize(it.description || '');
          var textNorm = normalize(it.text || '');
          var pathNorm = normalize(it.path || '');

          var score = 0;
          if (titleNorm.indexOf(qn) !== -1) score += 20;
          if (descNorm.indexOf(qn) !== -1) score += 10;
          if (textNorm.indexOf(qn) !== -1) score += 5;

          var allTermsFound = true;
          terms.forEach(function (t) {
            var found = false;
            if (titleNorm.indexOf(t) !== -1) { score += 12; found = true; }
            if (descNorm.indexOf(t) !== -1) { score += 6; found = true; }
            if (textNorm.indexOf(t) !== -1) { score += 3; found = true; }
            if (pathNorm.indexOf(t) !== -1) { score += 2; found = true; }
            if (!found) allTermsFound = false;
          });

          if (allTermsFound) score += 10;

          return { it: it, score: score };
        })
        .filter(function (x) {
          return x.score > 0;
        })
        .sort(function (a, b) {
          return b.score - a.score || a.it.title.localeCompare(b.it.title);
        })
        .slice(0, 50);

      if (!scored.length) {
        resultsEl.innerHTML = '<p>No results for <strong>' + esc(rawQ) + '</strong> in the archive.</p><p class="card-meta">Try searching for a player name, match, team, tournament or venue from the suggestions above.</p>';
        if (countEl) countEl.classList.add('hidden');
        return;
      }

      if (countEl) {
        countEl.classList.remove('hidden');
        countEl.innerHTML = 'Showing <strong>' + scored.length + '</strong> ' + (scored.length === 1 ? 'result' : 'results') + ' for "<em>' + esc(rawQ) + '</em>"';
      }
      resultsEl.classList.add('search-has-results');
      resultsEl.innerHTML =
        '<div class="grid grid-2">' +
        scored
          .map(function (x) {
            var highlightedTitle = highlight(x.it.title, terms);
            var snippet = x.it.description || (x.it.text ? x.it.text.slice(0, 140) + '…' : '');
            var highlightedSnippet = highlight(snippet.slice(0, 160), terms);
            var d = snippet ? '<div class="card-meta">' + highlightedSnippet + '</div>' : '';
            return '<a class="card row-card card-link" href="' + esc(x.it.path) + '">' +
              '<span><span class="card-title">' + highlightedTitle + '</span>' + d + '</span></a>';
          })
          .join('\n') +
        '</div>';
    };

    var doSearch = function (q) {
      if (cachedIndex) {
        render(cachedIndex, q);
      } else {
        fetch('/search-index.json')
          .then(function (r) { return r.json(); })
          .then(function (idx) {
            cachedIndex = idx;
            render(idx, q);
          })
          .catch(function () {
            resultsEl.innerHTML = '<p class="card-meta">Search index unavailable. Please try again later.</p>';
          });
      }
    };

    if (qParam) {
      doSearch(qParam);
    }

    if (input) {
      input.addEventListener('input', function (e) {
        doSearch(e.target.value);
      });
    }

    if (pageForm) {
      pageForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (input) doSearch(input.value);
      });
    }

    suggestChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var val = chip.getAttribute('data-search');
        if (input) {
          input.value = val;
          input.focus();
        }
        doSearch(val);
      });
    });
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
