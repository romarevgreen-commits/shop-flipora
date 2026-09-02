(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('platform') === 'android') sessionStorage.setItem('flipora-platform', 'android');
  const playSafe = sessionStorage.getItem('flipora-platform') === 'android';
  const blockedKey = 'flipora-blocked-sellers';
  const blockedSellers = () => new Set(JSON.parse(localStorage.getItem(blockedKey) || '[]'));
  const saveBlocked = values => localStorage.setItem(blockedKey, JSON.stringify([...values]));

  if (playSafe) {
    document.documentElement.dataset.platform = 'android';
    const hideMembershipPurchaseControls = () => {
      document.querySelectorAll('.membership-checkout-button').forEach(button => {
        button.disabled = true;
        button.classList.add('play-safe-hidden');
      });
      const gate = document.querySelector('.opportunity-member-lock');
      if (gate && gate.dataset.playSafe !== 'true') {
        gate.dataset.playSafe = 'true';
        gate.innerHTML = '<span aria-hidden="true">🔒</span><div><strong>Seller tools for existing members</strong><p>Membership purchases are unavailable in this Android version. Existing members can sign in to use seller tools.</p></div>';
      }
    };
    hideMembershipPurchaseControls();
    new MutationObserver(hideMembershipPurchaseControls).observe(document.body, { childList: true, subtree: true });
    const cover = document.querySelector('.membership-cover-card');
    if (cover) cover.innerHTML = '<div><span>Seller membership</span><strong>Web access only</strong><p>Seller membership purchases are unavailable in the Android app. Existing members can sign in and use their account.</p></div>';
    const advertiseIntro = document.querySelector('#advertise .advertise-copy > p:not(.eyebrow)');
    if (advertiseIntro) advertiseIntro.textContent = 'Existing lifetime members can reach local shoppers, sellers, and business owners with the advertising tools included in their account.';
    const adDisclosure = document.querySelector('#advertise .ad-disclosure');
    if (adDisclosure) adDisclosure.innerHTML = '<strong>Advertising tools are available to existing lifetime members.</strong> Advertisements are reviewed before publication. Prohibited, misleading, or unlawful ads will not be accepted.';
    const card = document.querySelector('.membership-status-card');
    if (card) {
      const note = document.createElement('p');
      note.className = 'play-safe-notice';
      note.textContent = 'Seller membership purchases are unavailable in this Android version. Existing members can continue using their account.';
      card.insertAdjacentElement('afterend', note);
    }
    document.addEventListener('click', event => {
      if (typeof membershipActive !== 'undefined' && membershipActive) return;
      const purchaseOrSellerAction = event.target.closest('.membership-checkout-button, #connectStripeButton, [data-open-sell], [data-start-category], #switchAccountModeButton');
      if (!purchaseOrSellerAction) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof showToast === 'function') showToast('Seller membership purchases are unavailable in this Android version.');
    }, true);
  }

  const originalRender = window.renderListings;
  if (typeof originalRender === 'function') {
    window.renderListings = function renderListingsWithBlocks() {
      const blocked = blockedSellers();
      const originalListings = listings;
      listings = originalListings.filter(item => !item.seller_id || !blocked.has(String(item.seller_id)));
      try { return originalRender(); } finally { listings = originalListings; }
    };
  }

  const safetyActions = document.querySelector('#listingSafetyActions');
  const reportButton = document.querySelector('#reportListingButton');
  const blockButton = document.querySelector('#blockSellerButton');
  const reportDialog = document.querySelector('#reportDialog');
  const reportForm = document.querySelector('#reportForm');
  const reportMessage = document.querySelector('#reportMessage');
  const messageButton = document.querySelector('#detailMessageSellerButton');

  new MutationObserver(() => {
    const sellerId = messageButton?.dataset.sellerId || '';
    const listingId = messageButton?.dataset.listingId || '';
    const actionable = Boolean(sellerId && listingId && sellerId !== currentUser?.id);
    if (safetyActions) safetyActions.hidden = !actionable;
    if (reportButton) { reportButton.dataset.sellerId = sellerId; reportButton.dataset.listingId = listingId; }
    if (blockButton) blockButton.dataset.sellerId = sellerId;
  }).observe(messageButton, { attributes: true, attributeFilter: ['data-seller-id', 'data-listing-id'] });

  reportButton?.addEventListener('click', () => {
    if (!currentUser) {
      listingDialog.close();
      openAuth('signin');
      document.querySelector('#authMessage').textContent = 'Sign in to submit a safety report.';
      return;
    }
    reportMessage.textContent = '';
    reportDialog.showModal();
  });
  document.querySelector('[data-close-report]')?.addEventListener('click', () => reportDialog.close());

  reportForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentUser) return;
    const form = new FormData(reportForm);
    const submit = reportForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Sending…';
    reportMessage.textContent = '';
    try {
      form.set('form-name', 'safety-report');
      form.set('listingId', reportButton.dataset.listingId || '');
      form.set('reportedUserId', reportButton.dataset.sellerId || '');
      form.set('reporterEmail', currentUser.email || '');
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form).toString()
      });
      if (!response.ok) throw new Error('The report service is temporarily unavailable.');
      reportForm.reset();
      reportDialog.close();
      showToast('Report received. Flipora will review it.');
    } catch (error) {
      reportMessage.textContent = error.message || 'The report could not be sent.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send report';
    }
  });

  blockButton?.addEventListener('click', () => {
    const sellerId = blockButton.dataset.sellerId;
    if (!sellerId) return;
    const blocked = blockedSellers();
    blocked.add(String(sellerId));
    saveBlocked(blocked);
    listingDialog.close();
    renderListings();
    showToast('Seller blocked. Their listings are now hidden on this device.');
  });
})();
