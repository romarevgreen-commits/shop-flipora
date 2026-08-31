(() => {
  const detailButton = document.querySelector('#detailMessageSellerButton');
  if (!detailButton) return;

  let lookupToken = 0;

  function openEmail(email, title) {
    const subject = 'Question about ' + (title || 'your Flipora listing');
    const mailto = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(subject);
    const link = document.createElement('a');
    link.href = mailto;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function loadSellerEmail() {
    const sellerId = detailButton.dataset.sellerId;
    const token = ++lookupToken;
    detailButton.dataset.sellerEmail = '';
    detailButton.textContent = 'Finding seller email…';
    if (!sellerId) return;

    const { data, error } = await db.from('profiles')
      .select('contact_email')
      .eq('id', sellerId)
      .maybeSingle();
    if (token !== lookupToken || detailButton.dataset.sellerId !== sellerId) return;

    const email = String(data?.contact_email || '').trim();
    if (error || !email) {
      detailButton.textContent = 'Seller email unavailable';
      detailButton.disabled = true;
      return;
    }
    detailButton.dataset.sellerEmail = email;
    detailButton.textContent = 'Email ' + email;
    detailButton.disabled = false;
    detailButton.setAttribute('aria-label', 'Email seller at ' + email);
  }

  detailButton.addEventListener('click', async () => {
    if (!currentUser) {
      listingDialog.close();
      openAuth('signin');
      document.querySelector('#authMessage').textContent = 'Sign in to email this seller.';
      return;
    }
    if (detailButton.dataset.sellerId === currentUser.id) {
      showToast('This is your own listing.');
      return;
    }

    let email = detailButton.dataset.sellerEmail;
    if (!email) {
      await loadSellerEmail();
      email = detailButton.dataset.sellerEmail;
    }
    if (!email) {
      showToast('This seller email is unavailable.');
      return;
    }
    openEmail(email, detailButton.dataset.listingTitle);
  });

  new MutationObserver(loadSellerEmail).observe(detailButton, {
    attributes: true,
    attributeFilter: ['data-seller-id']
  });
})();