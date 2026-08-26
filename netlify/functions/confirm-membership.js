const { stripe, json, authenticatedUser, rest } = require('./_shared');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const user = await authenticatedUser(event);
    const { sessionId } = JSON.parse(event.body || '{}');
    if (!sessionId || !String(sessionId).startsWith('cs_')) return json(400, { error: 'Missing checkout session' });

    const session = await stripe().checkout.sessions.retrieve(String(sessionId));
    if (session.metadata?.purchase_type !== 'seller_membership' || session.metadata?.user_id !== user.id) {
      return json(403, { error: 'This membership payment does not belong to your account' });
    }
    if (session.payment_status !== 'paid') return json(202, { member: false, pending: true });

    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        membership_active: true,
        membership_paid_at: new Date().toISOString(),
        membership_checkout_session_id: session.id
      })
    });
    return json(200, { member: true, membership: 'lifetime' });
  } catch (error) {
    console.error('Membership confirmation error', error);
    return json(400, { error: error.message || 'Could not confirm membership' });
  }
};

