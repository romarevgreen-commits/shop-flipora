(() => {
  const membershipCard = document.querySelector('.membership-status-card');
  const membershipButton = document.querySelector('#accountMembershipButton');
  const accountDialog = document.querySelector('#accountDialog');
  const accountModeTitle = document.querySelector('#accountModeTitle');
  const accountModeText = document.querySelector('#accountModeText');
  const switchModeButton = document.querySelector('#switchBuyerAccountButton');
  const accessText = document.querySelector('#messageAccessText');
  const openMessagesButton = document.querySelector('#openMessagesButton');
  const sellForm = document.querySelector('#sellForm');
  const composeForm = document.querySelector('#messageSellerForm');
  const detailMessageButton = document.querySelector('#detailMessageSellerButton');

  let memberMode = 'buyer';

  function isMember() {
    try { return Boolean(membershipActive); } catch { return false; }
  }

  function modeStorageKey() {
    return currentUser?.id ? `flipora-member-mode:${currentUser.id}` : 'flipora-member-mode';
  }

  function loadSavedMode() {
    if (!currentUser) return 'buyer';
    const saved = localStorage.getItem(modeStorageKey());
    return saved === 'seller' ? 'seller' : 'buyer';
  }

  function saveMode(mode) {
    memberMode = mode === 'seller' ? 'seller' : 'buyer';
    if (currentUser) localStorage.setItem(modeStorageKey(), memberMode);
  }

  function sellerToolElements() {
    return [
      document.querySelector('.profile-photo-card'),
      document.querySelector('.profile-location-card'),
      document.querySelector('.seller-messages-card'),
      document.querySelector('.payout-card'),
      document.querySelector('#sellerVideoSection'),
      document.querySelector('.seller-items-card'),
      document.querySelector('#accountDialog [data-open-sell]')
    ].filter(Boolean);
  }

  function announceMode(mode) {
    if (accountDialog) accountDialog.dataset.accountMode = mode;
    window.dispatchEvent(new CustomEvent('flipora:account-mode', { detail: { mode } }));
  }

  function showMembershipCheckout(sourceButton) {
    if (!currentUser) {
      openAuth('signin');
      const message = document.querySelector('#authMessage');
      if (message) message.textContent = 'Sign in, then activate your $9.99 lifetime membership to buy or sell.';
      return;
    }
    const button = sourceButton || membershipButton || document.querySelector('.membership-checkout-button');
    if (button && typeof startMembershipCheckout === 'function') startMembershipCheckout(button);
  }

  function renderMemberAccess() {
    const active = isMember();
    if (membershipCard) membershipCard.hidden = active;
    if (membershipButton) membershipButton.hidden = active;

    if (active) {
      memberMode = loadSavedMode();
      const sellerMode = memberMode === 'seller';
      if (accountModeTitle) accountModeTitle.textContent = sellerMode ? 'Seller account' : 'Buyer account';
      if (accountModeText) accountModeText.textContent = sellerMode
        ? 'Seller mode is active. List items, manage payouts, shipping, and buyer messages using this same lifetime-member login.'
        : 'Buyer mode is active. Shop, buy items, and view purchase and tracking history using this same lifetime-member login.';
      if (switchModeButton) {
        switchModeButton.hidden = false;
        switchModeButton.textContent = sellerMode ? 'Switch to buyer' : 'Switch to seller';
      }
      sellerToolElements().forEach(element => { element.hidden = !sellerMode; });
      if (accessText && sellerMode && !/unread/i.test(accessText.textContent || '')) accessText.textContent = 'Messages unlocked';
      if (openMessagesButton && /member/i.test(openMessagesButton.textContent || '')) openMessagesButton.textContent = 'Open messages';
      announceMode(sellerMode ? 'seller' : 'buyer');
    } else if (currentUser) {
      if (accountModeTitle) accountModeTitle.textContent = 'Membership required';
      if (accountModeText) accountModeText.textContent = '$9.99 one-time lifetime membership unlocks both buyer and seller modes with this same login.';
      if (switchModeButton) {
        switchModeButton.hidden = true;
        switchModeButton.textContent = 'Switch to seller';
      }
      sellerToolElements().forEach(element => { element.hidden = true; });
      announceMode('buyer');
    } else {
      announceMode('buyer');
    }
  }

  if (switchModeButton) {
    switchModeButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!isMember()) return showMembershipCheckout(switchModeButton);
      saveMode(memberMode === 'seller' ? 'buyer' : 'seller');
      renderMemberAccess();
      if (typeof showToast === 'function') {
        showToast(memberMode === 'seller' ? 'Seller account is now active.' : 'Buyer account is now active.');
      }
    }, true);
  }

  document.addEventListener('click', event => {
    const sellButton = event.target.closest('[data-open-sell]');
    if (sellButton && !isMember()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showMembershipCheckout(sellButton);
      return;
    }
    if (sellButton && isMember() && memberMode !== 'seller') {
      saveMode('seller');
      renderMemberAccess();
    }

    const buyButton = event.target.closest('[data-buy]');
    if (buyButton && !isMember()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showMembershipCheckout(buyButton);
      return;
    }

    if (detailMessageButton && event.target.closest('#detailMessageSellerButton') && !isMember()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof listingDialog !== 'undefined' && listingDialog?.open) listingDialog.close();
      showMembershipCheckout(detailMessageButton);
    }
  }, true);

  sellForm?.addEventListener('submit', event => {
    if (isMember()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showMembershipCheckout(sellForm.querySelector('[type="submit"]'));
  }, true);

  composeForm?.addEventListener('submit', event => {
    if (isMember()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showMembershipCheckout(composeForm.querySelector('[type="submit"]'));
  }, true);

  window.addEventListener('flipora:membership-status', () => {
    memberMode = loadSavedMode();
    renderMemberAccess();
  });
  document.querySelector('#accountButton')?.addEventListener('click', () => setTimeout(renderMemberAccess, 500));
  db?.auth?.onAuthStateChange((_event, session) => {
    if (session?.user) memberMode = loadSavedMode();
    setTimeout(renderMemberAccess, 800);
  });
  setTimeout(() => {
    memberMode = loadSavedMode();
    renderMemberAccess();
  }, 1200);
})();
