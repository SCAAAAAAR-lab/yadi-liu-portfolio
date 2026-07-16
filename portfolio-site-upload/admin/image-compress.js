(() => {
  const MAX_EDGE = 2600;
  const TARGET_BYTES = 3.5 * 1024 * 1024;
  const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  function showStatus(message) {
    let status = document.getElementById('upload-compression-status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'upload-compression-status';
      status.setAttribute('role', 'status');
      status.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:99999;padding:13px 17px;background:#20282c;color:#fff;border-radius:4px;font:600 13px/1.4 Arial,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.24)';
      document.body.appendChild(status);
    }
    status.textContent = message;
    status.hidden = false;
    return status;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('The image could not be opened.'));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Compression failed.')), 'image/jpeg', quality);
    });
  }

  async function compressImage(file) {
    if (!SUPPORTED_TYPES.has(file.type)) return file;
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale === 1 && file.size <= TARGET_BYTES) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.86;
    let blob = await canvasToBlob(canvas, quality);
    while (blob.size > TARGET_BYTES && quality > 0.62) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, quality);
    }

    if (blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
  }

  document.addEventListener('change', async (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.length) return;
    if (input.dataset.compressionComplete === 'true') {
      delete input.dataset.compressionComplete;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const originalFiles = [...input.files];
    const status = showStatus(originalFiles.length > 1 ? `正在压缩 ${originalFiles.length} 张照片…` : '正在压缩照片…');
    try {
      const files = [];
      for (const file of originalFiles) files.push(await compressImage(file));
      const transfer = new DataTransfer();
      files.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      status.textContent = '压缩完成，正在上传…';
    } catch (error) {
      status.textContent = '无法压缩，将尝试上传原图…';
    }

    input.dataset.compressionComplete = 'true';
    setTimeout(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => { status.hidden = true; }, 1800);
    }, 50);
  }, true);
})();
