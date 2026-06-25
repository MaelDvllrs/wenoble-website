(function () {
  const GAP_PCT = 1;
  const DURATION = 850;
  const INTERRUPT_THRESHOLD = 0;
  const WIDTH_MAP_DESKTOP = [63, 15, 8, 5, 1, 1, 1];
  const WIDTH_MAP_MOBILE  = [63, 22, 9, 5]; // 4 slides
  const MOBILE_BP = 992;
  const getWidthMap = () => (window.innerWidth <= MOBILE_BP ? WIDTH_MAP_MOBILE : WIDTH_MAP_DESKTOP);
  const ACTIVE_HOVER_SCALE = 1.05; // 5% pour la slide active
  const MAX_SMALL_SCALE = 1.40; // 40% max pour les petites slides

  const container = document.querySelector('.swiper-v5');
  const originalSlideEls = Array.from(container.querySelectorAll('.swiper-v5-slide'));

  // ── TOTAL dynamique : supporte n'importe quel nombre de slides (>= 2) ────
  const TOTAL = originalSlideEls.length;
  if (TOTAL < 2) return;

  const POOL = TOTAL * 3;
  const PIVOT = TOTAL;

  let slides = [];
  let animating = false;
  let animationStartTime = 0;
  let normalizeTimer = null;
  let pendingNavigation = null;
  let hoveredSlideIndex = null;

  // ── Cache du contenu source (box + info) ─────────────────────────────────
  const contentCache = originalSlideEls.map((el) => ({
    box:  el.querySelector('.swiper-v5-box'),
    info: el.querySelector('.swiper-v5-info'),
  }));

  // ── Build initial pool ───────────────────────────────────────────────────
  function makeSlide(originalIdx) {
    const el = originalSlideEls[originalIdx].cloneNode(true);
    el.dataset.originalIndex = originalIdx;
    el.style.transition = 'none';
    el.style.position   = 'absolute';
    container.appendChild(el);
    return {
      originalIdx,
      el,
      box:  el.querySelector('.swiper-v5-box'),
      info: el.querySelector('.swiper-v5-info'),
    };
  }

  function buildPool() {
    container.innerHTML = '';
    slides = [];
    for (let i = 0; i < POOL; i++) {
      const dist = i - PIVOT;
      const originalIdx = ((dist % TOTAL) + TOTAL) % TOTAL;
      slides.push(makeSlide(originalIdx));
    }
  }

  // ── Width helpers ────────────────────────────────────────────────────────
  function getWidthPct(distFromActive) {
    const map = getWidthMap();
    if (distFromActive < 0) return 1;
    if (distFromActive < map.length) return map[distFromActive];
    return 1;
  }

  // ── Layout avec gestion du hover améliorée ───────────────────────────────
  function computeLayout(hoverIdx = null) {
    const W = container.offsetWidth;
    const GAP = (GAP_PCT / 100) * W;

    // Calculer les largeurs de base
    const baseWidths = slides.map((_, i) => (getWidthPct(i - PIVOT) / 100) * W);

    let widths = [...baseWidths];

    if (hoverIdx !== null && hoverIdx >= 0 && hoverIdx < POOL) {
      const distFromActive = hoverIdx - PIVOT;

      // SLIDE ACTIVE (PIVOT) au hover
      if (hoverIdx === PIVOT) {
        const baseWidth = baseWidths[PIVOT];
        const extraWidth = baseWidth * (ACTIVE_HOVER_SCALE - 1);
        widths[PIVOT] = baseWidth + extraWidth;

        // Compenser sur les slides 1, 2, 3, 4 (à droite de l'active)
        const compensationSlides = [];
        for (let i = PIVOT + 1; i <= PIVOT + 4; i++) {
          if (i < POOL) {
            const pct = getWidthPct(i - PIVOT);
            if (pct > 1) {
              compensationSlides.push({
                idx: i,
                width: baseWidths[i],
                pct: pct
              });
            }
          }
        }

        if (compensationSlides.length > 0) {
          const totalWidth = compensationSlides.reduce((sum, s) => sum + s.width, 0);
          compensationSlides.forEach(slide => {
            const ratio = slide.width / totalWidth;
            const loss = extraWidth * ratio;
            widths[slide.idx] = Math.max(
              baseWidths[slide.idx] - loss,
              baseWidths[slide.idx] * 0.85
            );
          });
        }
      }
      // SLIDES À DROITE de l'active (positions 1, 2, 3, et petites à 1%)
      else if (distFromActive > 0) {
        const basePct = getWidthPct(distFromActive);
        const baseWidth = baseWidths[hoverIdx];

        // Pour les petites slides à 1%, augmenter jusqu'à 40%
        if (basePct === 1) {
          const extraWidth = baseWidth * (MAX_SMALL_SCALE - 1);
          widths[hoverIdx] = baseWidth + extraWidth;

          // Compenser sur TOUTES les slides visibles sauf celle survolée
          const compensationSlides = [];

          // Inclure la slide active
          compensationSlides.push({
            idx: PIVOT,
            width: baseWidths[PIVOT],
            pct: getWidthPct(0),
            priority: 1 // Plus haute priorité
          });

          // Inclure les slides 1, 2, 3 (sauf si c'est celle survolée)
          for (let i = PIVOT + 1; i <= PIVOT + 3; i++) {
            if (i !== hoverIdx && i < POOL) {
              const pct = getWidthPct(i - PIVOT);
              if (pct > 1) {
                compensationSlides.push({
                  idx: i,
                  width: baseWidths[i],
                  pct: pct,
                  priority: 2
                });
              }
            }
          }

          if (compensationSlides.length > 0) {
            const totalWidth = compensationSlides.reduce((sum, s) => sum + s.width, 0);
            compensationSlides.forEach(slide => {
              const ratio = slide.width / totalWidth;
              const loss = extraWidth * ratio;
              widths[slide.idx] = Math.max(
                baseWidths[slide.idx] - loss,
                baseWidths[slide.idx] * 0.80
              );
            });
          }
        }
        // Pour les slides moyennes (15%, 8%, 5%), augmenter proportionnellement
        else {
          const scaleAmount = 1 + ((MAX_SMALL_SCALE - 1) * (1 - basePct / getWidthMap()[0]));
          const cappedScale = Math.min(scaleAmount, MAX_SMALL_SCALE);
          const extraWidth = baseWidth * (cappedScale - 1);
          widths[hoverIdx] = baseWidth + extraWidth;

          // Compenser sur les slides visibles (active + 1,2,3) sauf celle survolée
          const compensationSlides = [];

          // Slide active
          compensationSlides.push({
            idx: PIVOT,
            width: baseWidths[PIVOT],
            pct: getWidthPct(0)
          });

          // Slides 1, 2, 3
          for (let i = PIVOT + 1; i <= PIVOT + 3; i++) {
            if (i !== hoverIdx && i < POOL) {
              const pct = getWidthPct(i - PIVOT);
              if (pct > 1) {
                compensationSlides.push({
                  idx: i,
                  width: baseWidths[i],
                  pct: pct
                });
              }
            }
          }

          if (compensationSlides.length > 0) {
            const totalWidth = compensationSlides.reduce((sum, s) => sum + s.width, 0);
            compensationSlides.forEach(slide => {
              const ratio = slide.width / totalWidth;
              const loss = extraWidth * ratio;
              widths[slide.idx] = Math.max(
                baseWidths[slide.idx] - loss,
                baseWidths[slide.idx] * 0.85
              );
            });
          }
        }
      }
    }

    // Calculer les positions left - PIVOT reste toujours à 0
    const lefts = new Array(POOL);
    lefts[PIVOT] = 0;

    // Calcul vers la droite
    let c = 0;
    for (let i = PIVOT; i < POOL - 1; i++) {
      c += widths[i] + GAP;
      lefts[i + 1] = c;
    }

    // Calcul vers la gauche
    c = 0;
    for (let i = PIVOT; i > 0; i--) {
      c -= widths[i - 1] + GAP;
      lefts[i - 1] = c;
    }

    return { widths, lefts };
  }

  function applyInstant() {
    const { widths, lefts } = computeLayout();
    for (let i = 0; i < POOL; i++) {
      slides[i].el.style.transition = 'none';
      slides[i].el.style.width = widths[i] + 'px';
      slides[i].el.style.left  = lefts[i]  + 'px';
      slides[i].el.style.top   = '0px';
    }
  }

  function applyAnimated(duration) {
    const easing = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
    const { widths, lefts } = computeLayout(hoveredSlideIndex);
    for (let i = 0; i < POOL; i++) {
      slides[i].el.style.transition = `width ${duration}ms ${easing}, left ${duration}ms ${easing}`;
      slides[i].el.style.width = widths[i] + 'px';
      slides[i].el.style.left  = lefts[i]  + 'px';
    }
    return duration;
  }

  // ── Hover smooth animation ──────────────────────────────────────────────
  function applyHoverLayout() {
    const easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    const hoverDuration = 400;
    const { widths, lefts } = computeLayout(hoveredSlideIndex);

    for (let i = 0; i < POOL; i++) {
      slides[i].el.style.transition = `width ${hoverDuration}ms ${easing}, left ${hoverDuration}ms ${easing}`;
      slides[i].el.style.width = widths[i] + 'px';
      slides[i].el.style.left  = lefts[i]  + 'px';
    }
  }

  // ── Active class ─────────────────────────────────────────────────────────
  function updateActive() {
    slides.forEach(s => s.el.classList.remove('is-active'));
    slides[PIVOT].el.classList.add('is-active');
  }

  // ── Snap current positions ───────────────────────────────────────────────
  function snapCurrentPositions() {
    const cRect = container.getBoundingClientRect();
    for (let i = 0; i < POOL; i++) {
      const r = slides[i].el.getBoundingClientRect();
      slides[i].el.style.transition = 'none';
      slides[i].el.style.left  = (r.left - cRect.left) + 'px';
      slides[i].el.style.width = r.width + 'px';
    }
  }

  // ── Recycle pool ─────────────────────────────────────────────────────────
  function recyclePool(direction) {
    if (direction === 1) {
      const recycled = slides.pop();
      const newHeadOriginalIdx = ((slides[0].originalIdx - 1) % TOTAL + TOTAL) % TOTAL;
      recycled.originalIdx = newHeadOriginalIdx;
      recycled.el.dataset.originalIndex = newHeadOriginalIdx;
      syncSlideContent(recycled);
      slides.unshift(recycled);
    } else {
      const recycled = slides.shift();
      const newTailOriginalIdx = (slides[slides.length - 1].originalIdx + 1) % TOTAL;
      recycled.originalIdx = newTailOriginalIdx;
      recycled.el.dataset.originalIndex = newTailOriginalIdx;
      syncSlideContent(recycled);
      slides.push(recycled);
    }
  }

  function syncSlideContent(slide) {
    const src = contentCache[slide.originalIdx];
    if (slide.box && src.box) {
      slide.box.innerHTML = src.box.innerHTML;
    }
    if (slide.info && src.info) {
      slide.info.innerHTML = src.info.innerHTML;
    }
  }

  // ── Navigate direct ──────────────────────────────────────────────────────
  function navigateDirect(steps, direction, interruptEarly = false) {
    if (interruptEarly) {
      snapCurrentPositions();
    }

    hoveredSlideIndex = null;
    animating = true;
    animationStartTime = Date.now();

    for (let i = 0; i < steps; i++) {
      recyclePool(direction);
    }

    const { lefts, widths } = computeLayout(hoveredSlideIndex);

    if (direction === 1) {
      for (let i = 0; i < steps; i++) {
        slides[i].el.style.transition = 'none';
        slides[i].el.style.width = widths[i] + 'px';
        slides[i].el.style.left  = lefts[i]  + 'px';
      }
    } else {
      for (let i = 0; i < steps; i++) {
        const idx = POOL - 1 - i;
        slides[idx].el.style.transition = 'none';
        slides[idx].el.style.width = widths[idx] + 'px';
        slides[idx].el.style.left  = lefts[idx]  + 'px';
      }
    }

    updateActive();
    updateInfo();

    requestAnimationFrame(() => {
      const dur = interruptEarly ? DURATION * 0.5 : DURATION;
      applyAnimated(dur);
      scheduleEnd(dur);
    });
  }

  function scheduleEnd(dur) {
    clearTimeout(normalizeTimer);
    normalizeTimer = setTimeout(() => {
      animating = false;
      if (pendingNavigation) {
        const pending = pendingNavigation;
        pendingNavigation = null;
        navigateDirect(pending.steps, pending.direction, false);
      }
    }, dur);
  }

  // ── Gestion des clicks multiples ─────────────────────────────────────────
  function handleNavigation(steps, direction) {
    if (!animating) {
      navigateDirect(steps, direction, false);
      return;
    }

    const elapsed = Date.now() - animationStartTime;
    const progress = elapsed / DURATION;

    if (progress >= INTERRUPT_THRESHOLD) {
      clearTimeout(normalizeTimer);

      if (pendingNavigation && pendingNavigation.direction === direction) {
        steps += pendingNavigation.steps;
      }

      pendingNavigation = null;
      navigateDirect(steps, direction, true);
    } else {
      if (pendingNavigation) {
        if (pendingNavigation.direction === direction) {
          pendingNavigation.steps += steps;
        } else {
          pendingNavigation = { steps, direction };
        }
      } else {
        pendingNavigation = { steps, direction };
      }
    }
  }

  // ── Hover handlers ───────────────────────────────────────────────────────
  function handleMouseEnter(e) {
    if (animating) return;

    const slideEl = e.target.closest('.swiper-v5-slide');
    if (!slideEl) return;

    const idx = slides.findIndex(s => s.el === slideEl);
    if (idx === -1) return;

    hoveredSlideIndex = idx;
    applyHoverLayout();
  }

  function handleMouseLeave(e) {
    if (animating) return;
    if (hoveredSlideIndex === null) return;

    hoveredSlideIndex = null;
    applyHoverLayout();
  }

  // ── Event listeners ──────────────────────────────────────────────────────
  container.addEventListener('click', (e) => {
    const slideEl = e.target.closest('.swiper-v5-slide');
    if (!slideEl) return;

    const clickedIdx = slides.findIndex(s => s.el === slideEl);
    if (clickedIdx === -1 || clickedIdx === PIVOT) return;

    const dist = clickedIdx - PIVOT;
    if (dist === 0) return;

    const direction = dist > 0 ? -1 : 1;
    const steps = Math.abs(dist);

    handleNavigation(steps, direction);
  });

  container.addEventListener('mouseenter', handleMouseEnter, true);
  container.addEventListener('mouseleave', handleMouseLeave, true);

  // ── Boutons prev/next ────────────────────────────────────────────────────
  const prevBtn = document.querySelector('.swiper-v5-prev');
  const nextBtn = document.querySelector('.swiper-v5-next');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      handleNavigation(1, 1); // Direction 1 = vers la gauche (slide précédente)
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      handleNavigation(1, -1); // Direction -1 = vers la droite (slide suivante)
    });
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyInstant, 100);
  });

  // ── Panneau d'info externe, sous le slider ────────────────────────────────
  const infoPanel = document.createElement('div');
  infoPanel.className = 'swiper-v5-info';
  container.insertAdjacentElement('afterend', infoPanel);

  let infoFadeTimer = null;
  function updateInfo(immediate = false) {
    const activeInfo = slides[PIVOT].info;
    if (!activeInfo) return;

    if (immediate) {
      infoPanel.innerHTML = activeInfo.innerHTML;
      infoPanel.classList.add('is-visible');
      return;
    }

    clearTimeout(infoFadeTimer);
    infoPanel.classList.remove('is-visible');
    infoFadeTimer = setTimeout(() => {
      infoPanel.innerHTML = activeInfo.innerHTML;
      infoPanel.classList.add('is-visible');
    }, 200);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  buildPool();
  applyInstant();
  updateActive();
  updateInfo(true);

})();