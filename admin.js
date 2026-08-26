const ADMIN_EMAIL = 'romarevgreen@gmail.com';
const db = window.supabase.createClient(window.FLIPORA_CONFIG.supabaseUrl, window.FLIPORA_CONFIG.supabasePublishableKey);
const loginSection = document.querySelector('#adminLogin');
const dashboard = document.querySelector('#adminDashboard');
const message = document.querySelector('#adminMessage');
const loginForm = document.querySelector('#adminLoginForm');
const passwordUpdateForm = document.querySelector('#adminPasswordUpdateForm');
const passwordUpdateMessage = document.querySelector('#adminPasswordMessage');
const tableHead = document.querySelector('#adminTableHead');
const tableBody = document.querySelector('#adminTableBody');
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
let passwordRecoveryMode = location.hash.includes('type=recovery');
let adminData = null;
let activeTab = 'listings';

function toast(text) { const el = document.querySelector('#adminToast'); el.textContent = text; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3200); }
function money(cents, currency = 'usd') { return new Intl.NumberFormat('en-US', { style: 'currency', currency: String(currency || 'usd').toUpperCase() }).format(Number(cents || 0) / 100); }
function date(value) { return value ? new Date(value).toLocaleDateString() : '—'; }
function dateTime(value) { return value ? new Date(value).toLocaleString() : '—'; }
function safeStatus(value) { return escapeHtml(String(value || 'unknown').toLowerCase()); }
function profileMap() { return new Map((adminData?.profiles || []).map(row => [row.id, row])); }
function userMap() { return new Map((adminData?.users || []).map(row => [row.id, row])); }
function userEmail(id) { return userMap().get(id)?.email || 'Unknown account'; }
function displayName(id) { return profileMap().get(id)?.display_name || userEmail(id); }

function showPasswordRecovery() {
  passwordRecoveryMode = true;
  loginSection.hidden = false;
  dashboard.hidden = true;
  loginForm.hidden = true;
  passwordUpdateForm.hidden = false;
  document.querySelector('#adminSignOut').hidden = true;
  passwordUpdateMessage.textContent = '';
}

async function adminRequest(options = {}) {
  const { data } = await db.auth.getSession();
  if (!data.session) throw new Error('Administrator sign in required');
  const response = await fetch('/.netlify/functions/admin-api', {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, ...(options.headers || {}) }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Administrator request failed');
  return body;
}

function orderIsRevenue(order) { return ['paid','shipped','delivered','completed'].includes(String(order.status || '').toLowerCase()); }
function orderIsRefund(order) { return String(order.status || '').toLowerCase() === 'refunded'; }

function renderStats() {
  const orders = adminData.orders || [];
  const platformRevenue = orders.filter(orderIsRevenue).reduce((sum, order) => sum + Number(order.platform_fee || 0), 0);
  const grossSales = orders.filter(orderIsRevenue).reduce((sum, order) => sum + Number(order.amount_total || 0), 0);
  const refunds = orders.filter(orderIsRefund).reduce((sum, order) => sum + Number(order.amount_total || 0), 0);
  const sold = orders.filter(order => ['paid','shipped','delivered','completed'].includes(String(order.status || '').toLowerCase())).length;
  document.querySelector('#adminStats').innerHTML = `
    <div class="stat"><strong>${money(platformRevenue)}</strong><span>Platform revenue</span></div>
    <div class="stat"><strong>${money(grossSales)}</strong><span>Gross item sales</span></div>
    <div class="stat"><strong>${money(refunds)}</strong><span>Refunded sales</span></div>
    <div class="stat"><strong>${sold}</strong><span>Items sold</span></div>
    <div class="stat"><strong>${adminData.users.length}</strong><span>Client accounts</span></div>
    <div class="stat"><strong>${adminData.listings.filter(row => row.status === 'active').length}</strong><span>Active listings</span></div>`;
}

function monthBuckets() {
  const now = new Date();
  const buckets = [];
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'short' }), revenue: 0, refunds: 0 });
  }
  for (const order of adminData.orders || []) {
    const created = new Date(order.paid_at || order.created_at);
    const bucket = buckets.find(item => item.year === created.getFullYear() && item.month === created.getMonth());
    if (!bucket) continue;
    if (orderIsRevenue(order)) bucket.revenue += Number(order.platform_fee || 0);
    if (orderIsRefund(order)) bucket.refunds += Number(order.amount_total || 0);
  }
  return buckets;
}

