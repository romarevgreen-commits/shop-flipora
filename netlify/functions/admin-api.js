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

async function audit(admin, action, targetType, targetId, details = {}) {
  try {
    await rest('admin_audit_log', {
      method: 'POST',
      body: JSON.stringify({
        admin_id: admin.id,
        action,
        target_type: targetType,
        target_id: targetId == null ? null : String(targetId),
        details
      })
    });
  } catch (error) {
    console.error('Admin audit log error:', error);
  }
}

function buildSecurityAlerts(orders, users) {
  const alerts = [];
  const userById = new Map(users.map(user => [user.id, user]));
  const refundByBuyer = new Map();
  const refundBySeller = new Map();
  const disputeByBuyer = new Map();
  const disputeBySeller = new Map();

  for (const order of orders) {
    const status = String(order.status || '').toLowerCase();
    if (status === 'disputed') {
      alerts.push({
        code: 'open_dispute',
        severity: 'high',
        order_id: order.id,
        title: 'Open payment dispute',
        message: 'Review the order, shipment record, tracking, buyer and seller communications before taking action.'
      });
      disputeByBuyer.set(order.buyer_id, (disputeByBuyer.get(order.buyer_id) || 0) + 1);
      disputeBySeller.set(order.seller_id, (disputeBySeller.get(order.seller_id) || 0) + 1);
    }
    if (status === 'refunded') {
      alerts.push({
        code: 'refunded_order',
        severity: 'medium',
        order_id: order.id,
        title: 'Refunded order review',
        message: 'Confirm the reason for the refund and keep the order, shipment and communication history together for support records.'
      });
      refundByBuyer.set(order.buyer_id, (refundByBuyer.get(order.buyer_id) || 0) + 1);
      refundBySeller.set(order.seller_id, (refundBySeller.get(order.seller_id) || 0) + 1);
    }
    if (status === 'shipped' && !String(order.tracking_number || '').trim()) {
      alerts.push({
        code: 'shipped_without_tracking',
        severity: 'medium',
        order_id: order.id,
        title: 'Shipment missing tracking',
        message: 'The order is marked shipped but has no tracking number. Confirm shipment before treating the order as delivered.'
      });
    }
    const buyer = userById.get(order.buyer_id);
    if (buyer && !buyer.confirmed && ['paid','shipped','delivered','completed','disputed'].includes(status)) {
      alerts.push({
        code: 'unverified_buyer_order',
        severity: 'medium',
        order_id: order.id,
        user_id: order.buyer_id,
        title: 'Unverified buyer account with order activity',
        message: 'Confirm the account email before making manual account or refund changes.'
      });
    }
  }

  const repeated = [
    ['buyer_refunds', refundByBuyer, 'buyer', 'Repeated buyer refunds'],
    ['seller_refunds', refundBySeller, 'seller', 'Repeated seller refunds'],
    ['buyer_disputes', disputeByBuyer, 'buyer', 'Repeated buyer disputes'],
    ['seller_disputes', disputeBySeller, 'seller', 'Repeated seller disputes']
  ];
  for (const [code, counts, role, title] of repeated) {
    for (const [userId, count] of counts) {
      if (count < 2) continue;
      alerts.push({
        code,
        severity: count >= 3 ? 'high' : 'medium',
        user_id: userId,
        title,
        message: `${count} ${code.includes('refund') ? 'refunds' : 'disputes'} are connected to this ${role} account. Review the individual orders before deciding whether any restriction is appropriate.`
      });
    }
  }

  return alerts.slice(0, 100);
}

exports.handler = async event => {
  try {
    const admin = await requireAdmin(event);
    if (event.httpMethod === 'GET') {
      const [listings, orders, profiles, users, auditLog] = await Promise.all([
        rest('listings?select=id,item_number,title,price,category,city,status,seller_id,created_at&order=created_at.desc&limit=500'),
        rest('orders?select=id,item_number,listing_id,buyer_id,seller_id,amount_total,platform_fee,currency,status,shipping_carrier,tracking_number,shipped_at,tracking_updated_at,created_at,paid_at,refunded_at,disputed_at&order=created_at.desc&limit=500'),
        rest('profiles?select=id,display_name,city,contact_email,contact_phone,membership_active,membership_paid_at,stripe_onboarding_complete,created_at&order=created_at.desc&limit=500'),
        authUsers(),
        rest('admin_audit_log?select=id,admin_id,action,target_type,target_id,details,created_at&order=created_at.desc&limit=100')
      ]);
      return json(200, {
        admin: { email: admin.email, phone: '478-336-3332' },
        listings,
        orders,
        profiles,
        users,
        auditLog,
        securityAlerts: buildSecurityAlerts(orders, users),
        privacy: { payment_card_details_exposed: false }
      });
    }

    if (event.httpMethod !== 'PATCH') return json(405, { error: 'Method not allowed' });
    const body = JSON.parse(event.body || '{}');

    if (body.type === 'listing') {
      if (!allowedListingStatuses.has(body.status)) return json(400, { error: 'Invalid listing status' });
      const rows = await rest(`listings?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', body: JSON.stringify({ status: body.status }) });
      await audit(admin, 'listing_status_changed', 'listing', body.id, { status: body.status });
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
      await audit(admin, body.status === 'refunded' ? 'order_refunded' : 'order_status_changed', 'order', body.id, { status: body.status });
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
      await audit(admin, 'tracking_updated', 'order', body.id, { carrier: values.shipping_carrier, mark_shipped: body.markShipped !== false });
      return json(200, { item: rows?.[0] || null });
    }

    if (body.type === 'membership') {
      const rows = await rest(`profiles?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', body: JSON.stringify({ membership_active: Boolean(body.active) }) });
      await audit(admin, 'membership_changed', 'account', body.id, { active: Boolean(body.active) });
      return json(200, { item: rows?.[0] || null });
    }

    if (body.type === 'account_reset') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return json(400, { error: 'Valid account email required' });
      await sendPasswordReset(email);
      await audit(admin, 'password_reset_sent', 'account', body.id || email, { email });
      return json(200, { sent: true });
    }

    return json(400, { error: 'Unknown administrator action' });
  } catch (error) {
    const denied = /access denied|sign in|required|session/i.test(error.message);
    return json(denied ? 403 : 500, { error: error.message || 'Administrator request failed' });
  }
};
