(() => {
  const accountPanel = document.querySelector('#accountDialog .account-panel');
  const membershipCard = document.querySelector('.membership-status-card');
  if (!accountPanel || !membershipCard) return;

  const style = document.createElement('style');
  style.textContent = `
    .order-dashboard-card{border:1px solid var(--line);border-radius:16px;padding:15px;display:grid;gap:12px;background:#fff}
    .order-dashboard-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
    .order-dashboard-head strong{font-size:1rem}.order-dashboard-head span{font-size:.76rem;color:var(--muted)}
    .order-list{display:grid;gap:12px;max-height:430px;overflow:auto}
    .order-card{border:1px solid var(--line);border-radius:14px;padding:12px;display:grid;gap:10px;background:var(--cream)}
    .order-main{display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:start}
    .order-image,.order-image-placeholder{width:72px;height:72px;border-radius:11px;object-fit:cover;background:#e9e4f5;display:grid;place-items:center;font-size:1.8rem}
    .order-copy{min-width:0;display:grid;gap:5px}.order-copy h4{margin:0;font-size:.95rem}.order-copy p{margin:0;font-size:.76rem;color:var(--muted);line-height:1.35}
    .order-meta{display:flex;gap:7px;flex-wrap:wrap}.order-pill{font-size:.66rem;font-weight:900;border-radius:999px;padding:5px 8px;background:#e8e1ff;color:var(--purple);text-transform:uppercase;letter-spacing:.04em}
    .order-pill.shipped{background:#dff4ff;color:#075985}.order-pill.paid,.order-pill.completed,.order-pill.delivered{background:#def7e8;color:#087443}.order-pill.refunded,.order-pill.cancelled{background:#fee2e2;color:#991b1b}
    .item-number-line{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.73rem!important;color:var(--ink)!important;font-weight:800}
    .tracking-box{border-top:1px solid var(--line);padding-top:9px;display:grid;gap:7px}.tracking-box strong{font-size:.78rem}.tracking-line{font-size:.76rem;word-break:break-word}
    .tracking-link{font-size:.74rem;font-weight:800;color:var(--purple);text-decoration:none}.tracking-link:hover{text-decoration:underline}
    .shipping-form{display:grid;grid-template-columns:120px 1fr auto;gap:8px;align-items:end}.shipping-form label{font-size:.7rem;font-weight:800;display:grid;gap:4px}.shipping-form input,.shipping-form select{min-width:0;border:1px solid var(--line);border-radius:9px;padding:9px;background:#fff;font:inherit}.shipping-form button{white-space:nowrap}
    .order-empty{margin:0;color:var(--muted);font-size:.8rem;line-height:1.45}
    @media(max-width:600px){.order-main{grid-template-columns:58px 1fr}.order-image,.order-image-placeholder{width:58px;height:58px}.shipping-form{grid-template-columns:1fr}.shipping-form button{width:100%}}
  `;
  document.head.appendChild(style);

  const buyerSection = document.createElement('section');
  buyerSection.className = 'order-dashboard-card buyer-orders-card';
  buyerSection.innerHTML = `
    <div class="order-dashboard-head"><div><strong>My purchases</strong><span>Full order details, item numbers and shipping updates</span></div><span id="buyerOrderCount">0 purchases</span></div>
    <div class="order-list" id="buyerOrderList"><p class="order-empty">Open your buyer account to load purchases.</p></div>
  `;

  const sellerSection = document.createElement('section');
  sellerSection.className = 'order-dashboard-card seller-orders-card';
  sellerSection.hidden = true;
  sellerSection.innerHTML = `
    <div class="order-dashboard-head"><div><strong>Sales & shipping</strong><span>Sold-item details, item numbers and tracking</span></div><span id="sellerOrderCount">0 sold</span></div>
    <div class="order-list" id="sellerOrderList"><p class="order-empty">Open your seller account to load sold items.</p></div>
  `;

  accountPanel.insertBefore(buyerSection, membershipCard);
  accountPanel.insertBefore(sellerSection, membershipCard);

  const buyerList = buyerSection.querySelector('#buyerOrderList');
  const sellerList = sellerSection.querySelector('#sellerOrderList');
  const buyerCount = buyerSection.querySelector('#buyerOrderCount');
  const sellerCount = sellerSection.querySelector('#sellerOrderCount');

  const safe = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents || 0) / 100);
  const date = value => value ? new Date(value).toLocaleString() : 'Not available';
  const statusLabel = value => String(value || 'pending').replace(/_/g,' ');

  function trackingUrl(carrier, number) {
    const value = encodeURIComponent(number || '');
    const c = String(carrier || '').toLowerCase();
    if (!number) return '';
    if (c === 'ups') return `https://www.ups.com/track?tracknum=${value}`;
    if (c === 'fedex') return `https://www.fedex.com/fedextrack/?trknbr=${value}`;
    if (c === 'usps') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${value}`;
    if (c === 'dhl') return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${value}`;
    return '';
  }

  function imageMarkup(listing) {
    return listing?.image_url
      ? `<img class="order-image" src="${safe(listing.image_url)}" alt="${safe(listing.title || 'Marketplace item')}">`
      : '<div class="order-image-placeholder">📦</div>';
  }

  async function getOrders(column) {
    if (!currentUser) return [];
    const { data, error } = await db.from('orders')
      .select('id,item_number,listing_id,buyer_id,seller_id,amount_total,currency,status,created_at,paid_at,shipping_carrier,tracking_number,shipped_at,tracking_updated_at,listings(id,item_number,title,description,condition,city,image_url,image_urls,category,price,status)')
      .eq(column, currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  function itemNumber(order, item) {
    return order.item_number || item?.item_number || `FL-${String(order.listing_id || order.id).padStart(8,'0')}`;
  }

  async function loadBuyerOrders() {
    if (!currentUser) {
      buyerList.innerHTML = '<p class="order-empty">Sign in to view your purchase history.</p>';
      buyerCount.textContent = '0 purchases';
      return;
    }
    buyerList.innerHTML = '<p class="order-empty">Loading purchases…</p>';
    try {
      const orders = await getOrders('buyer_id');
      const visible = orders.filter(order => order.status !== 'cancelled');
      buyerCount.textContent = `${visible.length} ${visible.length === 1 ? 'purchase' : 'purchases'}`;
      if (!visible.length) {
        buyerList.innerHTML = '<p class="order-empty">You have not purchased any items yet.</p>';
        return;
      }
      buyerList.innerHTML = visible.map(order => {
        const item = order.listings || {};
        const number = itemNumber(order, item);
        const track = trackingUrl(order.shipping_carrier, order.tracking_number);
        return `
          <article class="order-card">
            <div class="order-main">
              ${imageMarkup(item)}
              <div class="order-copy">
                <div class="order-meta"><span class="order-pill ${safe(order.status)}">${safe(statusLabel(order.status))}</span><span class="order-pill">Order #${order.id}</span></div>
                <h4>${safe(item.title || 'Marketplace item')}</h4>
                <p class="item-number-line">Item ${safe(number)}</p>
                <p><strong>${money(order.amount_total)}</strong> · Purchased ${safe(date(order.paid_at || order.created_at))}</p>
                ${item.condition ? `<p>Condition: ${safe(item.condition)}</p>` : ''}
                ${item.description ? `<p>${safe(item.description)}</p>` : ''}
                ${item.city ? `<p>Seller location: ${safe(item.city)}</p>` : ''}
                <a class="tracking-link" href="/reviews.html?seller=${encodeURIComponent(order.seller_id)}">View seller profile</a>
              </div>
            </div>
            <div class="tracking-box">
              <strong>Shipping & tracking</strong>
              ${order.tracking_number ? `<div class="tracking-line"><b>${safe(order.shipping_carrier || 'Carrier')}</b> · ${safe(order.tracking_number)}</div><div class="tracking-line">Shipped: ${safe(date(order.shipped_at))}</div>${track ? `<a class="tracking-link" href="${track}" target="_blank" rel="noopener">Track package with ${safe(order.shipping_carrier)}</a>` : ''}` : '<div class="tracking-line">The seller has not added a tracking number yet.</div>'}
            </div>
          </article>`;
      }).join('');
    } catch (error) {
      buyerList.innerHTML = `<p class="order-empty">${safe(error.message || 'Could not load purchases.')}</p>`;
    }
  }

  async function loadSellerOrders() {
    if (!currentUser) {
      sellerList.innerHTML = '<p class="order-empty">Sign in to view sold items.</p>';
      sellerCount.textContent = '0 sold';
      return;
    }
    sellerList.innerHTML = '<p class="order-empty">Loading sold items…</p>';
    try {
      const orders = await getOrders('seller_id');
      const visible = orders.filter(order => !['pending','cancelled'].includes(order.status));
      sellerCount.textContent = `${visible.length} ${visible.length === 1 ? 'item sold' : 'items sold'}`;
      if (!visible.length) {
        sellerList.innerHTML = '<p class="order-empty">No sold items yet.</p>';
        return;
      }
      sellerList.innerHTML = visible.map(order => {
        const item = order.listings || {};
        const number = itemNumber(order, item);
        return `
          <article class="order-card" data-order-id="${order.id}">
            <div class="order-main">
              ${imageMarkup(item)}
              <div class="order-copy">
                <div class="order-meta"><span class="order-pill ${safe(order.status)}">${safe(statusLabel(order.status))}</span><span class="order-pill">SOLD</span></div>
                <h4>${safe(item.title || 'Marketplace item')}</h4>
                <p class="item-number-line">Item ${safe(number)}</p>
                <p><strong>${money(order.amount_total)}</strong> · Sold ${safe(date(order.paid_at || order.created_at))}</p>
                ${item.condition ? `<p>Condition: ${safe(item.condition)}</p>` : ''}
                ${item.description ? `<p>${safe(item.description)}</p>` : ''}
                ${item.city ? `<p>Listing location: ${safe(item.city)}</p>` : ''}
              </div>
            </div>
            <form class="shipping-form" data-shipping-form="${order.id}">
              <label>Carrier<select name="carrier" required><option value="">Choose</option><option value="UPS" ${order.shipping_carrier==='UPS'?'selected':''}>UPS</option><option value="FedEx" ${order.shipping_carrier==='FedEx'?'selected':''}>FedEx</option><option value="USPS" ${order.shipping_carrier==='USPS'?'selected':''}>USPS</option><option value="DHL" ${order.shipping_carrier==='DHL'?'selected':''}>DHL</option><option value="Other" ${order.shipping_carrier==='Other'?'selected':''}>Other</option></select></label>
              <label>Tracking number<input name="tracking" required maxlength="120" value="${safe(order.tracking_number || '')}" placeholder="Enter package tracking number"></label>
              <button class="button button-small" type="submit">${order.tracking_number ? 'Update tracking' : 'Mark shipped'}</button>
            </form>
            ${order.tracking_number ? `<div class="tracking-line">Current: <b>${safe(order.shipping_carrier)}</b> · ${safe(order.tracking_number)} · Updated ${safe(date(order.tracking_updated_at || order.shipped_at))}</div>` : ''}
          </article>`;
      }).join('');
    } catch (error) {
      sellerList.innerHTML = `<p class="order-empty">${safe(error.message || 'Could not load sold items.')}</p>`;
    }
  }

  sellerList.addEventListener('submit', async event => {
    const form = event.target.closest('[data-shipping-form]');
    if (!form) return;
    event.preventDefault();
    const orderId = Number(form.dataset.shippingForm);
    const values = new FormData(form);
    const carrier = String(values.get('carrier') || '').trim();
    const tracking = String(values.get('tracking') || '').trim();
    if (!carrier || !tracking) return showToast('Choose a carrier and enter the tracking number.');
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    const old = button.textContent;
    button.textContent = 'Saving…';
    try {
      const now = new Date().toISOString();
      const { error } = await db.from('orders').update({
        shipping_carrier: carrier,
        tracking_number: tracking,
        status: 'shipped',
        shipped_at: now,
        tracking_updated_at: now
      }).eq('id', orderId).eq('seller_id', currentUser.id);
      if (error) throw error;
      showToast('Tracking saved. The buyer account now shows the same shipment information.');
      await Promise.all([loadSellerOrders(), loadBuyerOrders()]);
      window.dispatchEvent(new CustomEvent('flipora:seller-sales-updated'));
    } catch (error) {
      showToast(error.message || 'Could not save tracking.');
      button.disabled = false;
      button.textContent = old;
    }
  });

  function currentMode() {
    return document.querySelector('#accountDialog')?.dataset.accountMode || 'buyer';
  }

  function renderMode() {
    const sellerMode = currentMode() === 'seller';
    buyerSection.hidden = sellerMode;
    sellerSection.hidden = !sellerMode;
    if (sellerMode) loadSellerOrders(); else loadBuyerOrders();
  }

  window.addEventListener('flipora:account-mode', renderMode);
  window.addEventListener('flipora:membership-status', () => setTimeout(renderMode, 100));
  document.querySelector('#accountButton')?.addEventListener('click', () => setTimeout(renderMode, 650));
  db.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      buyerList.innerHTML = '<p class="order-empty">Sign in to view your purchase history.</p>';
      sellerList.innerHTML = '<p class="order-empty">Sign in to view sold items.</p>';
      return;
    }
    setTimeout(renderMode, 900);
  });

  setInterval(() => {
    if (!currentUser || !document.querySelector('#accountDialog')?.open) return;
    if (currentMode() === 'seller') loadSellerOrders(); else loadBuyerOrders();
  }, 30000);
})();