function renderRevenueChart() {
  const canvas = document.querySelector('#revenueChart');
  if (!canvas) return;
  const buckets = monthBuckets();
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width || 720));
  const height = 190;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  const padding = { left: 54, right: 14, top: 12, bottom: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxValue = Math.max(100, ...buckets.flatMap(item => [item.revenue, item.refunds]));
  ctx.font = '11px system-ui';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#e5e0ef';
  ctx.fillStyle = '#6d687b';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + chartH - (chartH * i / 4);
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
    const value = maxValue * i / 4;
    ctx.textAlign = 'right';
    ctx.fillText(value >= 100000 ? '$' + Math.round(value / 100000) + 'k' : '$' + Math.round(value / 100), padding.left - 8, y);
  }
  const groupW = chartW / buckets.length;
  const barW = Math.min(24, groupW * 0.27);
  buckets.forEach((item, index) => {
    const center = padding.left + groupW * index + groupW / 2;
    const revH = chartH * item.revenue / maxValue;
    const refH = chartH * item.refunds / maxValue;
    ctx.fillStyle = '#5b35f2';
    ctx.fillRect(center - barW - 2, padding.top + chartH - revH, barW, revH);
    ctx.fillStyle = '#b42318';
    ctx.fillRect(center + 2, padding.top + chartH - refH, barW, refH);
    ctx.fillStyle = '#6d687b';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, center, height - 13);
  });
}

function renderHealth() {
  const orders = adminData.orders || [];
  const awaitingShipment = orders.filter(order => ['paid','pending'].includes(String(order.status || '').toLowerCase()) && !order.tracking_number).length;
  const trackingMissing = orders.filter(order => String(order.status || '').toLowerCase() === 'shipped' && !order.tracking_number).length;
  const disputes = orders.filter(order => String(order.status || '').toLowerCase() === 'disputed').length;
  const activeMembers = (adminData.profiles || []).filter(profile => profile.membership_active).length;
  const unverified = (adminData.users || []).filter(user => !user.confirmed).length;
  document.querySelector('#adminHealth').innerHTML = `
    <div><p class="eyebrow">Accuracy checks</p><h2>Operations health</h2></div>
    <div class="health-row"><span>Awaiting shipment</span><strong>${awaitingShipment}</strong></div>
    <div class="health-row"><span>Shipped without tracking</span><strong>${trackingMissing}</strong></div>
    <div class="health-row"><span>Open disputes</span><strong>${disputes}</strong></div>
    <div class="health-row"><span>Active lifetime members</span><strong>${activeMembers}</strong></div>
    <div class="health-row"><span>Unverified accounts</span><strong>${unverified}</strong></div>
    <p class="privacy-note">Privacy protection: client card numbers, CVVs, and full payment-card details are not available in this dashboard.</p>`;
}

async function loadDashboard() {
  adminData = await adminRequest();
  loginSection.hidden = true;
  dashboard.hidden = false;
  document.querySelector('#adminSignOut').hidden = false;
  renderStats();
  renderHealth();
  renderTable();
  requestAnimationFrame(renderRevenueChart);
}

function clientAccountRows() {
  const profiles = profileMap();
  const listings = adminData.listings || [];
  const orders = adminData.orders || [];
  return (adminData.users || []).map(user => {
    const profile = profiles.get(user.id) || {};
    const listed = listings.filter(row => row.seller_id === user.id).length;
    const sold = orders.filter(row => row.seller_id === user.id && ['paid','shipped','delivered','completed'].includes(String(row.status || '').toLowerCase())).length;
    const bought = orders.filter(row => row.buyer_id === user.id && !['cancelled'].includes(String(row.status || '').toLowerCase())).length;
    return { ...user, ...profile, listed, sold, bought };
  });
}

function filteredRows() {
  const query = document.querySelector('#adminSearch').value.trim().toLowerCase();
  let rows;
  if (activeTab === 'members') rows = adminData.profiles;
  else if (activeTab === 'accounts') rows = clientAccountRows();
  else if (activeTab === 'shipping') rows = adminData.orders;
  else rows = adminData[activeTab];
  if (!query) return rows;
  return rows.filter(row => {
    const enriched = { ...row };
    if (row.buyer_id) enriched.buyer_email = userEmail(row.buyer_id);
    if (row.seller_id) enriched.seller_email = userEmail(row.seller_id);
    return JSON.stringify(enriched).toLowerCase().includes(query);
  });
}

