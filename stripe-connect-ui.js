(() => {
  const button = document.querySelector('#connectStripeButton');
  const payoutStatus = document.querySelector('#payoutStatus');
  const accountButton = document.querySelector('#accountButton');
  if (!button || typeof paymentRequest !== 'function') return;

  const ADMIN_EMAIL = 'romarevgreen@gmail.com';
  const STRIPE_PLATFORM_PROFILE_URL = 'https://dashboard.stripe.com/settings/connect/platform-profile';
  let refreshInFlight = false;

  async function renderStripeConnectState() {
    if (!currentUser || refreshInFlight) return;
    refreshInFlight = true;
    try {
      const status = await paymentRequest('/.netlify/functions/connect-status');
      if (status.connected) {
        button.textContent = status.member ? 'Manage payout setup' : 'Manage Stripe setup';
        if (payoutStatus) payoutStatus.textContent = status.member
          ? 'Ready to receive payments'
          : 'Stripe connected · membership required before payouts';
      } else {
        button.textContent = status.onboardingStatus === 'not_started' ? 'Connect Stripe' : 'Continue Stripe setup';
        if (payoutStatus) {
          payoutStatus.textContent = status.requirementsStatus === 'past_due'
            ? 'Action required in Stripe'
            : status.onboardingStatus === 'not_started'
              ? 'Connect Stripe to set up seller payouts'
              : 'Stripe verification pending';
        }
      }
    } catch (error) {
      console.error('Could not refresh Stripe Connect state', error);
    } finally {
      refreshInFlight = false;
    }
  }

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
    try {
      const result = await paymentRequest('/.netlify/functions/connect-onboard', { method: 'POST' });
      if (!result?.url) throw new Error('Stripe did not return an onboarding link');
      location.assign(result.url);
    } catch (error) {
      const message = String(error?.message || 'Could not open Stripe setup');
      const platformSetupRequired = /finish the stripe connect marketplace setup|platform responsibilities|loss liability/i.test(message);
      const isAdmin = String(currentUser?.email || '').toLowerCase() === ADMIN_EMAIL;

      if (platformSetupRequired && isAdmin) {
        if (typeof showToast === 'function') showToast('Stripe needs the one-time Flipora platform setup. Opening it now…');
        location.assign(STRIPE_PLATFORM_PROFILE_URL);
        return;
      }

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
