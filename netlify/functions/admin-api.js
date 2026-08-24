const { json, authenticatedUser, rest, supabaseUrl, supabaseSecret } = require('./_shared');

const ADMIN_EMAIL = 'romarevgreen@gmail.com';
const allowedListingStatuses = new Set(['active', 'sold', 'hidden']);
const allowedOrderStatuses = new Set(['pending', 'paid', 'shipped', 'delivered', 'completed', 'refunded', 'disputed']);

async function requireAdmin(event) {
  const user = await authenticatedUser(event);
  if (String(user.email || '').toLowerCase() !== ADMIN_EMAIL) throw new Error('Administrator access denied');
  return user;
}

async function authUsers() {
  const response = await fetch(`${supabaseUrl()}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: { apikey: supabaseSecret(), Authorization: `Bearer ${supabaseSecret()}` }
  });
  if (!response.ok) throw new Error('Could not load registered accounts');
  const body = await response.json();
  return (body.users || []).map(user => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    confirmed: Boolean(user.email_confirmed_at)
  }));
}

exports.handler = async event => {
  try {
    const admin = await requireAdmin(event);
    if (event.httpMethod === 'GET') {
      const [listings, orders, profiles, users] = await Promise.all([
        rest('listings?select=id,title,price,category,city,status,seller_id,created_at&order=created_at.desc&limit=200'),
        rest('orders?select=id,listing_id,buyer_id,seller_id,amount_total,platform_fee,currency,status,created_at,paid_at&order=created_at.desc&limit=200'),
        rest('profiles?select=id,display_name,city,membership_active,stripe_onboarding_complete,created_at&order=created_at.desc&limit=200'),
        authUsers()
      ]);
      return json(200, { admin: { email: admin.email, phone: '478-336-3332' }, listings, orders, profiles, users });
    }
    if (event.httpMethod !== 'PATCH') return json(405, { error: 'Method not allowed' });
    const body = JSON.parse(event.body || '{}');
    if (body.type === 'listing') {
      if (!allowedListingStatuses.has(body.status)) return json(400, { error: 'Invalid listing status' });
      const rows = await rest(`listings?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', body: JSON.stringify({ status: body.status }) });
      return json(200, { item: rows?.[0] || null });
    }
    if (body.type === 'order') {
      if (!allowedOrderStatuses.has(body.status)) return json(400, { error: 'Invalid order status' });
      const rows = await rest(`orders?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', body: JSON.stringify({ status: body.status }) });
      return json(200, { item: rows?.[0] || null });
    }
    if (body.type === 'membership') {
      const rows = await rest(`profiles?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', body: JSON.stringify({ membership_active: Boolean(body.active) }) });
      return json(200, { item: rows?.[0] || null });
    }
    return json(400, { error: 'Unknown administrator action' });
  } catch (error) {
    const denied = /access denied|sign in|required|session/i.test(error.message);
    return json(denied ? 403 : 500, { error: error.message || 'Administrator request failed' });
  }
};