function statusSelect(type, row, options) {
  const current = options.includes(row.status) ? [] : [row.status].filter(Boolean);
  return `<select data-admin-type="${type}" data-admin-id="${row.id}">${current.map(option => `<option value="${escapeHtml(option)}" selected disabled>${escapeHtml(option)}</option>`).join('')}${options.map(option => `<option value="${option}"${row.status === option ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>`;
}

function renderTable() {
  if (!adminData) return;
  const rows = filteredRows();
  const titleMap = { listings: 'Listings & item numbers', orders: 'Orders & refunds', shipping: 'Shipping & tracking', members: 'Memberships', accounts: 'Client accounts' };
  document.querySelector('#panelTitle').textContent = titleMap[activeTab] || activeTab;

  if (activeTab === 'listings') {
    tableHead.innerHTML = '<tr><th>Item number</th><th>Item</th><th>Seller</th><th>Price</th><th>Location</th><th>Date</th><th>Status / action</th></tr>';
    tableBody.innerHTML = rows.map(row => `<tr><td class="mono"><strong>${escapeHtml(row.item_number || '—')}</strong></td><td><strong>${escapeHtml(row.title)}</strong><br><span class="muted">${escapeHtml(row.category)}</span></td><td>${escapeHtml(displayName(row.seller_id))}<br><span class="muted">${escapeHtml(userEmail(row.seller_id))}</span></td><td>$${Number(row.price).toLocaleString()}</td><td>${escapeHtml(row.city)}</td><td>${date(row.created_at)}</td><td>${statusSelect('listing', row, ['active','sold','hidden'])}</td></tr>`).join('');
  }

  if (activeTab === 'orders') {
    tableHead.innerHTML = '<tr><th>Order / item</th><th>Buyer</th><th>Seller</th><th>Total</th><th>Flipora fee</th><th>Dates</th><th>Status / action</th></tr>';
    tableBody.innerHTML = rows.map(row => `<tr><td><strong>Order #${row.id}</strong><br><span class="mono">${escapeHtml(row.item_number || 'Item #' + row.listing_id)}</span></td><td>${escapeHtml(userEmail(row.buyer_id))}</td><td>${escapeHtml(userEmail(row.seller_id))}</td><td>${money(row.amount_total,row.currency)}</td><td>${money(row.platform_fee,row.currency)}</td><td>Ordered: ${date(row.created_at)}<br>Paid: ${date(row.paid_at)}${row.refunded_at ? `<br>Refunded: ${date(row.refunded_at)}` : ''}</td><td><span class="status ${safeStatus(row.status)}">${escapeHtml(row.status)}</span><br>${statusSelect('order', row, ['paid','shipped','delivered','completed','refunded','cancelled','disputed'])}</td></tr>`).join('');
  }

  if (activeTab === 'shipping') {
    tableHead.innerHTML = '<tr><th>Order / item</th><th>Buyer</th><th>Seller</th><th>Status</th><th>Current tracking</th><th>Update tracking</th></tr>';
    tableBody.innerHTML = rows.map(row => `<tr><td><strong>Order #${row.id}</strong><br><span class="mono">${escapeHtml(row.item_number || 'Item #' + row.listing_id)}</span></td><td>${escapeHtml(userEmail(row.buyer_id))}</td><td>${escapeHtml(userEmail(row.seller_id))}</td><td><span class="status ${safeStatus(row.status)}">${escapeHtml(row.status)}</span><br><span class="muted">Shipped ${dateTime(row.shipped_at)}</span></td><td><strong>${escapeHtml(row.shipping_carrier || '—')}</strong><br><span class="mono">${escapeHtml(row.tracking_number || 'No tracking yet')}</span><br><span class="muted">Updated ${dateTime(row.tracking_updated_at)}</span></td><td><div class="tracking-editor" data-tracking-order="${row.id}"><select data-track-carrier><option${row.shipping_carrier === 'UPS' ? ' selected' : ''}>UPS</option><option${row.shipping_carrier === 'FedEx' ? ' selected' : ''}>FedEx</option><option${row.shipping_carrier === 'USPS' ? ' selected' : ''}>USPS</option><option${row.shipping_carrier === 'DHL' ? ' selected' : ''}>DHL</option><option${row.shipping_carrier === 'Other' ? ' selected' : ''}>Other</option></select><input data-track-number maxlength="120" value="${escapeHtml(row.tracking_number || '')}" placeholder="Tracking number"><button data-save-tracking type="button">Save</button></div></td></tr>`).join('');
  }

  if (activeTab === 'members') {
    tableHead.innerHTML = '<tr><th>Member</th><th>Contact</th><th>Joined</th><th>Stripe payouts</th><th>Membership / action</th></tr>';
    tableBody.innerHTML = rows.map(row => `<tr><td><strong>${escapeHtml(row.display_name || 'Flipora member')}</strong><br><span class="mono">${escapeHtml(row.id)}</span></td><td>${escapeHtml(row.contact_email || userEmail(row.id))}<br>${escapeHtml(row.contact_phone || '')}<br>${escapeHtml(row.city || '—')}</td><td>${date(row.created_at)}${row.membership_paid_at ? `<br><span class="muted">Paid ${date(row.membership_paid_at)}</span>` : ''}</td><td><span class="status ${row.stripe_onboarding_complete ? 'active' : ''}">${row.stripe_onboarding_complete ? 'Connected' : 'Not connected'}</span></td><td><select data-admin-type="membership" data-admin-id="${row.id}"><option value="true"${row.membership_active ? ' selected' : ''}>Active</option><option value="false"${!row.membership_active ? ' selected' : ''}>Inactive</option></select></td></tr>`).join('');
  }

  if (activeTab === 'accounts') {
    tableHead.innerHTML = '<tr><th>Client</th><th>Membership</th><th>Marketplace activity</th><th>Account dates</th><th>Email status</th><th>Account action</th></tr>';
    tableBody.innerHTML = rows.map(row => `<tr><td><strong>${escapeHtml(row.display_name || row.email || 'Client')}</strong><br>${escapeHtml(row.email || '—')}<br>${escapeHtml(row.contact_phone || '')}<br><span class="muted">${escapeHtml(row.city || '')}</span></td><td><span class="status ${row.membership_active ? 'active' : ''}">${row.membership_active ? 'Lifetime member' : 'Not active'}</span></td><td><strong>${row.bought}</strong> bought · <strong>${row.sold}</strong> sold · <strong>${row.listed}</strong> listed</td><td>Created: ${date(row.created_at)}<br>Last sign-in: ${dateTime(row.last_sign_in_at)}</td><td><span class="status ${row.confirmed ? 'active' : ''}">${row.confirmed ? 'Verified' : 'Not verified'}</span></td><td><div class="cell-actions"><button class="secondary" type="button" data-reset-account data-email="${escapeHtml(row.email)}">Send password reset</button></div><span class="muted">No payment-card data shown.</span></td></tr>`).join('');
  }

  if (!rows.length) tableBody.innerHTML = '<tr><td colspan="7">No matching details found.</td></tr>';
}

