// Démo ESMT + panneau Rita
// - Embed du site ESMT cloné localement (./esmt-clone/) dans un iframe plein écran
// - Bouton flottant en bas à droite : ouvre/ferme un panneau latéral
// - Le panneau charge l'app Flutter Yeekai depuis window.FLUTTER_APP_URL (config.js)

(function () {
  const fab = document.getElementById('rita-fab');
  const panel = document.getElementById('rita-panel');
  const backdrop = document.getElementById('rita-backdrop');
  const closeBtn = document.getElementById('rita-close');
  const ritaFrame = document.getElementById('rita-frame');

  let panelLoaded = false;

  function openPanel() {
    if (!panelLoaded) {
      // Lazy-load du chat Flutter — on évite de bouter le SPA tant que l'utilisateur n'a pas cliqué
      const flutterUrl = window.FLUTTER_APP_URL;
      if (!flutterUrl) {
        console.error('[Rita] FLUTTER_APP_URL non défini dans config.js');
        return;
      }
      ritaFrame.src = flutterUrl;
      panelLoaded = true;
    }
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
})();
