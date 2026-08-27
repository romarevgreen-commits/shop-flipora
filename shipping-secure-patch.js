(() => {
  if (window.__fliporaSecureShippingSubmit) return;
  window.__fliporaSecureShippingSubmit = true;

  document.addEventListener('submit', async event => {
    const form = event.target.closest?.('[data-shipping-form]');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const button = form.querySelector('button[type="submit"]');
    const original = button?.textContent || 'Save tracking';
    if (button) { button.disabled = true; button.textContent = 'Saving…'; }

    try {
      const values = new FormData(form);
      const { data } = await db.auth.getSession();
      const session = data.session;
      if (!session) throw new Error('Sign in required');

      const response = await fetch('/.netlify/functions/update-shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          orderId: Number(form.dataset.shippingForm),
          carrier: String(values.get('carrier') || ''),
          trackingNumber: String(values.get('tracking') || '').trim()
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not save tracking');

      const card = form.closest('.shipping-order');
      const status = card?.querySelector('.shipping-status');
      if (status) {
        status.textContent = 'shipped';
        status.classList.remove('paid');
        status.classList.add('shipped');
      }
      if (button) { button.disabled = false; button.textContent = 'Update tracking'; }
      if (typeof showToast === 'function') showToast('Tracking saved. The buyer was notified.');
      window.dispatchEvent(new CustomEvent('flipora:seller-sales-updated'));
    } catch (error) {
      if (button) { button.disabled = false; button.textContent = original; }
      if (typeof showToast === 'function') showToast(error.message || 'Could not save tracking.');
    }
  }, true);
})();