document.querySelector('#adminLoginForm').addEventListener('submit', async event => {
  event.preventDefault(); message.textContent = '';
  const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true;
  try {
    const password = new FormData(event.currentTarget).get('password');
    const { error } = await db.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
    if (error) throw error;
    await loadDashboard();
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

document.querySelector('#createAdminAccount').addEventListener('click', async () => {
  const password = document.querySelector('#adminLoginForm').elements.password.value;
  if (password.length < 8) { message.textContent = 'Enter a password with at least 8 characters first.'; return; }
  message.textContent = 'Creating administrator account…';
  const { data, error } = await db.auth.signUp({ email: ADMIN_EMAIL, password, options: { data: { display_name: 'Flipora Administrator' }, emailRedirectTo: `${location.origin}/admin.html` } });
  if (error) { message.textContent = error.message; return; }
  message.textContent = data.session ? 'Account created. Opening dashboard…' : 'Account created. Check your email to verify it, then return here and sign in.';
  if (data.session) loadDashboard().catch(error => message.textContent = error.message);
});

passwordUpdateForm.addEventListener('submit', async event => {
  event.preventDefault(); passwordUpdateMessage.textContent = '';
  const form = new FormData(event.currentTarget);
  const password = String(form.get('newPassword') || '');
  const confirmation = String(form.get('confirmPassword') || '');
  if (password.length < 8) { passwordUpdateMessage.textContent = 'Use at least 8 characters.'; return; }
  if (password !== confirmation) { passwordUpdateMessage.textContent = 'The passwords do not match.'; return; }
  const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true;
  try {
    const { error } = await db.auth.updateUser({ password });
    if (error) throw error;
    passwordRecoveryMode = false;
    history.replaceState({}, document.title, location.pathname);
    passwordUpdateForm.reset(); passwordUpdateForm.hidden = true; loginForm.hidden = false;
    message.textContent = 'Password updated successfully.';
    await loadDashboard();
  } catch (error) { passwordUpdateMessage.textContent = error.message; }
  finally { button.disabled = false; }
});

db.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session?.user?.email?.toLowerCase() === ADMIN_EMAIL) showPasswordRecovery();
});

