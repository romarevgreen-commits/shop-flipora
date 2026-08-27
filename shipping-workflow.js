(() => {
  const accountPanel = document.querySelector('#accountDialog .account-panel');
  const signOutButton = document.querySelector('#signOutButton');
  const accountButton = document.querySelector('#accountButton');
  if (!accountPanel || !signOutButton || !accountButton || typeof db === 'undefined') return;
  if (document.querySelector('#shippingWorkflowCard')) return;

  const style = document.createElement('style');
  style.textContent = `
    .shipping-workflow-card{border:1px solid var(--line);border-radius:16px;padding:15px;display:grid;gap:14px;background:#fff}
    .shipping-workflow-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.shipping-workflow-head h3{margin:0}.shipping-workflow-head p{margin:3px 0 0;color:var(--muted);font-size:.73rem}.shipping-badge{min-width:24px;height:24px;padding:0 7px;border-radius:999px;background:#d92d20;color:#fff;display:grid;place-items:center;font-size:.68rem;font-weight:900}
    .shipping-notification-badge{margin-left:4px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#d92d20;color:#fff;display:inline-grid;place-items:center;font-size:.6rem;font-weight:900}
    .shipping-section{display:grid;gap:9px}.shipping-section h4{margin:0;font-size:.86rem}.shipping-order{border:1px solid var(--line);border-radius:13px;padding:11px;display:grid;gap:8px;background:var(--cream)}
    .shipping-order-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.shipping-order-top strong{font-size:.82rem}.shipping-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.68rem;font-weight:900;color:var(--purple)}
    .shipping-status{font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;padding:4px 7px;border-radius:999px;background:#fff;border:1px solid var(--line)}.shipping-status.shipped{background:#def7e8;color:#087443}.shipping-status.paid{background:#fff2cc;color:#7a5200}
    .ship-address{margin:0;padding:9px;border-radius:10px;background:#fff;font-style:normal;font-size:.73rem;line-height:1.45}.ship-address strong{display:block;margin-bottom:3px}.shipping-note{margin:0;font-size:.7rem;color:var(--muted);line-height:1.4}
    .shipping-form{display:grid;grid-template-columns:120px 1fr auto;gap:7px}.shipping-form select,.shipping-form input{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px;background:#fff;font:inherit;font-size:.74rem}.shipping-form button{white-space:nowrap}
    .tracking-link{font-size:.73rem;font-weight:850;color:var(--purple);text-decoration:none}.tracking-link:hover{text-decoration:underline}.shipping-empty{margin:0;color:var(--muted);font-size:.74rem}.shipping-notices{display:grid;gap:7px}.shipping-notice{border-left:4px solid var(--purple);background:#f6f3ff;border-radius:9px;padding:8px 9px;font-size:.7rem;line-height:1.4}.shipping-notice strong{display:block}.shipping-actions{display:flex;justify-content:flex-end}
    @media(max-width:520px){.shipping-form{grid-template-columns:1fr}.shipping-order-top{flex-direction:column}.shipping-actions{justify-content:stretch}.shipping-actions button{width:100%}}
  `;
  document.head.appendChild(style);

  const badge = document.createElement('span');
  badge.id = 'shippingHeaderBadge';
  badge.className = 'shipping-notification-badge';
  badge.hidden = true;
  accountButton.appendChild(badge);

  const section = document.createElement('section');
  section.id = 'shippingWorkflowCard';
  section.className = 'shipping-workflow-card';
  section.hidden = true;
  section.innerHTML = `
    <div class="shipping-workflow-head"><div><h3>Sales, shipping & tracking</h3><p>Sold items get a sale ID. Ship-to details stay private to the buyer, seller and Flipora administration.</p></div><span class="shipping-badge" id="shippingCardBadge" hidden>0</span></div>
    <div class="shipping-notices" id="shippingNotices"></div>
    <div class="shipping-actions"><button class="button button-small button-secondary" id="markShippingNotificationsRead" type="button" hidden>Mark notifications read</button></div>
    <div class="shipping-section"><h4>Items you sold</h4><div id="sellerShippingOrders"><p class="shipping-empty">No paid items waiting for shipping.</p></div></div>
    <div class="shipping-section"><h4>Your purchases</h4><div id="buyerTrackingOrders"><p class="shipping-empty">No purchases to track yet.</p></div></div>`;
  accountPanel.insertBefore(section, signOutButton);

  const notices = section.querySelector('#shippingNotices');
  const sellerOrdersEl = section.querySelector('#sellerShippingOrders');
  const buyerOrdersEl = section.querySelector('#buyerTrackingOrders');
  const cardBadge = section.querySelector('#shippingCardBadge');
  const markRead = section.querySelector('#markShippingNotificationsRead');
  const safe = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function formatAddress(name, address) {
    if (!address || typeof address !== 'object') return '<p class="shipping-note">Shipping address not available yet. The buyer may need to complete checkout again before shipment.</p>';
    const lines = [name, address.line1, address.line2, [address.city,address.state,address.postal_code].filter(Boolean).join(', '), address.country].filter(Boolean);
    return `<address class="ship-address"><strong>Ship to</strong>${lines.map(line => safe(line)).join('<br>')}</address>`;
  }

  function trackingUrl(carrier, number) {
    const n = encodeURIComponent(String(number || '').trim());
    if (!n) return '';
    if (carrier === 'UPS') return `https://www.ups.com/track?tracknum=${n}`;
    if (carrier === 'FedEx') return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    if (carrier === 'USPS') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    if (carrier === 'DHL') return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
    return '';
  }

  function orderLabel(order) {
    return order.sale_number || order.item_number || `Order ${order.id}`;
  }

  function renderSellerOrders(orders) {
    if (!orders.length) {
      sellerOrdersEl.innerHTML = '<p class="shipping-empty">No paid items waiting for shipping.</p>';
      return;
    }
    sellerOrdersEl.innerHTML = orders.map(order => {
      const carrier = order.shipping_carrier || order.carrier || '';
      const tracking = order.tracking_number || '';
      return `<article class="shipping-order" data-shipping-order="${order.id}">
        <div class="shipping-order-top"><div><strong>${safe(order.item_title || 'Sold item')}</strong><div class="shipping-id">Sale ${safe(orderLabel(order))} · Item ${safe(order.item_number || order.listing_id)}</div></div><span class="shipping-status ${safe(order.status)}">${safe(order.status === 'paid' ? 'Shipping needed' : order.status)}</span></div>
        ${formatAddress(order.shipping_name, order.shipping_address)}
        <form class="shipping-form" data-shipping-form="${order.id}">
          <select name="carrier" required aria-label="Shipping carrier"><option value="">Carrier</option>${['UPS','FedEx','USPS','DHL','Other'].map(value => `<option${carrier===value?' selected':''}>${value}</option>`).join('')}</select>
          <input name="tracking" required minlength="4" maxlength="120" value="${safe(tracking)}" placeholder="Tracking number" aria-label="Tracking number">
          <button class="button button-small" type="submit">${tracking ? 'Update tracking' : 'Save tracking'}</button>
        </form>
        <p class="shipping-note">Add tracking after you hand the package to the carrier. The buyer will be notified automatically.</p>
      </article>`;
    }).join('');
  }

  function renderBuyerOrders(orders) {
    if (!orders.length) {
      buyerOrdersEl.innerHTML = '<p class="shipping-empty">No purchases to track yet.</p>';
      return;
    }
    buyerOrdersEl.innerHTML = orders.map(order => {
      const carrier = order.shipping_carrier || order.carrier || '';
      const tracking = order.tracking_number || '';
      const url = trackingUrl(carrier, tracking);
      const trackingHtml = tracking
        ? `<p class="shipping-note"><strong>${safe(carrier || 'Carrier')}</strong> · ${safe(tracking)}</p>${url ? `<a class="tracking-link" href="${safe(url)}" target="_blank" rel="noopener">Track package ↗</a>` : ''}`
        : '<p class="shipping-note">Payment is complete. The seller is preparing your shipment and will add tracking here.</p>';
      return `<article class="shipping-order"><div class="shipping-order-top"><div><strong>${safe(order.item_title || 'Purchased item')}</strong><div class="shipping-id">Sale ${safe(orderLabel(order))} · Item ${safe(order.item_number || order.listing_id)}</div></div><span class="shipping-status ${safe(order.status)}">${safe(order.status)}</span></div>${trackingHtml}</article>`;
    }).join('');
  }

  async function loadNotifications(user) {
    const { data, error } = await db.from('notifications').select('id,type,title,message,order_id,created_at,read_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(8);
    if (error) throw error;
    const rows = data || [];
    const unread = rows.filter(row => !row.read_at);
    badge.hidden = unread.length === 0;
    cardBadge.hidden = unread.length === 0;
    badge.textContent = String(Math.min(unread.length, 99));
    cardBadge.textContent = String(Math.min(unread.length, 99));
    markRead.hidden = unread.length === 0;
    notices.innerHTML = rows.slice(0,4).map(row => `<div class="shipping-notice"><strong>${safe(row.title)}</strong>${safe(row.message)}</div>`).join('');

    const newest = unread[0];
    if (newest) {
      const key = `flipora-shipping-notice-${newest.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key,'1');
        if (typeof showToast === 'function') showToast(newest.title);
      }
    }
  }

  async function loadShippingWorkflow() {
    const { data } = await db.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      section.hidden = true;
      badge.hidden = true;
      return;
    }
    section.hidden = false;
    const fields = 'id,listing_id,item_number,sale_number,item_title,buyer_id,seller_id,status,shipping_name,shipping_address,shipping_carrier,carrier,tracking_number,paid_at,shipped_at';
    const [sellerResult,buyerResult] = await Promise.all([
      db.from('orders').select(fields).eq('seller_id',user.id).in('status',['paid','shipped']).order('paid_at',{ascending:false}),
      db.from('orders').select(fields).eq('buyer_id',user.id).in('status',['paid','shipped','delivered','completed']).order('paid_at',{ascending:false})
    ]);
    if (sellerResult.error) throw sellerResult.error;
    if (buyerResult.error) throw buyerResult.error;
    renderSellerOrders(sellerResult.data || []);
    renderBuyerOrders(buyerResult.data || []);
    await loadNotifications(user);
  }

  sellerOrdersEl.addEventListener('submit', async event => {
    const form = event.target.closest('[data-shipping-form]');
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      const values = new FormData(form);
      const { error } = await db.rpc('update_seller_shipping', {
        p_order_id: Number(form.dataset.shippingForm),
        p_carrier: String(values.get('carrier') || ''),
        p_tracking_number: String(values.get('tracking') || '').trim()
      });
      if (error) throw error;
      if (typeof showToast === 'function') showToast('Tracking saved. The buyer was notified.');
      await loadShippingWorkflow();
      window.dispatchEvent(new CustomEvent('flipora:seller-sales-updated'));
    } catch (error) {
      if (typeof showToast === 'function') showToast(error.message || 'Could not save tracking.');
      button.disabled = false;
      button.textContent = original;
    }
  });

  markRead.addEventListener('click', async () => {
    const { data } = await db.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    markRead.disabled = true;
    try {
      const { error } = await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id',user.id).is('read_at',null);
      if (error) throw error;
      await loadNotifications(user);
    } catch (error) {
      if (typeof showToast === 'function') showToast(error.message || 'Could not update notifications.');
    } finally { markRead.disabled = false; }
  });

  accountButton.addEventListener('click', () => setTimeout(() => loadShippingWorkflow().catch(error => { if (typeof showToast === 'function') showToast(error.message); }), 120));
  db.auth.onAuthStateChange((_event,session) => {
    if (session?.user) setTimeout(() => loadShippingWorkflow().catch(()=>{}), 350);
    else { section.hidden = true; badge.hidden = true; }
  });
  db.auth.getSession().then(({data}) => { if (data.session?.user) loadShippingWorkflow().catch(()=>{}); });
  setInterval(() => {
    if (!currentUser) return;
    loadNotifications(currentUser).catch(()=>{});
  }, 30000);
})();
