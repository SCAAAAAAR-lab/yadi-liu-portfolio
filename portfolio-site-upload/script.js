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

prepareImages();
loadGallery();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') showImage(-1);
  if (event.key === 'ArrowRight') showImage(1);
});
