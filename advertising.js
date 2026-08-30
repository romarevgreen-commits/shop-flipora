(() => {
  const buttons = document.querySelectorAll('[data-ad-package]');
  const dialog = document.querySelector('#adDialog');
  const form = document.querySelector('#adForm');
  const packageLabels = { starter: 'Starter — 7 days · Included', business: 'Business — 30 days · Included', featured: 'Featured — 30-day priority placement · Included' };
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
    submit.textContent = 'Submitting…';
    try {
      const values = new FormData(form);
      const session = await getMemberSession();
      const response = await fetch('/.netlify/functions/create-ad-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ packageId: values.get('packageId'), businessName: values.get('businessName'), message: values.get('message'), destinationUrl: values.get('destinationUrl') })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not submit your advertisement.');
      form.reset();
      dialog.close();
      notify('Advertisement submitted for review. It is included with your lifetime membership.');
      submit.disabled = false;
      submit.textContent = originalText;
    } catch (error) {
      notify(error.message || 'Could not submit your advertisement.');
      submit.disabled = false;
      submit.textContent = originalText;
    }
  });
})();
