(() => {
  const samplePhotos = {
    "Noise-canceling headphones": { src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82", emoji: "🎧" },
    "Healthy monstera plant": { src: "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=82", emoji: "🪴" },
    "Classic 35mm camera": { src: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=82", emoji: "📷" },
    "Everyday canvas sneakers": { src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=82", emoji: "👟" },
    "Compact turntable": { src: "https://images.unsplash.com/photo-1461360228754-6e81c478b882?auto=format&fit=crop&w=900&q=82", emoji: "🎵" },
    "Ceramic table lamp": { src: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=82", emoji: "💡" },
    "Weekend travel bag": { src: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=82", emoji: "👜" },
    "Complete skateboard": { src: "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=900&q=82", emoji: "🛹" }
  };

  const style = document.createElement("style");
  style.textContent = `
    .listing-image{position:relative;overflow:hidden}
    .listing-image img{display:block;width:100%;height:100%;object-fit:cover;font-size:0!important;color:transparent!important;line-height:0!important}
    .listing-image-fallback{width:100%;height:100%;display:grid;place-items:center;font-size:4rem;line-height:1;background:var(--card-bg,#eee)}
    .photo-preview{grid-template-columns:repeat(auto-fill,minmax(72px,84px))!important;justify-content:start!important;align-items:start}
    .photo-preview img{width:84px!important;height:84px!important;aspect-ratio:1!important;object-fit:cover}
    .photo-preview .photo-count{grid-column:1/-1;width:100%}
    @media(max-width:480px){
      .photo-preview{grid-template-columns:repeat(auto-fill,minmax(68px,76px))!important}
      .photo-preview img{width:76px!important;height:76px!important}
    }
  `;
  document.head.appendChild(style);

  const categoryEmoji = category => ({ Tech: "💻", Home: "🏠", Style: "👕", Hobbies: "🎨", Other: "📦" })[category] || "📦";

  const fallbackForCard = card => {
    const title = card.querySelector("h3")?.textContent?.trim() || "";
    const category = card.querySelector(".listing-category")?.textContent?.trim() || "";
    return samplePhotos[title]?.emoji || categoryEmoji(category);
  };

  const showFallback = (card, holder) => {
    holder.innerHTML = `<span class="listing-image-fallback" aria-hidden="true">${fallbackForCard(card)}</span>`;
  };

  const watchImage = (img, card, holder) => {
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.addEventListener("error", () => showFallback(card, holder), { once: true });
    if (img.complete && img.naturalWidth === 0) showFallback(card, holder);
  };

  const repairCard = card => {
    const holder = card.querySelector(".listing-image");
    if (!holder) return;
    const title = card.querySelector("h3")?.textContent?.trim() || "";
    let img = holder.querySelector("img");

    if (!img && samplePhotos[title]) {
      holder.innerHTML = "";
      img = document.createElement("img");
      img.src = samplePhotos[title].src;
      img.loading = "lazy";
      holder.appendChild(img);
    }

    if (img) watchImage(img, card, holder);
  };

  const repairAll = () => document.querySelectorAll("#listingGrid .listing-card").forEach(repairCard);

  const grid = document.querySelector("#listingGrid");
  if (!grid) return;
  repairAll();

  const observer = new MutationObserver(() => repairAll());
  observer.observe(grid, { childList: true, subtree: true });

  const photoViewer = document.createElement("dialog");
  photoViewer.className = "photo-lightbox";
  photoViewer.setAttribute("aria-label", "Item photo viewer");
  photoViewer.innerHTML = `
    <button class="photo-lightbox-close" type="button" aria-label="Close photo">×</button>
    <img alt="">
  `;
  document.body.appendChild(photoViewer);

  const viewerStyle = document.createElement("style");
  viewerStyle.textContent = `
    .photo-lightbox{width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:48px 18px 18px;border:0;border-radius:0;background:#fff}
    .photo-lightbox::backdrop{background:rgba(24,20,43,.82)}
    .photo-lightbox img{width:100%;height:100%;display:block;object-fit:contain;object-position:center;background:#fff}
    .photo-lightbox-close{position:fixed;right:18px;top:14px;z-index:2;width:42px;height:42px;border:0;border-radius:50%;background:var(--ink);color:#fff;font-size:1.75rem;line-height:1;cursor:pointer}
  `;
  document.head.appendChild(viewerStyle);

  grid.addEventListener("click", event => {
    const image = event.target.closest(".listing-image img");
    if (!image) return;
    event.preventDefault();
    event.stopPropagation();
    const viewerImage = photoViewer.querySelector("img");
    viewerImage.src = image.currentSrc || image.src;
    viewerImage.alt = image.closest(".listing-card")?.querySelector("h3")?.textContent?.trim() || "Item photo";
    photoViewer.showModal();
  }, true);

  photoViewer.querySelector(".photo-lightbox-close").addEventListener("click", () => photoViewer.close());
  photoViewer.addEventListener("click", event => {
    if (event.target === photoViewer) photoViewer.close();
  });
})();


(() => {
  const MAX_EDGE = 1280;
  const TARGET_BYTES = 900 * 1024;
  const HARD_UPLOAD_LIMIT = 1.5 * 1024 * 1024;
  let compressionPromise = null;
  let compressionError = null;
  let allowingResubmit = false;

  const selectedInput = () => {
    const camera = document.querySelector("#cameraInput");
    const gallery = document.querySelector("#photoInput");
    if (camera?.files?.length) return camera;
    if (gallery?.files?.length) return gallery;
    return null;
  };

  const decodeImage = async file => {
    if ("createImageBitmap" in window) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        return {
          width: bitmap.width,
          height: bitmap.height,
          draw: (ctx, width, height) => ctx.drawImage(bitmap, 0, 0, width, height),
          close: () => bitmap.close()
        };
      } catch {}
    }

    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("This photo format cannot be resized. Please choose a JPG, PNG, or WebP photo."));
        img.src = url;
      });
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        draw: (ctx, width, height) => ctx.drawImage(image, 0, 0, width, height),
        close: () => {}
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const canvasToBlob = (canvas, quality) => new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Flipora could not optimize this photo.")), "image/jpeg", quality);
  });

  const optimizePhoto = async file => {
    if (!file?.type?.startsWith("image/")) throw new Error("Choose an image file for your listing photo.");
    if (file.size <= TARGET_BYTES && !/image\/(heic|heif)/i.test(file.type)) return file;

    let decoded;
    try {
      decoded = await decodeImage(file);
    } catch (error) {
      if (file.size <= HARD_UPLOAD_LIMIT) return file;
      throw error;
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    decoded.draw(ctx, width, height);
    decoded.close();

    let blob = await canvasToBlob(canvas, 0.78);
    for (const quality of [0.68, 0.58, 0.50, 0.42]) {
      if (blob.size <= TARGET_BYTES) break;
      blob = await canvasToBlob(canvas, quality);
    }
    canvas.width = 1;
    canvas.height = 1;

    if (blob.size > HARD_UPLOAD_LIMIT) throw new Error("This photo is still too large after resizing. Please choose a different photo.");
    const baseName = (file.name || "listing-photo").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-") || "listing-photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  };

  const optimizeInput = async input => {
    const files = [...(input?.files || [])].slice(0, 6);
    if (!files.length) return;
    const optimized = [];
    for (const file of files) optimized.push(await optimizePhoto(file));
    const transfer = new DataTransfer();
    optimized.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
    input.dataset.fliporaOptimized = "true";
    if (typeof renderPhotoPreview === "function") renderPhotoPreview();
  };

  document.addEventListener("change", event => {
    const input = event.target.closest?.("#photoInput, #cameraInput");
    if (!input || !input.files?.length) return;
    input.dataset.fliporaOptimized = "false";
    compressionError = null;
    compressionPromise = optimizeInput(input).catch(error => {
      input.dataset.fliporaOptimized = "error";
      compressionError = error;
    });
  }, true);

  document.addEventListener("submit", event => {
    const form = event.target.closest?.("#sellForm");
    if (!form || allowingResubmit) return;
    const input = selectedInput();
    if (!input?.files?.length || input.dataset.fliporaOptimized === "true") return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const submit = form.querySelector('[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Optimizing photos…";
    }

    (compressionPromise || optimizeInput(input))
      .then(() => {
        if (compressionError) throw compressionError;
        compressionPromise = null;
        compressionError = null;
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Publish listing";
        }
        allowingResubmit = true;
        if (submit) form.requestSubmit(submit);
        else form.requestSubmit();
        allowingResubmit = false;
      })
      .catch(error => {
        compressionPromise = null;
        compressionError = null;
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Publish listing";
        }
        if (typeof showToast === "function") showToast(error.message || "Flipora could not optimize this photo.");
      });
  }, true);
})();


