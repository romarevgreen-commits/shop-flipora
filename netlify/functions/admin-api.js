const { stripe, json, authenticatedUser, rest, supabaseUrl, supabaseSecret, siteUrl } = require('./_shared');

const ADMIN_EMAIL = 'romarevgreen@gmail.com';
const allowedListingStatuses = new Set(['active', 'sold', 'hidden']);
const allowedOrderStatuses = new Set(['pending', 'paid', 'shipped', 'delivered', 'completed', 'refunded', 'cancelled', 'disputed']);
const allowedCarriers = new Set(['UPS', 'FedEx', 'USPS', 'DHL', 'Other', '']);

async function requireAdmin(event) {
  const user = await authenticatedUser(event);
  if (String(user.email || '').toLowerCase() !== ADMIN_EMAIL) throw new Error('Administrator access denied');
  return user;
}

async function authUsers() {
  const response = await fetch(`${supabaseUrl()}/auth/v1/admin/users?page=1&per_page=500`, {
    headers: { apikey: supabaseSecret(), Authorization: `Bearer ${supabaseSecret()}` }
  });
  if (!response.ok) throw new Error('Could not load registered accounts');
  const body = await response.json();
  return (body.users || []).map(user => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    confirmed: Boolean(user.email_confirmed_at),
    banned_until: user.banned_until || null
  }));
}

async function sendPasswordReset(email) {
  const response = await fetch(`${supabaseUrl()}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: supabaseSecret(),
      Authorization: `Bearer ${supabaseSecret()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, redirect_to: `${siteUrl()}/` })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.msg || body.message || 'Could not send password reset email');
  }
}

exports.handler = async event => {
  try {
    const admin = await requireAdmin(event);
    if (event.httpMethod === 'GET') {
      const [listings, orders, profiles, users] = await Promise.all([
        rest('listings?select=id,item_number,title,price,category,city,status,seller_id,created_at&order=created_at.desc&limit=500'),
        rest('orders?select=id,item_number,listing_id,buyer_id,seller_id,amount_total,platform_fee,currency,status,shipping_carrier,tracking_number,shipped_at,tracking_updated_at,created_at,paid_at,refunded_at,disputed_at&order=created_at.desc&limit=500'),
        rest('profiles?select=id,display_name,city,contact_email,contact_phone,membership_active,membership_paid_at,stripe_onboarding_complete,created_at&order=created_at.desc&limit=500'),
        authUsers()
      ]);
      return json(200, {
        admin: { email: admin.email, phone: '478-336-3332' },
        listings,
        orders,
        profiles,
        users,
        privacy: { payment_card_details_exposed: false }
      });
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
      if (body.status === 'refunded') {
        const orders = await rest(`orders?id=eq.${encodeURIComponent(body.id)}&select=id,status,stripe_payment_intent_id`);
        const order = orders?.[0];
        if (!order?.stripe_payment_intent_id) return json(400, { error: 'This order has no completed Stripe payment' });
        if (order.status !== 'refunded') {
          await stripe().refunds.create({
            payment_intent: order.stripe_payment_intent_id,
            reverse_transfer: true,
            refund_application_fee: true,
            metadata: { flipora_order_id: String(order.id), initiated_by: admin.id }
          }, {
            idempotencyKey: `flipora-admin-refund-${order.id}`
          });
        }
      }
      const values = { status: body.status };
      if (body.status === 'shipped') values.shipped_at = new Date().toISOString();
      if (body.status === 'refunded') values.refunded_at = new Date().toISOString();
      const rows = await rest(`orders?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', body: JSON.stringify(values) });
      return json(200, { item: rows?.[0] || null });
    }

    if (body.type === 'tracking') {
      const carrier = String(body.carrier || '').trim();
      const trackingNumber = String(body.trackingNumber || '').trim().slice(0, 120);
      if (!allowedCarriers.has(carrier)) return json(400, { error: 'Invalid shipping carrier' });
      if (!trackingNumber) return json(400, { error: 'Tracking number is required' });
      const values = {
        shipping_carrier: carrier || 'Other',
        tracking_number: trackingNumber,
        tracking_updated_at: new Date().toISOString(),
        shipped_at: body.markShipped === false ? undefined : new Date().toISOString(),
        status: body.markShipped === false ? undefined : 'shipped'
      };
      Object.keys(values).forEach(key => values[key] === undefined && delete values[key]);
      const rows = await rest(`orders?id=eq.${encodeURIComponent(body.id)}&select=*`, { method: 'PATCH', body: JSON.stringify(values) });
      return json(200, { item: rows?.[0] || null });
    }

    if (body.type === 'membership') {
      const rows = await rest(`profiles?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', body: JSON.stringify({ membership_active: Boolean(body.active) }) });
      return json(200, { item: rows?.[0] || null });
    }

    if (body.type === 'account_reset') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return json(400, { error: 'Valid account email required' });
      await sendPasswordReset(email);
      return json(200, { sent: true });
    }

    return json(400, { error: 'Unknown administrator action' });
  } catch (error) {
    const denied = /access denied|sign in|required|session/i.test(error.message);
    return json(denied ? 403 : 500, { error: error.message || 'Administrator request failed' });
  }
};
