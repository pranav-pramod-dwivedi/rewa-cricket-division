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

  // Contact form: opens the visitor's mail client when an official address is
  // configured; otherwise states plainly that the address is being confirmed.
  var form = document.querySelector('[data-contact-form]');
  var status = document.querySelector('[data-contact-status]');
  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var to = form.getAttribute('data-contact-email');
      var subject = encodeURIComponent(form.subject ? form.subject.value : 'Enquiry via rewa-cricket-division website');
      var body = encodeURIComponent(
        'Name: ' + (form.name ? form.name.value : '') +
        '\nEmail: ' + (form.email ? form.email.value : '') +
        '\n\n' + (form.message ? form.message.value : '')
      );
      if (to) {
        window.location.href = 'mailto:' + to + '?subject=' + subject + '&body=' + body;
        status.classList.remove('hidden');
        status.textContent = 'Opening your email client… (your message is not stored on this site)';
      } else {
        status.classList.remove('hidden');
        status.textContent = 'The official contact address is being confirmed by the division. Meanwhile, please use the official government and sports links above.';
      }
      form.reset();
    });
  }

  // Footer year
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