document.querySelector('#changeAdminPassword').addEventListener('click', showPasswordRecovery);
document.querySelector('#resetAdminPassword').addEventListener('click', async () => {
  const { error } = await db.auth.resetPasswordForEmail(ADMIN_EMAIL, { redirectTo: `${location.origin}/admin.html` });
  message.textContent = error ? error.message : 'Password reset email sent.';
});
document.querySelector('#adminSignOut').addEventListener('click', async () => { await db.auth.signOut(); dashboard.hidden = true; loginSection.hidden = false; document.querySelector('#adminSignOut').hidden = true; });
document.querySelector('#refreshAdmin').addEventListener('click', () => loadDashboard().then(() => toast('Administration details refreshed.')).catch(error => toast(error.message)));
document.querySelector('#adminTabs').addEventListener('click', event => {
  const button = event.target.closest('[data-tab]'); if (!button) return;
  activeTab = button.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelector('#adminSearch').value = '';
  renderTable();
});
document.querySelector('#adminSearch').addEventListener('input', renderTable);

window.addEventListener('resize', () => { if (!dashboard.hidden) renderRevenueChart(); });

tableBody.addEventListener('change', async event => {
  const select = event.target.closest('[data-admin-type]'); if (!select) return;
  select.disabled = true;
  try {
    const body = select.dataset.adminType === 'membership'
      ? { type: 'membership', id: select.dataset.adminId, active: select.value === 'true' }
      : { type: select.dataset.adminType, id: select.dataset.adminId, status: select.value };
    await adminRequest({ method: 'PATCH', body: JSON.stringify(body) });
    await loadDashboard(); toast('Website details updated.');
  } catch (error) { toast(error.message); await loadDashboard(); }
  finally { select.disabled = false; }
});

tableBody.addEventListener('click', async event => {
  const trackingButton = event.target.closest('[data-save-tracking]');
  if (trackingButton) {
    const editor = trackingButton.closest('[data-tracking-order]');
    const id = editor.dataset.trackingOrder;
    const carrier = editor.querySelector('[data-track-carrier]').value;
    const trackingNumber = editor.querySelector('[data-track-number]').value.trim();
    if (!trackingNumber) return toast('Enter a tracking number first.');
    trackingButton.disabled = true; trackingButton.textContent = 'Saving…';
    try {
      await adminRequest({ method: 'PATCH', body: JSON.stringify({ type: 'tracking', id, carrier, trackingNumber, markShipped: true }) });
      await loadDashboard(); toast('Tracking updated for buyer and seller.');
    } catch (error) { toast(error.message); }
    finally { trackingButton.disabled = false; trackingButton.textContent = 'Save'; }
    return;
  }

  const resetButton = event.target.closest('[data-reset-account]');
  if (resetButton) {
    const email = resetButton.dataset.email;
    if (!email) return toast('This client account has no email address.');
    resetButton.disabled = true; resetButton.textContent = 'Sending…';
    try {
      await adminRequest({ method: 'PATCH', body: JSON.stringify({ type: 'account_reset', email }) });
      toast(`Password reset sent to ${email}.`);
    } catch (error) { toast(error.message); }
    finally { resetButton.disabled = false; resetButton.textContent = 'Send password reset'; }
  }
});

db.auth.getSession().then(({ data }) => {
  if (data.session?.user?.email?.toLowerCase() !== ADMIN_EMAIL) return;
  if (passwordRecoveryMode) showPasswordRecovery();
  else loadDashboard().catch(error => message.textContent = error.message);
});
