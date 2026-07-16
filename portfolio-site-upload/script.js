const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

let photoImages = [];
let activeImageIndex = -1;

function getPhotoImages() {
  return [...document.querySelectorAll('.photo-stills img, .project-stills img')];
}

function closeLightbox() {
  document.querySelector('.lightbox')?.remove();
  document.body.classList.remove('lightbox-open');
  activeImageIndex = -1;
}

function openLightbox(image) {
  photoImages = getPhotoImages();
  const index = photoImages.indexOf(image);
  if (index < 0) return;
  activeImageIndex = index;
  document.querySelector('.lightbox')?.remove();
  const currentImage = photoImages[activeImageIndex];
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `<button class="lightbox-close" aria-label="Close image">×</button><button class="lightbox-nav lightbox-prev" aria-label="Previous image">←</button><img src="${currentImage.src}" alt="${currentImage.alt}"><button class="lightbox-nav lightbox-next" aria-label="Next image">→</button>`;
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lightbox-prev').addEventListener('click', () => showImage(-1));
  lightbox.querySelector('.lightbox-next').addEventListener('click', () => showImage(1));
  document.body.append(lightbox);
  document.body.classList.add('lightbox-open');
}

function showImage(direction) {
  if (!photoImages.length || activeImageIndex < 0) return;
  const nextIndex = (activeImageIndex + direction + photoImages.length) % photoImages.length;
  openLightbox(photoImages[nextIndex]);
}

function prepareImages() {
  photoImages = getPhotoImages();
  photoImages.forEach((image) => {
    if (image.dataset.lightboxReady) return;
    image.dataset.lightboxReady = 'true';
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `Enlarge: ${image.alt}`);
    image.addEventListener('click', () => openLightbox(image));
    image.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') openLightbox(image); });
  });
}

async function loadGallery() {
  const gallery = document.querySelector('[data-gallery-source]');
  if (!gallery) return;
  try {
    const response = await fetch(gallery.dataset.gallerySource, { cache: 'no-store' });
    if (!response.ok) throw new Error('Gallery unavailable');
    const { images } = await response.json();
    if (!Array.isArray(images) || !images.length) return;
    gallery.innerHTML = images.map(({ image, alt = '', caption = '' }) => `<figure><img src="${image}" alt="${alt}"><figcaption>${caption}</figcaption></figure>`).join('');
  } catch (error) {
    // Existing HTML stays visible when the gallery data cannot load.
  }
  prepareImages();
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

async function loadSiteSettings() {
  if (!document.querySelector('[data-hero-line-1]')) return;
  try {
    const settings = await fetchJson('content/site.json');
    const fields = {
      '[data-hero-line-1]': settings.hero_line_1,
      '[data-hero-line-2]': settings.hero_line_2,
      '[data-film-intro]': settings.film_intro,
      '[data-photography-intro]': settings.photography_intro,
      '[data-commercial-intro]': settings.commercial_intro,
    };
    Object.entries(fields).forEach(([selector, value]) => {
      const element = document.querySelector(selector);
      if (element && value) element.textContent = value;
    });
    const email = document.querySelector('[data-contact-email]');
    if (email && settings.email) email.href = `mailto:${settings.email}`;
  } catch (error) {
    // The existing homepage remains visible if settings cannot load.
  }
}

function filmProjectCard(project) {
  const title = escapeHtml(project.title);
  const type = escapeHtml(project.type);
  const role = escapeHtml(project.role);
  const director = escapeHtml(project.director);
  const projectSlug = project.slug || project.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = encodeURIComponent(projectSlug);
  const cardClass = projectSlug === 'daughter-of-the-apsara' ? ' film-project--compact' : '';
  return `<article class="film-project${cardClass}">
    <a class="film-project-open" href="film.html?project=${slug}" aria-label="Open ${title} project">
      <img src="${escapeHtml(project.cover)}" alt="${escapeHtml(project.cover_alt || project.title)}" />
      <span>View project ↗</span>
    </a>
    <div class="project-meta">
      <h2>${title}</h2><p>${type}</p><p>${role}</p><p>${director}</p>
    </div>
  </article>`;
}

async function loadFilmProjects() {
  const grid = document.querySelector('[data-film-projects]');
  if (!grid) return;
  try {
    const { projects } = await fetchJson('content/films.json');
    if (Array.isArray(projects) && projects.length) grid.innerHTML = projects.map(filmProjectCard).join('');
  } catch (error) {
    // Existing project cards stay visible when the content file cannot load.
  }
}

async function loadFilmPage() {
  if (!document.body.matches('[data-film-page]')) return;
  const slug = new URLSearchParams(window.location.search).get('project');
  try {
    const { projects } = await fetchJson('content/films.json');
    const project = projects.find((item) => {
      const itemSlug = item.slug || item.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return itemSlug === slug;
    }) || projects[0];
    if (!project) return;
    document.title = `${project.title} — Yadi Liu`;
    document.querySelector('[data-film-type]').textContent = project.type || 'Film';
    document.querySelector('[data-film-title]').textContent = project.title;
    document.querySelector('[data-film-role]').textContent = project.role || '';
    document.querySelector('[data-film-director]').textContent = project.director || '';
    const stills = document.querySelector('[data-film-stills]');
    stills.setAttribute('aria-label', `${project.title} film stills`);
    stills.innerHTML = (project.images || []).map(({ image, alt = '', caption = '' }) => `<figure><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" /><figcaption>${escapeHtml(caption)}</figcaption></figure>`).join('');
    prepareImages();
  } catch (error) {
    document.querySelector('[data-film-title]').textContent = 'Project unavailable';
  }
}

async function loadCommercialGallery() {
  const grid = document.querySelector('[data-commercial-gallery]');
  if (!grid) return;
  try {
    const { images } = await fetchJson('content/commercial.json');
    if (!Array.isArray(images) || !images.length) return;
    grid.innerHTML = images.map(({ image, alt = '', caption = '' }, index) => `<figure class="commercial-item${index === 0 ? ' hero-commercial' : ''}"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" /><figcaption>${escapeHtml(caption)}</figcaption></figure>`).join('');
  } catch (error) {
    // Existing commercial images stay visible when the content file cannot load.
  }
}

prepareImages();
loadGallery();
loadSiteSettings();
loadFilmProjects();
loadFilmPage();
loadCommercialGallery();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') showImage(-1);
  if (event.key === 'ArrowRight') showImage(1);
});