(() => {
  const photoInput = document.querySelector("#photoInput");
  const cameraInput = document.querySelector("#cameraInput");
  const photoPreview = document.querySelector("#photoPreview");
  if (!photoInput || !cameraInput || !photoPreview) return;

  const previewStyle = document.createElement("style");
  previewStyle.textContent = `
    .photo-preview{grid-template-columns:repeat(auto-fill,62px)!important;gap:10px!important;align-items:start!important}
    .photo-preview .photo-preview-item{position:relative;width:62px;height:62px;border-radius:10px;overflow:visible}
    .photo-preview .photo-preview-item img{display:block;width:62px!important;height:62px!important;aspect-ratio:1!important;border-radius:10px;object-fit:cover}
    .photo-preview .photo-remove{position:absolute;top:-7px;right:-7px;display:grid;place-items:center;width:23px;height:23px;padding:0;border:2px solid #fff;border-radius:999px;background:#222;color:#fff;font-size:16px;font-weight:800;line-height:1;cursor:pointer;box-shadow:0 2px 7px rgba(0,0,0,.25);z-index:2}
    .photo-preview .photo-remove:focus-visible{outline:3px solid #6d5dfc;outline-offset:2px}
    .photo-preview .photo-count,.photo-preview .photo-help{grid-column:1/-1;width:100%;margin:2px 0 0}
    @media(max-width:480px){
      .photo-preview{grid-template-columns:repeat(auto-fill,54px)!important;gap:9px!important}
      .photo-preview .photo-preview-item{width:54px;height:54px}
      .photo-preview .photo-preview-item img{width:54px!important;height:54px!important}
      .photo-preview .photo-remove{top:-6px;right:-6px;width:22px;height:22px;font-size:15px}
    }
  `;
  document.head.appendChild(previewStyle);

  let previewUrls = [];
  const releasePreviewUrls = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
  };

  const activeInput = () => cameraInput.files.length ? cameraInput : photoInput.files.length ? photoInput : null;

  window.renderPhotoPreview = function renderPhotoPreviewWithRemove() {
    releasePreviewUrls();
    const input = activeInput();
    const files = [...(input?.files || [])].slice(0, 6);
    if (!files.length) {
      photoPreview.innerHTML = '<p class="photo-help">Take a new photo or choose up to 6 from your gallery or files.</p>';
      return;
    }

    const thumbnails = files.map((file, index) => {
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      return `<div class="photo-preview-item"><img src="${url}" alt="Selected item photo ${index + 1}"><button class="photo-remove" type="button" data-remove-photo="${index}" aria-label="Remove photo ${index + 1}" title="Remove photo">×</button></div>`;
    }).join("");
    photoPreview.innerHTML = `${thumbnails}<p class="photo-count">${files.length} of 6 photos selected · Tap × to remove</p>`;
  };

  photoPreview.addEventListener("click", event => {
    const removeButton = event.target.closest("[data-remove-photo]");
    if (!removeButton) return;
    event.preventDefault();
    event.stopPropagation();

    const input = activeInput();
    if (!input) return;
    const removeIndex = Number(removeButton.dataset.removePhoto);
    const remaining = [...input.files].filter((_, index) => index !== removeIndex);
    const transfer = new DataTransfer();
    remaining.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
    if (!remaining.length) {
      delete input.dataset.fliporaOptimized;
    }
    window.renderPhotoPreview();
  });

  const sellForm = document.querySelector("#sellForm");
  sellForm?.addEventListener("reset", () => {
    window.setTimeout(() => {
      releasePreviewUrls();
      window.renderPhotoPreview();
    }, 0);
  });
})();
