// Démo ESMT + panneau Rita
// - Embed du site ESMT cloné localement (./esmt-clone/) dans un iframe plein écran
// - Bouton flottant en bas à droite : ouvre/ferme un panneau latéral
// - Le panneau charge l'app Flutter Yeekai depuis window.FLUTTER_APP_URL (config.js)
// - L'iframe Flutter est préchargée en arrière-plan (idle callback après window.load)
//   pour que l'ouverture du panneau soit instantanée

(function () {
  const fab = document.getElementById('rita-fab');
  const panel = document.getElementById('rita-panel');
  const backdrop = document.getElementById('rita-backdrop');
  const closeBtn = document.getElementById('rita-close');
  const ritaFrame = document.getElementById('rita-frame');
  const teaser = document.getElementById('rita-teaser');
  const teaserClose = document.getElementById('rita-teaser-close');
  const esmtFrame = document.getElementById('esmt-frame');

  // iOS Safari : une iframe scrollable avec body contraint ne reçoit pas
  // correctement les gestes tactiles. Solution : l'iframe est en `scrolling="no"`,
  // on dimensionne sa hauteur à celle de son contenu, et c'est le wrapper
  // (#esmt-scroll) qui gère le scroll natif.
  function syncEsmtFrameHeight() {
    if (!esmtFrame) return;
    try {
      const doc = esmtFrame.contentDocument;
      if (!doc || !doc.documentElement) return;
      const h = Math.max(
        doc.documentElement.scrollHeight,
        doc.body ? doc.body.scrollHeight : 0
      );
      if (h > 0) esmtFrame.style.height = h + 'px';
    } catch (e) { /* cross-origin : on garde le fallback CSS */ }
  }
  if (esmtFrame) {
    esmtFrame.addEventListener('load', () => {
      syncEsmtFrameHeight();
      // Drupal/jQuery peut ajouter du contenu après le load — on remesure.
      setTimeout(syncEsmtFrameHeight, 300);
      setTimeout(syncEsmtFrameHeight, 1200);
    });
    window.addEventListener('resize', syncEsmtFrameHeight);
  }

  let frameLoaded = false;

  const TEASER_KEY = 'rita-teaser-dismissed';
  const TEASER_DELAY = 1200; // ms après window.load

  function showTeaser() {
    if (!teaser) return;
    try {
      if (localStorage.getItem(TEASER_KEY) === 'true') return;
    } catch (e) { /* localStorage indispo : on l'affiche quand même */ }
    teaser.classList.add('is-visible');
    teaser.setAttribute('aria-hidden', 'false');
  }

  function hideTeaser({ persist = false } = {}) {
    if (!teaser) return;
    teaser.classList.remove('is-visible');
    teaser.setAttribute('aria-hidden', 'true');
    if (persist) {
      try { localStorage.setItem(TEASER_KEY, 'true'); } catch (e) { /* noop */ }
    }
  }

  function loadFrame() {
    if (frameLoaded) return;
    const flutterUrl = window.FLUTTER_APP_URL;
    if (!flutterUrl) {
      console.error('[Rita] FLUTTER_APP_URL non défini dans config.js');
      return;
    }
    ritaFrame.src = flutterUrl;
    frameLoaded = true;
  }

  function openPanel() {
    // Sécurité : si la préchargée n'a pas encore eu lieu (clic ultra-rapide), on la lance
    loadFrame();
    hideTeaser({ persist: true }); // l'utilisateur a engagé : pas besoin de remontrer le teaser
    panel.classList.add('is-open');
    backdrop.classList.add('is-open');
    fab.classList.add('is-hidden');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    fab.classList.remove('is-hidden');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
  }

  fab.addEventListener('click', () => {
    if (panel.classList.contains('is-open')) {
      closePanel();
    } else {
      openPanel();
    }
  });

  closeBtn.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);

  // Esc pour fermer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) {
      closePanel();
    }
  });

  // Bouton × du teaser : ferme et persiste le dismiss
  if (teaserClose) {
    teaserClose.addEventListener('click', (e) => {
      e.stopPropagation();
      hideTeaser({ persist: true });
    });
  }

  // Précharge l'app Flutter en arrière-plan, après que la page principale soit chargée,
  // pendant un slot d'inactivité du navigateur. Le panneau reste invisible (CSS),
  // mais le SPA Flutter est prêt en mémoire pour une ouverture sans latence.
  function schedulePreload() {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(loadFrame, { timeout: 3000 });
    } else {
      setTimeout(loadFrame, 1500);
    }
  }
  function scheduleTeaser() {
    setTimeout(showTeaser, TEASER_DELAY);
  }
  if (document.readyState === 'complete') {
    schedulePreload();
    scheduleTeaser();
  } else {
    window.addEventListener('load', () => {
      schedulePreload();
      scheduleTeaser();
    }, { once: true });
  }
})();
