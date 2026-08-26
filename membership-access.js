(() => {
  const membershipCard = document.querySelector('.membership-status-card');
  const membershipButton = document.querySelector('#accountMembershipButton');
  const accountModeTitle = document.querySelector('#accountModeTitle');
  const accountModeText = document.querySelector('#accountModeText');
  const accessText = document.querySelector('#messageAccessText');
  const openMessagesButton = document.querySelector('#openMessagesButton');
  const sellForm = document.querySelector('#sellForm');
  const composeForm = document.querySelector('#messageSellerForm');
  const detailMessageButton = document.querySelector('#detailMessageSellerButton');

  function isMember() {
    try { return Boolean(membershipActive); } catch { return false; }
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
      if (accountModeTitle) accountModeTitle.textContent = 'Lifetime member · Buy & sell';
      if (accountModeText) accountModeText.textContent = 'Your account is active for life. Buy items, sell items, and read buyer messages anytime.';
      if (accessText && !/unread/i.test(accessText.textContent || '')) accessText.textContent = 'Messages unlocked';
      if (openMessagesButton && /member/i.test(openMessagesButton.textContent || '')) openMessagesButton.textContent = 'Open messages';
    } else if (currentUser) {
      if (accountModeTitle) accountModeTitle.textContent = 'Membership required';
      if (accountModeText) accountModeText.textContent = '$9.99 one-time lifetime membership unlocks buying, selling, and messages.';
    }
  }

  document.addEventListener('click', event => {
    const sellButton = event.target.closest('[data-open-sell]');
    if (sellButton && !isMember()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showMembershipCheckout(sellButton);
      return;
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

  window.addEventListener('flipora:membership-status', renderMemberAccess);
  document.querySelector('#accountButton')?.addEventListener('click', () => setTimeout(renderMemberAccess, 500));
  db?.auth?.onAuthStateChange(() => setTimeout(renderMemberAccess, 800));
  setTimeout(renderMemberAccess, 1200);
})();
