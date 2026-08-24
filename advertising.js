(() => {
  const buttons = document.querySelectorAll('[data-ad-package]');
  const dialog = document.querySelector('#adDialog');
  const form = document.querySelector('#adForm');
  const packageLabels = { starter: '$19 — 7 days', business: '$49 — 30 days', featured: '$99 — 30-day featured placement' };
  const notify = message => typeof window.showToast === 'function' ? window.showToast(message) : alert(message);
  const getMemberSession = async () => {
    const client = window.supabase?.createClient(window.FLIPORA_CONFIG.supabaseUrl, window.FLIPORA_CONFIG.supabasePublishableKey);
    if (!client) throw new Error('Membership verification is temporarily unavailable.');
    const { data } = await client.auth.getSession();
    if (!data.session) {
      document.querySelector('#createAccountButton')?.click();
      throw new Error('Create an account or sign in, then become a member to advertise.');
    }
    const response = await fetch('/.netlify/functions/connect-status', { headers: { Authorization: `Bearer ${data.session.access_token}` } });
    const status = await response.json();
    if (!response.ok) throw new Error(status.error || 'Could not verify membership.');
    if (!status.member) {
      document.querySelector('.membership-checkout-button')?.click();
      throw new Error('Lifetime membership is required before you can advertise.');
    }
    return data.session;
  };
  buttons.forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await getMemberSession();
    } catch (error) {
      notify(error.message);
      button.disabled = false;
      return;
    }
    button.disabled = false;
    form.elements.packageId.value = button.dataset.adPackage;
    document.querySelector('#adPackageSummary').textContent = `Selected package: ${packageLabels[button.dataset.adPackage]}`;
    dialog.showModal();
  }));
  document.querySelector('[data-close-ad]').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const originalText = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'Opening secure checkout…';
    try {
      const values = new FormData(form);
      const session = await getMemberSession();
      const response = await fetch('/.netlify/functions/create-ad-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ packageId: values.get('packageId'), businessName: values.get('businessName'), message: values.get('message'), destinationUrl: values.get('destinationUrl') })
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Could not start advertising checkout.');
      location.href = result.url;
    } catch (error) {
      notify(error.message || 'Could not start advertising checkout.');
      submit.disabled = false;
      submit.textContent = originalText;
    }
  });
  const status = new URLSearchParams(location.search).get('ad');
  if (status === 'success') notify('Ad payment received! We will review your advertisement details.');
  if (status === 'cancelled') notify('Advertising checkout cancelled. No payment was taken.');
})();
