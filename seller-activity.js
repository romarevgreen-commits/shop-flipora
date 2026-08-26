(() => {
  const accountPanel = document.querySelector('#accountDialog .account-panel');
  const membershipCard = document.querySelector('.membership-status-card');
  if (!accountPanel || !membershipCard || document.querySelector('#sellerActivityCard')) return;

  const style = document.createElement('style');
  style.textContent = `
    .seller-activity-card{border:1px solid var(--line);border-radius:16px;padding:15px;display:grid;gap:14px;background:#fff}
    .seller-activity-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}.seller-activity-head h3{margin:0}.seller-activity-head p{margin:3px 0 0;color:var(--muted);font-size:.76rem}
    .seller-activity-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.seller-activity-stat{border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--cream)}.seller-activity-stat strong{display:block;font-size:1.25rem}.seller-activity-stat span{font-size:.68rem;color:var(--muted);font-weight:800}
    .seller-chart{display:grid;gap:8px}.seller-chart-row{display:grid;grid-template-columns:54px 1fr 1fr;gap:8px;align-items:center;font-size:.7rem}.seller-chart-track{height:16px;border-radius:999px;background:#eee;overflow:hidden}.seller-chart-fill{height:100%;min-width:0;border-radius:999px}.seller-chart-fill.added{background:#5b35f2}.seller-chart-fill.sold{background:#087443}.seller-chart-label{font-weight:800;color:var(--muted)}
    .seller-chart-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:.7rem;color:var(--muted)}.seller-chart-legend span::before{content:'';display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;background:#5b35f2}.seller-chart-legend span:last-child::before{background:#087443}
    .seller-sold-history{display:grid;gap:8px}.seller-sold-history h4{margin:0}.seller-sold-row{border-top:1px solid var(--line);padding-top:9px;display:grid;gap:3px}.seller-sold-row strong{font-size:.82rem}.seller-sold-row p{margin:0;font-size:.72rem;color:var(--muted);line-height:1.35}.seller-sold-number{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.7rem!important;color:var(--ink)!important;font-weight:800}
    @media(max-width:520px){.seller-activity-stats{grid-template-columns:1fr}.seller-chart-row{grid-template-columns:46px 1fr}.seller-chart-row .sold-track{grid-column:2}}
  `;
  document.head.appendChild(style);

  const section = document.createElement('section');
  section.id = 'sellerActivityCard';
  section.className = 'seller-activity-card';
  section.hidden = true;
  section.innerHTML = `
    <div class="seller-activity-head"><div><h3>Seller activity</h3><p>Automatically updates when you add an item or complete a sale.</p></div><button class="button button-small button-secondary" id="refreshSellerActivity" type="button">Refresh</button></div>
    <div class="seller-activity-stats"><div class="seller-activity-stat"><strong id="sellerAddedTotal">0</strong><span>Items added</span></div><div class="seller-activity-stat"><strong id="sellerSoldTotal">0</strong><span>Items sold</span></div><div class="seller-activity-stat"><strong id="sellerActiveTotal">0</strong><span>Still for sale</span></div></div>
    <div class="seller-chart"><strong>Added vs sold · last 6 months</strong><div id="sellerActivityChart"></div><div class="seller-chart-legend"><span>Items added</span><span>Items sold</span></div></div>
    <div class="seller-sold-history"><h4>Recently sold</h4><div id="sellerSoldHistory"><p class="order-empty">No sold items yet.</p></div></div>`;
  accountPanel.insertBefore(section, document.querySelector('.seller-orders-card') || membershipCard);

  const addedTotal = section.querySelector('#sellerAddedTotal');
  const soldTotal = section.querySelector('#sellerSoldTotal');
  const activeTotal = section.querySelector('#sellerActiveTotal');
  const chart = section.querySelector('#sellerActivityChart');
  const history = section.querySelector('#sellerSoldHistory');
  const safe = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value || 0));
  const date = value => value ? new Date(value).toLocaleDateString() : '—';

  function monthKey(value) {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  function buckets() {
    const result = [];
    const now = new Date();
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      result.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:d.toLocaleDateString('en-US',{month:'short'}),added:0,sold:0});
    }
    return result;
  }

  async function loadSellerActivity() {
    if (!currentUser) return;
    const [{data:listings,error:listingsError},{data:orders,error:ordersError}] = await Promise.all([
      db.from('listings').select('id,item_number,title,description,condition,city,price,status,created_at').eq('seller_id',currentUser.id).order('created_at',{ascending:false}),
      db.from('orders').select('id,item_number,listing_id,amount_total,status,paid_at,created_at').eq('seller_id',currentUser.id).order('created_at',{ascending:false})
    ]);
    if (listingsError) throw listingsError;
    if (ordersError) throw ordersError;

    const allListings = listings || [];
    const soldOrders = (orders || []).filter(order => !['pending','cancelled'].includes(String(order.status || '').toLowerCase()));
    addedTotal.textContent = String(allListings.length);
    soldTotal.textContent = String(soldOrders.length);
    activeTotal.textContent = String(allListings.filter(item => item.status === 'active').length);

    const rows = buckets();
    const byKey = new Map(rows.map(row => [row.key,row]));
    allListings.forEach(item => { const row = byKey.get(monthKey(item.created_at)); if (row) row.added += 1; });
    soldOrders.forEach(order => { const row = byKey.get(monthKey(order.paid_at || order.created_at)); if (row) row.sold += 1; });
    const max = Math.max(1,...rows.flatMap(row => [row.added,row.sold]));
    chart.innerHTML = rows.map(row => `<div class="seller-chart-row"><span class="seller-chart-label">${safe(row.label)}</span><div class="seller-chart-track" title="${row.added} added"><div class="seller-chart-fill added" style="width:${Math.round(row.added/max*100)}%"></div></div><div class="seller-chart-track sold-track" title="${row.sold} sold"><div class="seller-chart-fill sold" style="width:${Math.round(row.sold/max*100)}%"></div></div></div>`).join('');

    const listingsById = new Map(allListings.map(item => [String(item.id), item]));
    const soldRows = soldOrders.slice(0,8).map(order => {
      const item = listingsById.get(String(order.listing_id)) || {};
      const number = order.item_number || item.item_number || `FL-${String(order.listing_id || order.id).padStart(8,'0')}`;
      const shortDescription = String(item.description || item.condition || 'Sold through Flipora').slice(0,110);
      return `<div class="seller-sold-row"><strong>${safe(item.title || 'Sold item')}</strong><p class="seller-sold-number">Item ${safe(number)}</p><p>${safe(shortDescription)}${shortDescription.length >= 110 ? '…' : ''}</p><p>Sold ${safe(date(order.paid_at || order.created_at))} · ${safe(money(Number(order.amount_total || 0)/100))}</p></div>`;
    });
    history.innerHTML = soldRows.length ? soldRows.join('') : '<p class="order-empty">No sold items yet.</p>';
  }

  function currentMode() { return document.querySelector('#accountDialog')?.dataset.accountMode || 'buyer'; }
  function renderMode() {
    const sellerMode = currentMode() === 'seller';
    section.hidden = !sellerMode;
    if (sellerMode && currentUser) loadSellerActivity().catch(error => { history.innerHTML = `<p class="order-empty">${safe(error.message || 'Could not load seller activity.')}</p>`; });
  }

  section.querySelector('#refreshSellerActivity').addEventListener('click', () => loadSellerActivity().then(() => showToast('Seller activity refreshed.')).catch(error => showToast(error.message)));
  window.addEventListener('flipora:account-mode', renderMode);
  window.addEventListener('flipora:membership-status', () => setTimeout(renderMode,150));
  window.addEventListener('flipora:seller-sales-updated', () => loadSellerActivity().catch(()=>{}));
  document.querySelector('#accountButton')?.addEventListener('click', () => setTimeout(renderMode,750));
  db.auth.onAuthStateChange((_event,session) => { if (session?.user) setTimeout(renderMode,950); });
  setInterval(() => { if (currentUser && document.querySelector('#accountDialog')?.open && currentMode()==='seller') loadSellerActivity().catch(()=>{}); },30000);
})();
