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

  // Contact form (demo handler — replace with real endpoint/backend when live)
  var form = document.querySelector('[data-contact-form]');
  var status = document.querySelector('[data-contact-status]');
  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.classList.remove('hidden');
      status.textContent =
        'Thank you. The Rewa Cricket Division will review your enquiry.';
      form.reset();
    });
  }

  // Footer year
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
