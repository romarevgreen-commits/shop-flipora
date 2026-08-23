(() => {
  const style = document.createElement('style');
  style.textContent = `
    .photo-action-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:-6px}
    .remove-photo-button{border:1px solid #d92d20;background:#fff;color:#b42318;border-radius:10px;padding:9px 13px;font-weight:800;cursor:pointer}
    .remove-photo-button:hover{background:#fff1f0}
    .remove-photo-button[hidden]{display:none!important}
    .photo-action-hint{font-size:.75rem;color:var(--muted)}
    .hero-art .float-card{overflow:hidden;padding:0;gap:0}
    .hero-art .sold-photo{height:112px;position:relative;overflow:hidden;background:#eee}
    .hero-art .sold-photo img{width:100%;height:100%;display:block;object-fit:cover}
    .hero-art .sold-badge{position:absolute;left:9px;top:9px;background:var(--ink);color:#fff;border-radius:999px;padding:5px 8px;font-size:.62rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
    .hero-art .sold-card-copy{display:grid;gap:4px;padding:12px 14px 14px;background:#fff}
    .hero-art .sold-card-copy strong{font-size:.9rem;line-height:1.1}
    .hero-art .sold-card-copy small{font-weight:950;color:var(--purple)}
    .sold-showcase-label{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-2deg);margin:0;color:rgba(255,255,255,.9);font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;text-align:center;max-width:180px}
    .hero-art .orbit{font-size:.78rem;text-align:center;line-height:1.05}
    @media(max-width:560px){.hero-art .sold-photo{height:88px}.photo-action-row{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  const heroArt = document.querySelector('.hero-art');
  if (heroArt) {
    heroArt.setAttribute('aria-label', 'Sample sold-item showcase');
    heroArt.innerHTML = `
      <p class="sold-showcase-label">Sample sold-item showcase</p>
      <div class="float-card card-one">
        <div class="sold-photo">
          <img src="https://images.unsplash.com/photo-1674658556545-f18d4080ab6c?auto=format&fit=crop&w=600&q=80" alt="Black wireless headphones" loading="eager">
          <span class="sold-badge">Sold</span>
        </div>
        <div class="sold-card-copy"><strong>Wireless headphones</strong><small>$48</small></div>
      </div>
      <div class="float-card card-two">
        <div class="sold-photo">
          <img src="https://images.unsplash.com/photo-1775457114571-ecc5cedd7ebb?auto=format&fit=crop&w=600&q=80" alt="Green monstera houseplant" loading="eager">
          <span class="sold-badge">Sold</span>
        </div>
        <div class="sold-card-copy"><strong>Monstera plant</strong><small>$22</small></div>
      </div>
      <div class="float-card card-three">
        <div class="sold-photo">
          <img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80" alt="Vintage camera" loading="eager">
          <span class="sold-badge">Sold</span>
        </div>
        <div class="sold-card-copy"><strong>Vintage camera</strong><small>$95</small></div>
      </div>
      <div class="orbit">sold<br>fast!</div>
    `;
  }

  const photoInput = document.querySelector('#photoInput');
  const photoPreview = document.querySelector('#photoPreview');
  const sellForm = document.querySelector('#sellForm');
  if (!photoInput || !photoPreview) return;

  const actionRow = document.createElement('div');
  actionRow.className = 'photo-action-row';
  actionRow.innerHTML = `
    <button class="remove-photo-button" id="removePhotoButton" type="button" hidden>Delete photo</button>
    <span class="photo-action-hint">Wrong photo? Delete it and choose another.</span>
  `;
  photoPreview.after(actionRow);

  const removeButton = actionRow.querySelector('#removePhotoButton');
  let previewBlobUrl = null;

  const clearPreview = () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    previewBlobUrl = null;
    photoInput.value = '';
    photoPreview.innerHTML = '<p>Tap above to take photos or choose them from your gallery.</p>';
    removeButton.hidden = true;
  };

  photoInput.addEventListener('change', () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    const img = photoPreview.querySelector('img');
    previewBlobUrl = img && img.src.startsWith('blob:') ? img.src : null;
    removeButton.hidden = !photoInput.files?.length;
  });

  removeButton.addEventListener('click', clearPreview);
  sellForm?.addEventListener('reset', () => {
    window.setTimeout(() => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      previewBlobUrl = null;
      removeButton.hidden = true;
    }, 0);
  });
})();
