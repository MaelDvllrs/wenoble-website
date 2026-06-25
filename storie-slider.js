window.addEventListener('load', function () {
  var DURATION = 4000;

  document.querySelector('.stories_card-swiper').classList.add('swiper-wrapper');
  document.querySelectorAll('.stories_card-slide').forEach(function(el){
    el.classList.add('swiper-slide');
  });

  var swiper = new Swiper('.stories_card', {
    effect: 'cube',
    speed: 600,
    loop: false,
    allowTouchMove: true,
    cubeEffect: {
      shadow: false,
      slideShadows: false,
    }
  });

  var bullets = document.querySelectorAll('.stories_card-pagination-bullet');
  var bgs = document.querySelectorAll('.stories_card-pagination-bullet-bg');
  var total = bullets.length;
  var currentIndex = 0;
  var startTime = null;
  var raf = null;

  function resetAll() {
    bullets.forEach(function(b) { b.classList.remove('is-done'); });
    bgs.forEach(function(bg) { bg.style.width = '0%'; bg.style.transition = 'none'; });
  }

  function tick(ts) {
    if (!startTime) startTime = ts;
    var elapsed = ts - startTime;
    var progress = Math.min(elapsed / DURATION, 1);
    bgs[currentIndex].style.transition = 'none';
    bgs[currentIndex].style.width = (progress * 100) + '%';
    if (progress < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      bullets[currentIndex].classList.add('is-done');
      if (currentIndex < total - 1) swiper.slideNext();
    }
  }

  function startProgress(idx) {
    cancelAnimationFrame(raf);
    startTime = null;
    currentIndex = idx;
    bgs[idx].style.transition = 'none';
    bgs[idx].style.width = '0%';
    raf = requestAnimationFrame(tick);
  }

  swiper.on('slideChange', function() {
    var idx = swiper.activeIndex;
    bullets.forEach(function(b, i) {
      i < idx ? b.classList.add('is-done') : b.classList.remove('is-done');
    });
    bgs.forEach(function(bg, i) {
      if (i < idx) bg.style.width = '100%';
      else if (i > idx) bg.style.width = '0%';
    });
    var title = document.querySelector('.stories_card-title.is-small');
    if (title) title.textContent = 'Valeur Wenoble ' + (idx + 1) + '/' + total;
    startProgress(idx);
  });

  resetAll();
  startProgress(0);
});
