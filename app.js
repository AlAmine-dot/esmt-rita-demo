// Démo ESMT + panneau Rita
// - Embed du site ESMT cloné localement (./esmt-clone/) dans un iframe plein écran
// - Bouton flottant en bas à droite : ouvre/ferme un panneau latéral
// - Le panneau charge l'app Flutter Yeekai depuis window.FLUTTER_APP_URL (config.js)
// - L'iframe Flutter est préchargée en arrière-plan (idle callback après window.load)
//   pour que l'ouverture du panneau soit instantanée

(function () {
  // ─── Debug overlay (active avec ?debug=1 dans l'URL) ─────────────────────
  // Affiche en temps réel les événements touch/scroll pour diagnostiquer le
  // bug de scroll mobile (iOS Safari + Chrome mobile-emulation). Pas d'erreur
  // JS jetée par ce bug : il faut voir QUELS events arrivent et lesquels sont
  // avalés. Activable sans modif de code via l'URL.
  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
  let dbg, touchmoveCount = 0, lastTouchTarget = '—', lastScrollY = 0;
  if (DEBUG) {
    dbg = document.createElement('div');
    dbg.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;background:rgba(0,0,0,0.85);color:#0f0;font:11px/1.3 monospace;padding:8px 10px;border-radius:6px;pointer-events:none;max-width:60vw;white-space:pre;';
    document.body.appendChild(dbg);
    function refresh() {
      const bodyH = document.body.scrollHeight;
      const iframeH = document.getElementById('esmt-frame')?.style.height || '?';
      const winH = window.innerHeight;
      const sy = Math.round(window.scrollY);
      dbg.textContent =
        `win:${winH}  body:${bodyH}  iframe:${iframeH}\n` +
        `scrollY:${sy}  Δ:${sy - lastScrollY}\n` +
        `touchmoves:${touchmoveCount}\n` +
        `lastTouchOn:${lastTouchTarget}`;
      lastScrollY = sy;
      requestAnimationFrame(refresh);
    }
    refresh();
    document.addEventListener('touchstart', (e) => {
      const t = e.target;
      lastTouchTarget = (t.id ? '#' + t.id : t.tagName) +
        (t === document.getElementById('esmt-frame') ? ' (iframe)' : '');
    }, { capture: true, passive: true });
    document.addEventListener('touchmove', () => { touchmoveCount++; }, { capture: true, passive: true });
    window.addEventListener('scroll', () => {}, { passive: true }); // refresh handles it
  }

  const fab = document.getElementById('rita-fab');
  const panel = document.getElementById('rita-panel');
  const backdrop = document.getElementById('rita-backdrop');
  const closeBtn = document.getElementById('rita-close');
  const ritaFrame = document.getElementById('rita-frame');
  const teaser = document.getElementById('rita-teaser');
  const teaserClose = document.getElementById('rita-teaser-close');
  const esmtFrame = document.getElementById('esmt-frame');

  // iOS Safari : une iframe scrollable ne reçoit pas correctement les gestes
  // tactiles. Solution : l'iframe est en `scrolling="no"` et on cale sa hauteur
  // sur celle de son contenu, pour que ce soit le body lui-même qui scrolle
  // (le scroll natif du body fonctionne nickel sur iOS).
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
      // Nouvelle page chargée dans l'iframe : on remonte le body en haut.
      window.scrollTo(0, 0);
      syncEsmtFrameHeight();
      // Drupal/jQuery peut ajouter du contenu après le load — on remesure.
      setTimeout(() => { syncEsmtFrameHeight(); updateScrollbar(); }, 300);
      setTimeout(() => { syncEsmtFrameHeight(); updateScrollbar(); }, 1200);
    });
    window.addEventListener('resize', () => {
      syncEsmtFrameHeight();
      updateScrollbar();
    });
  }

  // ─── Scrollbar custom (fallback iOS/Chrome mobile) ─────────────────────
  // Sur iOS Safari et certaines versions Chrome mobile, les gestes tactiles
  // qui démarrent sur l'iframe ne propagent pas leur scroll au body parent.
  // La scrollbar custom est un élément du parent : ses propres événements
  // tactiles ne souffrent pas de cette limitation, donc le drag scrolle le
  // body de manière fiable.
  const scrollbar = document.getElementById('esmt-scrollbar');
  const scrollbarThumb = document.getElementById('esmt-scrollbar-thumb');

  function updateScrollbar() {
    if (!scrollbar || !scrollbarThumb) return;
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const winHeight = window.innerHeight;
    if (docHeight <= winHeight + 1) {
      scrollbar.style.display = 'none';
      return;
    }
    scrollbar.style.display = 'block';
    const trackHeight = scrollbar.clientHeight;
    const thumbHeight = Math.max(40, (winHeight / docHeight) * trackHeight);
    const maxScroll = docHeight - winHeight;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const thumbY = (scrollY / maxScroll) * (trackHeight - thumbHeight);
    scrollbarThumb.style.height = thumbHeight + 'px';
    scrollbarThumb.style.top = thumbY + 'px';
  }

  let drag = null;
  let pendingScrollY = null;
  let rafScheduled = false;

  function startDrag(clientY) {
    // On capte les valeurs de layout une seule fois au début du drag : pas
    // besoin de relire `scrollHeight`/`clientHeight` à chaque touchmove (qui
    // forcerait un layout-thrash et ferait saccader le drag sur iOS).
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const winHeight = window.innerHeight;
    const trackHeight = scrollbar.clientHeight;
    const thumbHeight = scrollbarThumb.clientHeight;
    drag = {
      startY: clientY,
      startThumbTop: scrollbarThumb.offsetTop,
      maxThumbTop: Math.max(1, trackHeight - thumbHeight),
      maxScroll: Math.max(0, docHeight - winHeight),
    };
    scrollbarThumb.classList.add('is-dragging');
  }
  function moveDrag(clientY) {
    if (!drag) return;
    const dY = clientY - drag.startY;
    const newThumbTop = Math.max(0, Math.min(drag.maxThumbTop, drag.startThumbTop + dY));
    const ratio = newThumbTop / drag.maxThumbTop;
    pendingScrollY = ratio * drag.maxScroll;
    // Throttle : on coalesce tous les touchmove dans un seul scrollTo par
    // frame d'animation. iOS Safari fait jusqu'à 120 touchmove/s sur ProMotion,
    // appliquer chacun en scrollTo cause des saccades visibles.
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(() => {
        if (pendingScrollY !== null) {
          window.scrollTo(0, pendingScrollY);
          pendingScrollY = null;
        }
        rafScheduled = false;
      });
    }
  }
  function endDrag() {
    drag = null;
    pendingScrollY = null;
    if (scrollbarThumb) scrollbarThumb.classList.remove('is-dragging');
  }

  if (scrollbarThumb) {
    // Touch (mobile)
    scrollbarThumb.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startDrag(e.touches[0].clientY);
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (!drag) return;
      e.preventDefault();
      moveDrag(e.touches[0].clientY);
    }, { passive: false });
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);

    // Mouse (desktop fallback ; le wheel natif marche aussi)
    scrollbarThumb.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startDrag(e.clientY);
    });
    document.addEventListener('mousemove', (e) => {
      if (drag) moveDrag(e.clientY);
    });
    document.addEventListener('mouseup', endDrag);

    // Click sur la track (hors thumb) : saute à la position
    scrollbar.addEventListener('click', (e) => {
      if (e.target === scrollbarThumb) return;
      const rect = scrollbar.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const winHeight = window.innerHeight;
      const maxScroll = docHeight - winHeight;
      const ratio = clickY / scrollbar.clientHeight;
      window.scrollTo({ top: ratio * maxScroll, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', updateScrollbar, { passive: true });

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

  let savedScrollY = 0;

  function lockBodyScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
  }

  function openPanel() {
    // Sécurité : si la préchargée n'a pas encore eu lieu (clic ultra-rapide), on la lance
    loadFrame();
    hideTeaser({ persist: true }); // l'utilisateur a engagé : pas besoin de remontrer le teaser
    lockBodyScroll();
    panel.classList.add('is-open');
    backdrop.classList.add('is-open');
    fab.classList.add('is-hidden');
    panel.removeAttribute('inert');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    // On rapatrie d'abord le focus sur le FAB : sinon, si l'utilisateur vient
    // de cliquer le bouton ✕ (qui est dans le panneau), il garde le focus
    // pendant qu'on met aria-hidden/inert sur l'ancêtre — Chrome bloque ça
    // par accessibilité. Déplacer le focus avant lève le warning et améliore
    // la nav clavier (l'utilisateur retombe au bon endroit).
    if (panel.contains(document.activeElement)) {
      fab.focus({ preventScroll: true });
    }
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    fab.classList.remove('is-hidden');
    panel.setAttribute('inert', '');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    unlockBodyScroll();
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
