window.addEventListener('load', () => {
  const track = document.querySelector('.bento_spin-wrap');
  const outer = document.querySelector('.bento_spin-container');

  const ITEM_H = track.querySelector('.bento_spin-slide').offsetHeight;

  // Cloner les slides pour l'effet infini
  const slides = [...track.querySelectorAll('.bento_spin-slide')];
  slides.forEach(s => track.appendChild(s.cloneNode(true)));
  slides.forEach(s => track.appendChild(s.cloneNode(true)));

  let offset = slides.length * ITEM_H;
  let velocity = 0;
  let isDragging = false;
  let lastY = 0, lastTime = 0;
  let rafId = null, isSpinning = false;

  const totalH = track.querySelectorAll('.bento_spin-slide').length * ITEM_H;

  function setOffset(v) {
    offset = ((v % totalH) + totalH) % totalH;
    if (offset < slides.length * ITEM_H * 0.4) offset += slides.length * ITEM_H;
    if (offset > totalH - slides.length * ITEM_H * 0.4) offset -= slides.length * ITEM_H;
    track.style.transform = `translateY(${-offset}px)`;
  }

  function getY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

  outer.style.cursor = 'grab';
  track.style.willChange = 'transform';

  outer.addEventListener('mousedown', e => {
    cancelAnimationFrame(rafId); isSpinning = false; isDragging = true;
    lastY = getY(e); lastTime = performance.now(); velocity = 0;
  });
  outer.addEventListener('touchstart', e => {
    cancelAnimationFrame(rafId); isSpinning = false; isDragging = true;
    lastY = getY(e); lastTime = performance.now(); velocity = 0;
  }, { passive: true });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dy = lastY - getY(e);
    const dt = performance.now() - lastTime || 1;
    velocity = dy / dt;
    setOffset(offset + dy);
    updateActive(); // ← ajout
    lastY = getY(e); lastTime = performance.now();
  });
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    const dy = lastY - getY(e);
    const dt = performance.now() - lastTime || 1;
    velocity = dy / dt;
    setOffset(offset + dy);
    lastY = getY(e); lastTime = performance.now();
  }, { passive: false });

  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    velocity *= 16;
    Math.abs(velocity) > 0.5 ? startInertia() : snapToItem();
  }

  function startInertia() {
    isSpinning = true;
    let lastTs = performance.now();
    (function loop(ts) {
      if (!isSpinning) return;
      const dt = ts - lastTs; lastTs = ts;
      velocity *= Math.pow(0.94, dt / 16);
      setOffset(offset + velocity * dt / 16);
      updateActive(); // ← ajout
      Math.abs(velocity) > 0.15
        ? (rafId = requestAnimationFrame(loop))
        : (isSpinning = false, snapToItem());
    })(performance.now());
  }

  function snapToItem() {
    const target = Math.round(offset / ITEM_H) * ITEM_H;
    const diff = target - offset;
    const startOff = offset, start = performance.now();
    (function anim(now) {
      const t = Math.min((now - start) / 300, 1);
      setOffset(startOff + diff * (1 - Math.pow(1 - t, 3)));
      t < 1 && requestAnimationFrame(anim);
    })(performance.now());
  }

  function snapToItem() {
  const target = Math.round(offset / ITEM_H) * ITEM_H;
  const diff = target - offset;
  const startOff = offset, start = performance.now();
  (function anim(now) {
    const t = Math.min((now - start) / 300, 1);
    setOffset(startOff + diff * (1 - Math.pow(1 - t, 3)));
    if (t < 1) {
      requestAnimationFrame(anim);
    } else {
      updateActive(); // ← ajout
    }
  })(performance.now());
}

	function updateActive() {
      const centerOffset = offset + (outer.offsetHeight / 2);
      const activeIndex = Math.floor(centerOffset / ITEM_H) % slides.length;
      track.querySelectorAll('.bento_spin-slide').forEach((el, i) => {
        el.classList.toggle('is-active', i % slides.length === activeIndex);
      });
    }

  setOffset(offset);
  updateActive();
});
