(() => {
  const originalButton = document.querySelector('#connectStripeButton');
  const payoutStatus = document.querySelector('#payoutStatus');
  const accountButton = document.querySelector('#accountButton');
  const accountListButton = document.querySelector('#accountDialog [data-open-sell]');
  if (!originalButton || typeof paymentRequest !== 'function') return;

  // Replace the button to remove the older membership-first click handler from script.js.
  const button = originalButton.cloneNode(true);
  originalButton.replaceWith(button);

  const ADMIN_EMAIL = 'romarevgreen@gmail.com';
  const STRIPE_PLATFORM_PROFILE_URL = 'https://dashboard.stripe.com/settings/connect/platform-profile';
  let refreshInFlight = false;
  window.fliporaStripePayoutsReady = false;

  function syncListingLock(ready) {
    window.fliporaStripePayoutsReady = Boolean(ready);
    if (accountListButton) {
      accountListButton.disabled = !ready;
      accountListButton.textContent = ready ? 'List a new item' : 'Connect Stripe first';
    }
    window.dispatchEvent(new CustomEvent('flipora:stripe-payout-status', {
      detail: { ready: Boolean(ready) }
    }));
  }

  async function renderStripeConnectState() {
    if (!currentUser || refreshInFlight) return;
    refreshInFlight = true;
    try {
      const status = await paymentRequest('/.netlify/functions/connect-status');
      const connected = Boolean(status.connected);
      const ready = Boolean(status.payoutsEnabled);
      syncListingLock(ready);

      if (connected) {
        button.textContent = 'Manage Stripe setup';
        if (payoutStatus) {
          payoutStatus.textContent = status.member
            ? 'Connected · ready to list and receive payments'
            : 'Stripe connected · membership required before payouts';
        }
      } else {
        button.textContent = status.onboardingStatus === 'not_started' ? 'Connect Stripe' : 'Continue Stripe setup';
        if (payoutStatus) {
          payoutStatus.textContent = status.requirementsStatus === 'past_due'
            ? 'Action required in Stripe'
            : status.onboardingStatus === 'not_started'
              ? 'Connect Stripe now; membership is only required before payouts'
              : 'Stripe verification pending';
        }
      }
    } catch (error) {
      syncListingLock(false);
      if (payoutStatus) payoutStatus.textContent = error.message || 'Could not check Stripe status';
      console.error('Could not refresh Stripe Connect state', error);
    } finally {
      refreshInFlight = false;
    }
  }

  window.requireStripeSellerConnection = async function requireStripeSellerConnection() {
    try {
      const status = await paymentRequest('/.netlify/functions/connect-status');
      const ready = Boolean(status.payoutsEnabled);
      syncListingLock(ready);
      if (ready) return true;

      const accountDialog = document.querySelector('#accountDialog');
      if (accountDialog && !accountDialog.open) accountDialog.showModal();
      if (typeof showToast === 'function') {
        if (!status.connected) {
          showToast(status.onboardingStatus === 'not_started'
            ? 'Connect your seller account to Stripe first.'
            : 'Finish Stripe verification before listing an item.');
        } else if (!status.member) {
          showToast('Stripe is connected. Activate the lifetime membership before listing or receiving payouts.');
        }
      }
      setTimeout(renderStripeConnectState, 0);
      return false;
    } catch (error) {
      syncListingLock(false);
      if (typeof showToast === 'function') showToast(error.message || 'Could not verify Stripe payout setup.');
      return false;
    }
  };

  button.addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!currentUser) {
      if (typeof openAuth === 'function') {
        openAuth('signin');
        const message = document.querySelector('#authMessage');
        if (message) message.textContent = 'Sign in to connect Stripe for seller payouts.';
      }
      return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Opening Stripe…';
    if (payoutStatus) payoutStatus.textContent = 'Creating secure Stripe seller setup…';

    try {
      const result = await paymentRequest('/.netlify/functions/connect-onboard', { method: 'POST' });
      if (!result?.url) throw new Error('Stripe did not return an onboarding link');
      window.location.href = result.url;
    } catch (error) {
      const message = String(error?.message || 'Could not open Stripe setup');
      const platformSetupRequired = /finish the stripe connect marketplace setup|platform responsibilities|loss liability/i.test(message);
      const isAdmin = String(currentUser?.email || '').toLowerCase() === ADMIN_EMAIL;

      if (platformSetupRequired && isAdmin) {
        if (typeof showToast === 'function') showToast('Stripe needs the one-time Flipora platform setup. Opening it now…');
        window.location.href = STRIPE_PLATFORM_PROFILE_URL;
        return;
      }

      if (payoutStatus) payoutStatus.textContent = message;
      if (typeof showToast === 'function') showToast(message);
      button.disabled = false;
      button.textContent = originalText || 'Connect Stripe';
      renderStripeConnectState();
    }
  }, true);

  window.addEventListener('flipora:membership-status', () => setTimeout(renderStripeConnectState, 0));
  accountButton?.addEventListener('click', () => setTimeout(renderStripeConnectState, 120));
  db.auth.onAuthStateChange((_event, session) => {
    if (session?.user) setTimeout(renderStripeConnectState, 200);
  });
  setTimeout(renderStripeConnectState, 350);
})();
