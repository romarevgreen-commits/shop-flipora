const ADMIN_EMAIL = 'romarevgreen@gmail.com';
const db = window.supabase.createClient(window.FLIPORA_CONFIG.supabaseUrl, window.FLIPORA_CONFIG.supabasePublishableKey);
const loginSection = document.querySelector('#adminLogin');
const dashboard = document.querySelector('#adminDashboard');
const message = document.querySelector('#adminMessage');
const loginForm = document.querySelector('#adminLoginForm');
const passwordUpdateForm = document.querySelector('#adminPasswordUpdateForm');
const passwordUpdateMessage = document.querySelector('#adminPasswordMessage');
let passwordRecoveryMode = location.hash.includes('type=recovery');
const tableHead = document.querySelector('#adminTableHead');
const tableBody = document.querySelector('#adminTableBody');
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
let adminData = null;
let activeTab = 'listings';

function toast(text) { const el = document.querySelector('#adminToast'); el.textContent = text; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000); }
function money(cents, currency = 'usd') { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(Number(cents || 0) / 100); }
function date(value) { return value ? new Date(value).toLocaleDateString() : '—'; }
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
  const response = await fetch('/.netlify/functions/admin-api', { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Administrator request failed');
  return body;
}
async function loadDashboard() {
  adminData = await adminRequest();
  loginSection.hidden = true; dashboard.hidden = false; document.querySelector('#adminSignOut').hidden = false;
  const revenue = adminData.orders.filter(order => ['paid','shipped','delivered','completed'].includes(order.status)).reduce((sum, order) => sum + Number(order.platform_fee || 0), 0);
  document.querySelector('#adminStats').innerHTML = `<div class="stat"><strong>${adminData.listings.length}</strong><span>Total listings</span></div><div class="stat"><strong>${adminData.orders.length}</strong><span>Total orders</span></div><div class="stat"><strong>${adminData.users.length}</strong><span>Registered accounts</span></div><div class="stat"><strong>${money(revenue)}</strong><span>Platform fees recorded</span></div>`;
  renderTable();
}
function filteredRows() { const query = document.querySelector('#adminSearch').value.trim().toLowerCase(); const rows = activeTab === 'members' ? adminData.profiles : adminData[activeTab]; return rows.filter(row => JSON.stringify(row).toLowerCase().includes(query)); }
function statusSelect(type, row, options) { const current = options.includes(row.status) ? [] : [row.status]; return `<select data-admin-type="${type}" data-admin-id="${row.id}">${current.map(option => `<option value="${option}" selected disabled>${escapeHtml(option)}</option>`).join('')}${options.map(option => `<option value="${option}"${row.status === option ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>`; }
function renderTable() {
  if (!adminData) return;
  const rows = filteredRows(); document.querySelector('#panelTitle').textContent = activeTab[0].toUpperCase() + activeTab.slice(1);
  if (activeTab === 'listings') { tableHead.innerHTML = '<tr><th>Item</th><th>Category</th><th>Price</th><th>Location</th><th>Date</th><th>Status / action</th></tr>'; tableBody.innerHTML = rows.map(row => `<tr><td><strong>${escapeHtml(row.title)}</strong><br>#${row.id}</td><td>${escapeHtml(row.category)}</td><td>$${Number(row.price).toLocaleString()}</td><td>${escapeHtml(row.city)}</td><td>${date(row.created_at)}</td><td>${statusSelect('listing', row, ['active','sold','hidden'])}</td></tr>`).join(''); }
  if (activeTab === 'orders') { tableHead.innerHTML = '<tr><th>Order</th><th>Listing</th><th>Total</th><th>Fee</th><th>Date</th><th>Status / action</th></tr>'; tableBody.innerHTML = rows.map(row => `<tr><td>#${row.id}</td><td>#${row.listing_id}</td><td>${money(row.amount_total,row.currency)}</td><td>${money(row.platform_fee,row.currency)}</td><td>${date(row.created_at)}</td><td>${statusSelect('order', row, ['shipped','delivered','completed','refunded','cancelled'])}</td></tr>`).join(''); }
  if (activeTab === 'members') { tableHead.innerHTML = '<tr><th>Member</th><th>City</th><th>Joined</th><th>Stripe payouts</th><th>Membership / action</th></tr>'; tableBody.innerHTML = rows.map(row => `<tr><td><strong>${escapeHtml(row.display_name || 'Flipora member')}</strong><br>${escapeHtml(row.id)}</td><td>${escapeHtml(row.city || '—')}</td><td>${date(row.created_at)}</td><td><span class="status ${row.stripe_onboarding_complete ? 'active' : ''}">${row.stripe_onboarding_complete ? 'Connected' : 'Not connected'}</span></td><td><select data-admin-type="membership" data-admin-id="${row.id}"><option value="true"${row.membership_active ? ' selected' : ''}>Active</option><option value="false"${!row.membership_active ? ' selected' : ''}>Inactive</option></select></td></tr>`).join(''); }
  if (activeTab === 'accounts') { tableHead.innerHTML = '<tr><th>Email</th><th>Created</th><th>Last sign in</th><th>Email status</th></tr>'; tableBody.innerHTML = rows.map(row => `<tr><td>${escapeHtml(row.email)}</td><td>${date(row.created_at)}</td><td>${date(row.last_sign_in_at)}</td><td><span class="status ${row.confirmed ? 'active' : ''}">${row.confirmed ? 'Verified' : 'Not verified'}</span></td></tr>`).join(''); }
  if (!rows.length) tableBody.innerHTML = '<tr><td colspan="6">No matching details found.</td></tr>';
}
document.querySelector('#adminLoginForm').addEventListener('submit', async event => { event.preventDefault(); message.textContent = ''; const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true; try { const password = new FormData(event.currentTarget).get('password'); const { error } = await db.auth.signInWithPassword({ email: ADMIN_EMAIL, password }); if (error) throw error; await loadDashboard(); } catch (error) { message.textContent = error.message; } finally { button.disabled = false; } });
document.querySelector('#createAdminAccount').addEventListener('click', async () => { const password = document.querySelector('#adminLoginForm').elements.password.value; if (password.length < 8) { message.textContent = 'Enter a password with at least 8 characters first.'; return; } message.textContent = 'Creating administrator account…'; const { data, error } = await db.auth.signUp({ email: ADMIN_EMAIL, password, options: { data: { display_name: 'Romare Green', phone: '478-336-3332' }, emailRedirectTo: `${location.origin}/admin.html` } }); if (error) { message.textContent = error.message; return; } message.textContent = data.session ? 'Account created. Opening dashboard…' : 'Account created. Check your email to verify it, then return here and sign in.'; if (data.session) loadDashboard().catch(error => message.textContent = error.message); });
passwordUpdateForm.addEventListener('submit', async event => {
  event.preventDefault();
  passwordUpdateMessage.textContent = '';
  const form = new FormData(event.currentTarget);
  const password = String(form.get('newPassword') || '');
  const confirmation = String(form.get('confirmPassword') || '');
  if (password.length < 8) { passwordUpdateMessage.textContent = 'Use at least 8 characters.'; return; }
  if (password !== confirmation) { passwordUpdateMessage.textContent = 'The passwords do not match.'; return; }
  const button = event.currentTarget.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const { error } = await db.auth.updateUser({ password });
    if (error) throw error;
    passwordRecoveryMode = false;
    history.replaceState({}, document.title, location.pathname);
    passwordUpdateForm.reset();
    passwordUpdateForm.hidden = true;
    loginForm.hidden = false;
    message.textContent = 'Password updated successfully.';
    await loadDashboard();
  } catch (error) {
    passwordUpdateMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

db.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session?.user?.email?.toLowerCase() === ADMIN_EMAIL) showPasswordRecovery();
});

document.querySelector('#resetAdminPassword').addEventListener('click', async () => { const { error } = await db.auth.resetPasswordForEmail(ADMIN_EMAIL, { redirectTo: `${location.origin}/admin.html` }); message.textContent = error ? error.message : 'Password reset email sent.'; });
document.querySelector('#adminSignOut').addEventListener('click', async () => { await db.auth.signOut(); dashboard.hidden = true; loginSection.hidden = false; document.querySelector('#adminSignOut').hidden = true; });
document.querySelector('#refreshAdmin').addEventListener('click', () => loadDashboard().then(() => toast('Administration details refreshed.')).catch(error => toast(error.message)));
document.querySelector('#adminTabs').addEventListener('click', event => { const button = event.target.closest('[data-tab]'); if (!button) return; activeTab = button.dataset.tab; document.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('active', item === button)); document.querySelector('#adminSearch').value = ''; renderTable(); });
document.querySelector('#adminSearch').addEventListener('input', renderTable);
tableBody.addEventListener('change', async event => { const select = event.target.closest('[data-admin-type]'); if (!select) return; select.disabled = true; try { const body = select.dataset.adminType === 'membership' ? { type: 'membership', id: select.dataset.adminId, active: select.value === 'true' } : { type: select.dataset.adminType, id: select.dataset.adminId, status: select.value }; await adminRequest({ method: 'PATCH', body: JSON.stringify(body) }); await loadDashboard(); toast('Website details updated.'); } catch (error) { toast(error.message); await loadDashboard(); } finally { select.disabled = false; } });
db.auth.getSession().then(({ data }) => {
  if (data.session?.user?.email?.toLowerCase() !== ADMIN_EMAIL) return;
  if (passwordRecoveryMode) showPasswordRecovery();
  else loadDashboard().catch(error => message.textContent = error.message);
});

