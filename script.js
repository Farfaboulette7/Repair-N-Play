// =========================================
// Repair N'Play — interactions
// =========================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Header scroll state ---------- */
  const header = document.getElementById('site-header');

  const updateHeaderState = () => {
    if (window.scrollY > 12) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };
  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });

  /* ---------- Mobile burger menu ---------- */
  const burgerBtn = document.getElementById('burger-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  const closeMobileMenu = () => {
    mobileMenu.style.maxHeight = '0px';
    burgerBtn.setAttribute('aria-expanded', 'false');
  };

  const openMobileMenu = () => {
    mobileMenu.style.maxHeight = mobileMenu.scrollHeight + 'px';
    burgerBtn.setAttribute('aria-expanded', 'true');
  };

  burgerBtn.addEventListener('click', () => {
    const isOpen = burgerBtn.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMobileMenu() : openMobileMenu();
  });

  // Close the mobile menu whenever a nav link is tapped
  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  /* ---------- Console filter (PS5 / Xbox / Switch) ---------- */
  const consoleTabs = document.querySelectorAll('.console-tab');
  const repairGroups = document.querySelectorAll('.repair-group');

  consoleTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.console;

      consoleTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      repairGroups.forEach((group) => {
        group.classList.toggle('hidden', group.dataset.console !== target);
      });
    });
  });

  /* ---------- Quote form submission (front-end only) ---------- */
  const quoteForm = document.getElementById('quote-form');
  const confirmationBox = document.getElementById('form-confirmation');

  if (quoteForm) {
    quoteForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!quoteForm.checkValidity()) {
        quoteForm.reportValidity();
        return;
      }

      // Front-end only: no backend wired up yet.
      // Replace this block with a fetch() call to your form endpoint.
      confirmationBox.classList.remove('hidden');
      quoteForm.reset();

      confirmationBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

});
