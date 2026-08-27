const { json, authenticatedUser, rest } = require('./_shared');

const ALLOWED_CARRIERS = new Set(['UPS','FedEx','USPS','DHL','Other']);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const seller = await authenticatedUser(event);
    const body = JSON.parse(event.body || '{}');
    const orderId = Number(body.orderId);
    const carrier = String(body.carrier || '').trim();
    const trackingNumber = String(body.trackingNumber || '').trim();

    if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error('Valid order is required');
    if (!ALLOWED_CARRIERS.has(carrier)) throw new Error('Choose a valid shipping carrier');
    if (trackingNumber.length < 4 || trackingNumber.length > 120) throw new Error('Enter a valid tracking number');

    const orders = await rest(
      `orders?id=eq.${orderId}&seller_id=eq.${encodeURIComponent(seller.id)}&status=in.(paid,shipped)&select=id,buyer_id,seller_id,status,sale_number,item_number`
    );
    const order = orders?.[0];
    if (!order) throw new Error('Paid seller order not found');

    const now = new Date().toISOString();
    const rows = await rest(`orders?id=eq.${order.id}&seller_id=eq.${encodeURIComponent(seller.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        shipping_carrier: carrier,
        carrier,
        tracking_number: trackingNumber,
        status: 'shipped',
        shipped_at: now,
        tracking_updated_at: now
      })
    });

    const existing = await rest(`notifications?user_id=eq.${encodeURIComponent(order.buyer_id)}&order_id=eq.${order.id}&type=eq.tracking_added&select=id`);
    const message = `Tracking is now available for sale ${order.sale_number || order.item_number || order.id}.`;
    if (existing?.[0]?.id) {
      await rest(`notifications?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Your Flipora order shipped',
          message,
          created_at: now,
          read_at: null
        })
      });
    } else {
      await rest('notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: order.buyer_id,
          order_id: order.id,
          type: 'tracking_added',
          title: 'Your Flipora order shipped',
          message
        })
      });
    }

    return json(200, {
      order: rows?.[0] || null,
      notified: true
    });
  } catch (error) {
    console.error('Update shipping error:', error);
    const denied = /sign in|session|origin|not found/i.test(String(error.message || ''));
    return json(denied ? 403 : 400, { error: error.message || 'Could not update shipping' });
  }
};
