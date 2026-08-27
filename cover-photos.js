(() => {
  const style = document.createElement('style');
  style.textContent = `
    .hero-art.hero-photo-wall{position:relative;overflow:hidden;background:linear-gradient(145deg,#5b35f2,#7d5cff);border-radius:38px;box-shadow:var(--shadow);transform:none}
    .hero-art.hero-photo-wall:before{display:none!important}
    .hero-photo-wall .cover-photo{position:absolute;margin:0;overflow:hidden;border-radius:26px;border:5px solid rgba(255,255,255,.94);box-shadow:0 20px 45px rgba(24,20,43,.28);background:#ddd}
    .hero-photo-wall .cover-photo img{width:100%;height:100%;display:block;object-fit:cover}
    .hero-photo-wall .cover-photo-one{width:58%;height:58%;left:7%;top:8%;transform:rotate(-5deg)}
    .hero-photo-wall .cover-photo-two{width:47%;height:45%;right:5%;top:25%;transform:rotate(6deg)}
    .hero-photo-wall .cover-photo-three{width:49%;height:40%;left:22%;bottom:5%;transform:rotate(2deg)}
    .hero-photo-wall .cover-sold-badge{position:absolute;left:12px;top:12px;z-index:2;background:#18142b;color:#fff;padding:7px 11px;border-radius:999px;font-size:.68rem;font-weight:950;letter-spacing:.09em;text-transform:uppercase;box-shadow:0 5px 15px rgba(0,0,0,.18)}
    @media(max-width:900px){.hero-art.hero-photo-wall{height:420px}}
    @media(max-width:560px){.hero-art.hero-photo-wall{height:330px}.hero-photo-wall .cover-photo{border-width:4px;border-radius:20px}.hero-photo-wall .cover-sold-badge{font-size:.58rem;padding:6px 9px}}
  `;
  document.head.appendChild(style);

  const heroArt = document.querySelector('.hero-art');
  if (!heroArt) return;
  heroArt.className = 'hero-art hero-photo-wall';
  heroArt.setAttribute('aria-label', 'Photo showcase of sold marketplace items');
  heroArt.innerHTML = `
    <figure class="cover-photo cover-photo-one">
      <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=86" alt="Wireless headphones sold on a marketplace" loading="eager" referrerpolicy="no-referrer">
      <span class="cover-sold-badge">Sold</span>
    </figure>
    <figure class="cover-photo cover-photo-two">
      <img src="https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=900&q=86" alt="Home furniture sold on a marketplace" loading="eager" referrerpolicy="no-referrer">
      <span class="cover-sold-badge">Sold</span>
    </figure>
    <figure class="cover-photo cover-photo-three">
      <img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=86" alt="Camera sold on a marketplace" loading="eager" referrerpolicy="no-referrer">
      <span class="cover-sold-badge">Sold</span>
    </figure>
  `;
})();

// Make Explore denser, easier to search, and reset stale filters after publishing.
(() => {
  const browse = document.querySelector('#browse');
  const grid = document.querySelector('#listingGrid');
  const filters = document.querySelector('#categoryFilters');
  const search = document.querySelector('#searchInput');
  const sellDialog = document.querySelector('#sellDialog');
  if (!browse || !grid || !filters || !search) return;

  const style = document.createElement('style');
  style.textContent = `
    .browse-section{padding-left:clamp(14px,4vw,72px)!important;padding-right:clamp(14px,4vw,72px)!important}
    .browse-results-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 18px;color:var(--muted);font-size:.78rem;font-weight:800}
    .browse-clear-filters{border:1px solid var(--line);background:#fff;color:var(--purple);border-radius:999px;padding:7px 11px;font-weight:850;cursor:pointer}
    .listing-grid{grid-template-columns:repeat(auto-fill,minmax(190px,1fr))!important;gap:14px!important}
    @media(max-width:560px){
      .browse-section{padding-left:10px!important;padding-right:10px!important}
      .listing-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
      .listing-image{height:150px!important}
      .listing-body{padding:11px!important}
      .listing-body h3{font-size:.92rem!important;line-height:1.2}
      .listing-body p,.listing-directions{font-size:.69rem!important}
      .listing-meta{align-items:flex-start;gap:5px}
      .listing-category{font-size:.58rem!important;letter-spacing:.06em!important}
      .price{font-size:.95rem!important}
      .buy-button{padding:9px 7px!important;font-size:.75rem!important}
    }
    @media(max-width:350px){.listing-grid{grid-template-columns:1fr!important}.listing-image{height:210px!important}}
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.className = 'browse-results-bar';
  bar.innerHTML = '<span id="browseResultCount">Loading items…</span><button class="browse-clear-filters" type="button">Show all items</button>';
  filters.insertAdjacentElement('afterend', bar);
  const count = bar.querySelector('#browseResultCount');

  const updateCount = () => {
    const total = grid.querySelectorAll('.listing-card').length;
    count.textContent = `${total} item${total === 1 ? '' : 's'} shown`;
  };

  const showAll = (scroll = false) => {
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const all = filters.querySelector('[data-category="All"]');
    if (all && !all.classList.contains('active')) all.click();
    else if (all) all.click();
    window.setTimeout(updateCount, 80);
    if (scroll) window.setTimeout(() => browse.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  bar.querySelector('.browse-clear-filters').addEventListener('click', () => showAll(false));
  search.addEventListener('input', () => window.setTimeout(updateCount, 30));
  filters.addEventListener('click', () => window.setTimeout(updateCount, 30));
  new MutationObserver(updateCount).observe(grid, { childList: true });

  // A successful publish closes the dialog after the listing is saved. Resetting
  // filters here guarantees the new item is visible at the top of Explore.
  if (sellDialog) sellDialog.addEventListener('close', () => showAll(true));
  window.setTimeout(updateCount, 350);
})();

// Load the account security module after the core marketplace scripts are ready.
(() => {
  if (document.querySelector('script[data-flipora-security]')) return;
  const security = document.createElement('script');
  security.src = 'security.js?v=20260827-1';
  security.async = false;
  security.dataset.fliporaSecurity = 'true';
  document.head.appendChild(security);
})();

// Load sold-item notifications, private shipping details, and buyer tracking UI.
(() => {
  if (document.querySelector('script[data-flipora-shipping]')) return;
  const shipping = document.createElement('script');
  shipping.src = 'shipping-workflow.js?v=20260827-1';
  shipping.async = false;
  shipping.dataset.fliporaShipping = 'true';
  document.head.appendChild(shipping);
})();

// Intercept shipping form saves and route them through the secured Netlify function.
(() => {
  if (document.querySelector('script[data-flipora-shipping-secure]')) return;
  const secureShipping = document.createElement('script');
  secureShipping.src = 'shipping-secure-patch.js?v=20260827-1';
  secureShipping.async = false;
  secureShipping.dataset.fliporaShippingSecure = 'true';
  document.head.appendChild(secureShipping);
})();
