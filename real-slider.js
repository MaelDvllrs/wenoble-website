

document.addEventListener('DOMContentLoaded', function () {
  function animateNumbers(slide) {
    const proofTexts = slide.querySelectorAll('.real_proof-text');
    proofTexts.forEach((el) => {
      const rawText = el.textContent.trim();
      const suffix = rawText.replace(/[0-9]/g, '');
      const target = parseInt(rawText, 10);
      if (isNaN(target)) return;
      const duration = 1200;
      const steps = 40;
      const interval = duration / steps;
      let current = 0;
      el.textContent = '0' + suffix;
      const timer = setInterval(() => {
        current += target / steps;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = Math.round(current) + suffix;
      }, interval);
    });
  }

  const swiper = new Swiper('.real-slider', {
    effect: 'fade',
    fadeEffect: { crossFade: true },
    loop: true,
    autoplay: {
      delay: 10000,
      disableOnInteraction: false,
    },
    navigation: {
      nextEl: '#real-next',
      prevEl: '#real-prev',
    },
    on: {
      slideChangeTransitionStart: function () {
        animateNumbers(this.slides[this.activeIndex]);
      },
      init: function () {
        animateNumbers(this.slides[this.activeIndex]);
      }
    }
  });
});
