(() => {
  const buttons = document.querySelectorAll('[data-ad-package]');
  const notify = message => typeof window.showToast === 'function' ? window.showToast(message) : alert(message);
  buttons.forEach(button => button.addEventListener('click', async () => {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Opening secure checkout…';
    try {
      const response = await fetch('/.netlify/functions/create-ad-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: button.dataset.adPackage })
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Could not start advertising checkout.');
      location.href = result.url;
    } catch (error) {
      notify(error.message || 'Could not start advertising checkout.');
      button.disabled = false;
      button.textContent = originalText;
    }
  }));
  const status = new URLSearchParams(location.search).get('ad');
  if (status === 'success') notify('Ad payment received! We will review your advertisement details.');
  if (status === 'cancelled') notify('Advertising checkout cancelled. No payment was taken.');
})();
