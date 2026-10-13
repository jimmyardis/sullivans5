/* Photography works as ordinary image links when JavaScript is unavailable. */
const lightbox = document.querySelector('.lightbox');
if (lightbox && typeof lightbox.showModal === 'function') {
  const image = lightbox.querySelector('img');
  const caption = lightbox.querySelector('figcaption');
  let opener;
  let collection = [];
  let selected = 0;
  const controls = document.createElement('div');
  controls.className = 'lightbox-controls';
  controls.innerHTML = '<button type="button" aria-label="Previous photograph">←</button><span aria-live="polite" aria-atomic="true"></span><button type="button" aria-label="Next photograph">→</button>';
  lightbox.appendChild(controls);
  const [previous, next] = controls.querySelectorAll('button');
  const position = controls.querySelector('span');
  function showPhoto(index) {
    selected = (index + collection.length) % collection.length;
    const link = collection[selected];
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    caption.textContent = image.alt;
    controls.hidden = collection.length < 2;
    position.textContent = `${selected + 1} / ${collection.length}`;
  }
  document.querySelectorAll('[data-lightbox]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      collection = link.dataset.gallery
        ? [...document.querySelectorAll('[data-lightbox]')].filter(item => item.dataset.gallery === link.dataset.gallery)
        : [link];
      showPhoto(collection.indexOf(link));
      lightbox.showModal();
    });
  });
  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
  previous.addEventListener('click', () => showPhoto(selected - 1));
  next.addEventListener('click', () => showPhoto(selected + 1));
  lightbox.addEventListener('keydown', event => {
    if (collection.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    showPhoto(selected + (event.key === 'ArrowRight' ? 1 : -1));
  });
  lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('close', () => opener?.focus());
}

const carousel = document.querySelector('.photo-carousel');
if (carousel) {
  const track = carousel.querySelector('.carousel-track');
  const slides = [...track.children];
  const previous = carousel.querySelector('.carousel-prev');
  const next = carousel.querySelector('.carousel-next');
  const position = carousel.querySelector('.carousel-position');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  carousel.querySelector('.carousel-controls').hidden = false;
  function currentIndex() {
    const left = track.getBoundingClientRect().left;
    return slides.reduce((best, slide, index) =>
      Math.abs(slide.getBoundingClientRect().left - left) < Math.abs(slides[best].getBoundingClientRect().left - left) ? index : best, 0);
  }
  function update() {
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    position.textContent = `Photograph ${currentIndex() + 1} of ${slides.length}`;
  }
  function goTo(index) {
    const slide = slides[Math.max(0, Math.min(slides.length - 1, index))];
    const offset = slide.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    track.scrollTo({ left: offset, behavior: motion.matches ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => goTo(currentIndex() - 1));
  next.addEventListener('click', () => goTo(currentIndex() + 1));
  track.addEventListener('keydown', event => {
    const targets = { ArrowLeft: currentIndex() - 1, ArrowRight: currentIndex() + 1, Home: 0, End: slides.length - 1 };
    if (!(event.key in targets)) return;
    event.preventDefault();
    goTo(targets[event.key]);
  });
  let settleTimer;
  track.addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(update, 140);
  }, { passive: true });
  new ResizeObserver(update).observe(track);
  update();
}

/* Hero excerpt: adjust these two values when a preferred cut is selected. */
const HERO_FILM = { id: 'VDt1A-Oq2Xg', start: 0, end: 30 };
const filmContainer = document.querySelector('.hero-film');
const filmToggle = document.querySelector('#film-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (filmContainer && filmToggle && !reducedMotion.matches && !navigator.connection?.saveData) {
  let player;
  let userPaused = false;
  let ready = false;
  let unavailable = false;
  const posterFallback = () => {
    unavailable = true;
    filmContainer.classList.remove('is-playing');
    filmToggle.hidden = true;
    if (ready) player.pauseVideo();
  };
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('hero-player', {
      host: 'https://www.youtube-nocookie.com',
      videoId: HERO_FILM.id,
      playerVars: { autoplay: 1, controls: 0, playsinline: 1, disablekb: 1, rel: 0, start: HERO_FILM.start, end: HERO_FILM.end, origin: window.location.origin },
      events: {
        onReady(event) {
          ready = true;
          const frame = event.target.getIframe();
          frame.title = 'Fort Sullivan aerial film';
          frame.tabIndex = -1;
          frame.setAttribute('aria-hidden', 'true');
          event.target.mute();
          if (!unavailable && !reducedMotion.matches) event.target.playVideo();
        },
        onStateChange(event) {
          if (unavailable) return;
          if (event.data === YT.PlayerState.PLAYING) {
            filmContainer.classList.add('is-playing');
            filmToggle.hidden = false;
            filmToggle.textContent = 'Pause film';
          }
          if (event.data === YT.PlayerState.ENDED && !userPaused) {
            player.loadVideoById({ videoId: HERO_FILM.id, startSeconds: HERO_FILM.start, endSeconds: HERO_FILM.end });
          }
        },
        onError: posterFallback,
        onAutoplayBlocked: posterFallback
      }
    });
  };
  filmToggle.addEventListener('click', () => {
    if (!ready) return;
    userPaused = !userPaused;
    if (userPaused) {
      player.pauseVideo();
      filmToggle.textContent = 'Play film';
    } else {
      player.playVideo();
      filmToggle.textContent = 'Pause film';
    }
  });
  reducedMotion.addEventListener('change', event => { if (event.matches) posterFallback(); });
  document.addEventListener('visibilitychange', () => {
    if (!ready || unavailable) return;
    if (document.hidden) player.pauseVideo();
    else if (!userPaused) player.playVideo();
  });
  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  script.async = true;
  script.onerror = posterFallback;
  document.head.appendChild(script);
}
