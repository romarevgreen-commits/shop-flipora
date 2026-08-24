(() => {
  const style = document.createElement('style');
  style.textContent = `
    .photo-action-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:-6px}
    .remove-photo-button,.seller-danger-button{border:1px solid #d92d20;background:#fff;color:#b42318;border-radius:10px;padding:9px 13px;font-weight:800;cursor:pointer}
    .remove-photo-button:hover,.seller-danger-button:hover{background:#fff1f0}
    .remove-photo-button[hidden]{display:none!important}
    .photo-action-hint{font-size:.75rem;color:var(--muted)}
    .hero-art .float-card{overflow:hidden;padding:0;gap:0}
    .hero-art .sold-photo{height:112px;position:relative;overflow:hidden;background:#eee}
    .hero-art .sold-photo img{width:100%;height:100%;display:block;object-fit:cover}
    .hero-art .sold-badge{position:absolute;left:9px;top:9px;background:var(--ink);color:#fff;border-radius:999px;padding:5px 8px;font-size:.62rem!important;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
    .hero-art .sold-card-copy{display:grid;gap:4px;padding:12px 14px 14px;background:#fff}
    .hero-art .sold-card-copy strong{font-size:.9rem;line-height:1.1}
    .hero-art .sold-card-copy small{font-weight:950;color:var(--purple)}
    .sold-showcase-label{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-2deg);margin:0;color:rgba(255,255,255,.92);font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;text-align:center;max-width:185px}
    .hero-art .orbit{font-size:.78rem;text-align:center;line-height:1.05}
    .seller-items-card{border:1px solid var(--line);border-radius:16px;padding:15px;display:grid;gap:12px;background:#fff}
    .seller-items-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .seller-items-head span{font-size:.75rem;color:var(--muted)}
    .seller-items-list{display:grid;gap:10px;max-height:280px;overflow:auto}
    .seller-item{display:grid;grid-template-columns:58px 1fr;gap:11px;padding:10px;border-radius:12px;background:var(--cream);align-items:center}
    .seller-item img,.seller-item-placeholder{width:58px;height:58px;border-radius:10px;object-fit:cover;background:#e9e4f5;display:grid;place-items:center;font-size:1.6rem}
    .seller-item-info{min-width:0;display:grid;gap:7px}
    .seller-item-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .seller-item-title-row strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .seller-status{font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;padding:4px 7px;border-radius:999px;background:#e8e1ff;color:var(--purple)}
    .seller-status.sold{background:#def7e8;color:#087443}
    .seller-item-actions{display:flex;gap:7px;flex-wrap:wrap}
    .seller-action-button{border:1px solid var(--line);background:#fff;border-radius:9px;padding:7px 9px;font-size:.72rem;font-weight:800;cursor:pointer}
    .seller-action-button:hover{border-color:var(--purple);color:var(--purple)}
    .seller-action-button:disabled,.seller-danger-button:disabled{opacity:.55;cursor:wait}
    .seller-empty{margin:0;color:var(--muted);font-size:.8rem;line-height:1.45}
    @media(max-width:560px){.hero-art .sold-photo{height:88px}.photo-action-row{align-items:flex-start;flex-direction:column}.seller-item{grid-template-columns:48px 1fr}.seller-item img,.seller-item-placeholder{width:48px;height:48px}}
  `;
  document.head.appendChild(style);

  const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const notify = message => typeof window.showToast === 'function' ? window.showToast(message) : alert(message);

  const heroArt = document.querySelector('.hero-art');
  if (heroArt) {
    heroArt.setAttribute('aria-label', 'Sample sold-item showcase');
    heroArt.innerHTML = `
      <p class="sold-showcase-label">Sold-item photo showcase</p>
      <div class="float-card card-one">
        <div class="sold-photo">
          <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=82" alt="Wireless headphones" loading="eager">
          <span class="sold-badge">Sold</span>
        </div>
        <div class="sold-card-copy"><strong>Wireless headphones</strong><small>$48</small></div>
      </div>
      <div class="float-card card-two">
        <div class="sold-photo">
          <img src="https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=600&q=82" alt="Green houseplant" loading="eager">
          <span class="sold-badge">Sold</span>
        </div>
        <div class="sold-card-copy"><strong>Houseplant</strong><small>$22</small></div>
      </div>
      <div class="float-card card-three">
        <div class="sold-photo">
          <img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=82" alt="Vintage camera" loading="eager">
          <span class="sold-badge">Sold</span>
        </div>
        <div class="sold-card-copy"><strong>Vintage camera</strong><small>$95</small></div>
      </div>
      <div class="orbit">sold<br>fast!</div>
    `;
  }

  const sellDialog = document.querySelector('#sellDialog');
  const sellClose = sellDialog?.querySelector('.dialog-close');
  if (sellClose) {
    sellClose.type = 'button';
    sellClose.removeAttribute('value');
    sellClose.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      sellDialog.close();
    });
  }

  const photoInput = document.querySelector('#photoInput');
  const photoPreview = document.querySelector('#photoPreview');
  const sellForm = document.querySelector('#sellForm');
  if (photoInput && photoPreview && !document.querySelector('#removePhotoButton')) {
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
    sellForm?.addEventListener('reset', () => window.setTimeout(() => {
      previewBlobUrl = null;
      removeButton.hidden = true;
    }, 0));
  }

  const config = window.FLIPORA_CONFIG;
  if (!window.supabase || !config?.supabaseUrl || !config?.supabasePublishableKey) return;
  const sellerDb = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  const accountPanel = document.querySelector('#accountDialog .account-panel');
  const signOutButton = document.querySelector('#signOutButton');
  if (!accountPanel || !signOutButton) return;

  const sellerSection = document.createElement('section');
  sellerSection.className = 'seller-items-card';
  sellerSection.innerHTML = `
    <div class="seller-items-head"><strong>Your listings</strong><span>Manage active & sold items</span></div>
    <div class="seller-items-list" id="sellerItemsList"><p class="seller-empty">Open your account to load your listings.</p></div>
  `;
  accountPanel.insertBefore(sellerSection, signOutButton);
  const sellerItemsList = sellerSection.querySelector('#sellerItemsList');

  const storagePathFromUrl = url => {
    if (!url) return '';
    const marker = '/storage/v1/object/public/listing-images/';
    const index = url.indexOf(marker);
    if (index === -1) return '';
    return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
  };

  async function getSellerSession() {
    const { data } = await sellerDb.auth.getSession();
    return data.session || null;
  }

  async function refreshMainListings() {
    if (typeof window.loadListings === 'function') await window.loadListings();
  }

  async function loadSellerItems() {
    const session = await getSellerSession();
    if (!session) {
      sellerItemsList.innerHTML = '<p class="seller-empty">Sign in to manage your listings.</p>';
      return;
    }
    sellerItemsList.innerHTML = '<p class="seller-empty">Loading your listings…</p>';
    const { data, error } = await sellerDb.from('listings')
      .select('id,title,price,status,image_url,created_at')
      .eq('seller_id', session.user.id)
      .in('status', ['active','sold'])
      .order('created_at', { ascending: false });
    if (error) {
      sellerItemsList.innerHTML = `<p class="seller-empty">${safe(error.message)}</p>`;
      return;
    }
    const activeListingCount = (data || []).filter(item => item.status === 'active').length;
    const listingCount = document.querySelector('#listingCount');
    if (listingCount) listingCount.textContent = String(activeListingCount);
    if (!data?.length) {
      sellerItemsList.innerHTML = '<p class="seller-empty">You do not have any active or sold listings yet.</p>';
      return;
    }
    sellerItemsList.innerHTML = data.map(item => `
      <article class="seller-item" data-seller-item="${item.id}">
        ${item.image_url ? `<img src="${safe(item.image_url)}" alt="${safe(item.title)}">` : '<div class="seller-item-placeholder">📦</div>'}
        <div class="seller-item-info">
          <div class="seller-item-title-row"><strong>${safe(item.title)}</strong><span class="seller-status ${item.status === 'sold' ? 'sold' : ''}">${safe(item.status)}</span></div>
          <div class="seller-item-actions">
            ${item.status === 'active' ? `<button class="seller-action-button" type="button" data-mark-sold="${item.id}">Mark sold</button>` : ''}
            ${item.status === 'sold' && item.image_url ? `<button class="seller-action-button" type="button" data-delete-sold-photo="${item.id}">Delete sold photo</button>` : ''}
            ${item.status === 'sold' ? `<button class="seller-danger-button" type="button" data-remove-sold="${item.id}">Remove sold item</button>` : ''}
          </div>
        </div>
      </article>
    `).join('');
  }

  async function getOwnedListing(id) {
    const session = await getSellerSession();
    if (!session) throw new Error('Sign in required.');
    const { data, error } = await sellerDb.from('listings')
      .select('id,seller_id,status,image_url,title')
      .eq('id', id)
      .eq('seller_id', session.user.id)
      .single();
    if (error) throw error;
    return { session, listing: data };
  }

  async function deleteStoredPhoto(listing) {
    if (!listing?.image_url) return;
    const path = storagePathFromUrl(listing.image_url);
    if (path) {
      const { error } = await sellerDb.storage.from('listing-images').remove([path]);
      if (error) throw error;
    }
    const { error: updateError } = await sellerDb.from('listings').update({ image_url: null }).eq('id', listing.id);
    if (updateError) throw updateError;
  }

  sellerItemsList.addEventListener('click', async event => {
    const markButton = event.target.closest('[data-mark-sold]');
    const deletePhotoButton = event.target.closest('[data-delete-sold-photo]');
    const removeButton = event.target.closest('[data-remove-sold]');
    const button = markButton || deletePhotoButton || removeButton;
    if (!button) return;
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Working…';
    try {
      if (markButton) {
        const { session } = await getOwnedListing(markButton.dataset.markSold);
        const { error } = await sellerDb.from('listings').update({ status: 'sold' }).eq('id', markButton.dataset.markSold).eq('seller_id', session.user.id);
        if (error) throw error;
        notify('Item marked sold.');
      } else if (deletePhotoButton) {
        const { listing } = await getOwnedListing(deletePhotoButton.dataset.deleteSoldPhoto);
        if (listing.status !== 'sold') throw new Error('Only sold-item photos can be deleted here.');
        await deleteStoredPhoto(listing);
        notify('Sold photo deleted.');
      } else if (removeButton) {
        const { session, listing } = await getOwnedListing(removeButton.dataset.removeSold);
        if (listing.status !== 'sold') throw new Error('Only sold items can be removed here.');
        if (listing.image_url) await deleteStoredPhoto(listing);
        const { error } = await sellerDb.from('listings').update({ status: 'hidden', image_url: null }).eq('id', listing.id).eq('seller_id', session.user.id);
        if (error) throw error;
        notify('Sold item removed from your visible seller list.');
      }
      await loadSellerItems();
      await refreshMainListings();
    } catch (error) {
      notify(error.message || 'Could not update the listing.');
      button.disabled = false;
      button.textContent = originalText;
    }
  });

  document.querySelector('#accountButton')?.addEventListener('click', () => window.setTimeout(loadSellerItems, 0));
  sellerDb.auth.onAuthStateChange((_event, session) => {
    if (session?.user) loadSellerItems();
    else sellerItemsList.innerHTML = '<p class="seller-empty">Sign in to manage your listings.</p>';
  });
})();
