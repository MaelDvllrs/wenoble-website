document.addEventListener('DOMContentLoaded', function () {
  const SECTION_SEL  = '.scroll-section';
  const BULLETS_SEL  = '.problematique_swiper-pagination-bullet';
  const ACTIVE_CLASS = 'is-active';

  const section = document.querySelector(SECTION_SEL);
  if (!section) return;

  const bullets = Array.from(section.querySelectorAll(BULLETS_SEL));
  const total   = bullets.length;

  const swiper = new Swiper('.problematique_slider', {
    effect: 'slide',
    speed: 500,
    allowTouchMove: false,
    simulateTouch: false,
  });

  swiper.on('slideChange', function () {
    bullets.forEach((b, i) => b.classList.toggle(ACTIVE_CLASS, i === swiper.activeIndex));
  });

  bullets.forEach((b, i) => {
    b.addEventListener('click', () => swiper.slideTo(i));
  });

  function isMobile() {
    return window.innerWidth < 992;
  }

  function onScroll() {
    if (isMobile()) return;
    const rect     = section.getBoundingClientRect();
    const scrolled = -rect.top;
    const travel   = section.offsetHeight - window.innerHeight;
    let index;
    if (scrolled <= 0)           index = 0;
    else if (scrolled >= travel) index = total - 1;
    else index = Math.min(Math.floor((scrolled / travel) * total), total - 1);
    if (index !== swiper.activeIndex) swiper.slideTo(index);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});
