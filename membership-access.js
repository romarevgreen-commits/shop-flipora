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
  const signupForm = document.querySelector('#authForm');
  const displayNameLabel = document.querySelector('#displayNameLabel');

  let memberMode = 'buyer';

  const style = document.createElement('style');
  style.textContent = `
    .account-role-picker{border:1px solid var(--line);border-radius:14px;padding:12px;display:grid;gap:9px;background:var(--cream)}
    .account-role-picker[hidden]{display:none}.account-role-picker legend{font-weight:900;font-size:.82rem;padding:0 5px}.account-role-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .account-role-option{display:flex!important;gap:8px;align-items:flex-start;border:1px solid var(--line);border-radius:11px;padding:10px;background:#fff;cursor:pointer}.account-role-option input{width:auto!important;margin-top:3px}.account-role-option strong{display:block;font-size:.8rem}.account-role-option small{display:block;color:var(--muted);line-height:1.35;margin-top:2px}
    .buyer-shipping-card{border:1px solid var(--line);border-radius:16px;padding:14px;background:#fff;display:grid;gap:11px}.buyer-shipping-card[hidden]{display:none}.buyer-shipping-card h3{margin:0;font-size:.92rem}.buyer-shipping-card p{margin:0;color:var(--muted);font-size:.72rem;line-height:1.45}
    .buyer-shipping-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.buyer-shipping-grid label{display:grid;gap:5px;font-size:.7rem;font-weight:850}.buyer-shipping-grid input,.buyer-shipping-grid select{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px;background:#fff;font:inherit}.buyer-shipping-grid .shipping-wide{grid-column:1/-1}.buyer-shipping-actions{display:flex;justify-content:flex-end}.buyer-shipping-status{min-height:1em;font-size:.68rem!important}
    @media(max-width:520px){.account-role-options,.buyer-shipping-grid{grid-template-columns:1fr}.buyer-shipping-grid .shipping-wide{grid-column:auto}.buyer-shipping-actions button{width:100%}}
  `;
  document.head.appendChild(style);

  function isMember() {
    try { return Boolean(membershipActive); } catch { return false; }
  }

  function modeStorageKey() {
    return currentUser?.id ? `flipora-member-mode:${currentUser.id}` : 'flipora-member-mode';
  }

  function registeredRole() {
    const role = currentUser?.user_metadata?.account_role;
    if (role === 'seller' || role === 'buyer') return role;
    const listingCount = Number(document.querySelector('#listingCount')?.textContent || 0);
    return listingCount > 0 ? 'seller' : 'buyer';
  }

  function loadSavedMode() {
    if (!currentUser) return 'buyer';
    const role = registeredRole();
    if (!isMember()) return role;
    const saved = localStorage.getItem(modeStorageKey());
    return saved === 'seller' || saved === 'buyer' ? saved : role;
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

  function ensureSignupRolePicker() {
    if (!signupForm || document.querySelector('#accountRoleField')) return;
    const field = document.createElement('fieldset');
    field.id = 'accountRoleField';
    field.className = 'account-role-picker';
    field.hidden = true;
    field.innerHTML = `
      <legend>How will you use Flipora?</legend>
      <div class="account-role-options">
        <label class="account-role-option"><input type="radio" name="accountRole" value="buyer" checked><span><strong>Buyer</strong><small>Shop and buy items. No membership fee required.</small></span></label>
        <label class="account-role-option"><input type="radio" name="accountRole" value="seller"><span><strong>Seller</strong><small>Create a seller account. $9.99 lifetime membership is required to list and receive seller payouts.</small></span></label>
      </div>`;
    displayNameLabel?.insertAdjacentElement('afterend', field);
  }

  function signupModeActive() {
    return Boolean(displayNameLabel && !displayNameLabel.hidden);
  }

  function syncSignupRolePicker() {
    const field = document.querySelector('#accountRoleField');
    if (field) field.hidden = !signupModeActive();
  }

  ensureSignupRolePicker();
  syncSignupRolePicker();
  if (displayNameLabel) new MutationObserver(syncSignupRolePicker).observe(displayNameLabel, { attributes: true, attributeFilter: ['hidden'] });

  signupForm?.addEventListener('submit', async event => {
    if (!signupModeActive()) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const displayName = String(form.get('displayName') || '').trim();
    const accountRole = form.get('accountRole') === 'seller' ? 'seller' : 'buyer';
    const message = document.querySelector('#authMessage');
    const submit = document.querySelector('#authSubmit');

    submit.disabled = true;
    submit.textContent = 'Creating account…';
    if (message) message.textContent = '';

    try {
      const result = await db.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, account_role: accountRole },
          emailRedirectTo: `${location.origin}/`
        }
      });
      if (result.error) throw result.error;

      if (result.data.user?.id) {
        localStorage.setItem(`flipora-member-mode:${result.data.user.id}`, accountRole);
      }

      if (!result.data.session) {
        if (message) message.textContent = accountRole === 'seller'
          ? 'Check your email to verify your seller account. After signing in, activate the $9.99 lifetime seller membership.'
          : 'Check your email to verify your buyer account, then sign in.';
        event.currentTarget.reset();
        syncSignupRolePicker();
        return;
      }

      authDialog?.close();
      event.currentTarget.reset();
      if (typeof showToast === 'function') showToast(accountRole === 'seller' ? 'Seller account created.' : 'Buyer account created.');
    } catch (error) {
      if (message) message.textContent = error.message || 'Could not create account.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Create account';
    }
  }, true);

  let buyerShippingCard = document.querySelector('#buyerShippingCard');
  if (!buyerShippingCard && accountDialog) {
    buyerShippingCard = document.createElement('section');
    buyerShippingCard.id = 'buyerShippingCard';
    buyerShippingCard.className = 'buyer-shipping-card';
    buyerShippingCard.hidden = true;
    buyerShippingCard.innerHTML = `
      <div><h3>Buyer shipping information</h3><p>Save the delivery details you use when buying. You can update them anytime while your account is in Buyer mode.</p></div>
      <form id="buyerShippingForm">
        <div class="buyer-shipping-grid">
          <label class="shipping-wide">Full name<input name="fullName" autocomplete="shipping name" maxlength="100" required></label>
          <label>Phone<input name="phone" type="tel" autocomplete="shipping tel" maxlength="30" required></label>
          <label>Country<select name="country" autocomplete="shipping country" required><option value="US">United States</option></select></label>
          <label class="shipping-wide">Street address<input name="line1" autocomplete="shipping address-line1" maxlength="120" required></label>
          <label class="shipping-wide">Apartment, suite, unit <span aria-hidden="true">(optional)</span><input name="line2" autocomplete="shipping address-line2" maxlength="120"></label>
          <label>City<input name="city" autocomplete="shipping address-level2" maxlength="80" required></label>
          <label>State<input name="state" autocomplete="shipping address-level1" maxlength="40" required></label>
          <label>ZIP code<input name="postalCode" autocomplete="shipping postal-code" maxlength="12" required></label>
        </div>
        <p class="buyer-shipping-status" id="buyerShippingStatus" aria-live="polite"></p>
        <div class="buyer-shipping-actions"><button class="button button-small" type="submit">Save shipping information</button></div>
      </form>
      <p>Stripe checkout will still let you confirm the delivery address before you pay for each order.</p>`;
    const modeCard = accountDialog.querySelector('.account-mode-card');
    if (modeCard) modeCard.insertAdjacentElement('afterend', buyerShippingCard);
    else accountDialog.querySelector('.account-panel')?.prepend(buyerShippingCard);
  }

  const buyerShippingForm = document.querySelector('#buyerShippingForm');
  const buyerShippingStatus = document.querySelector('#buyerShippingStatus');

  function shippingProfile() {
    const profile = currentUser?.user_metadata?.buyer_shipping;
    return profile && typeof profile === 'object' ? profile : {};
  }

  function fillShippingForm() {
    if (!buyerShippingForm || !currentUser) return;
    const profile = shippingProfile();
    buyerShippingForm.elements.fullName.value = profile.full_name || currentUser.user_metadata?.display_name || '';
    buyerShippingForm.elements.phone.value = profile.phone || '';
    buyerShippingForm.elements.country.value = profile.country || 'US';
    buyerShippingForm.elements.line1.value = profile.line1 || '';
    buyerShippingForm.elements.line2.value = profile.line2 || '';
    buyerShippingForm.elements.city.value = profile.city || '';
    buyerShippingForm.elements.state.value = profile.state || '';
    buyerShippingForm.elements.postalCode.value = profile.postal_code || '';
    if (buyerShippingStatus) buyerShippingStatus.textContent = '';
  }

  buyerShippingForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentUser) return;
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Saving…';
    if (buyerShippingStatus) buyerShippingStatus.textContent = '';

    const buyerShipping = {
      full_name: String(form.get('fullName') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      country: String(form.get('country') || 'US'),
      line1: String(form.get('line1') || '').trim(),
      line2: String(form.get('line2') || '').trim(),
      city: String(form.get('city') || '').trim(),
      state: String(form.get('state') || '').trim(),
      postal_code: String(form.get('postalCode') || '').trim()
    };

    try {
      const existingMetadata = currentUser.user_metadata || {};
      const { data, error } = await db.auth.updateUser({ data: { ...existingMetadata, buyer_shipping: buyerShipping } });
      if (error) throw error;
      currentUser = data.user;
      if (buyerShippingStatus) buyerShippingStatus.textContent = 'Shipping information saved.';
      if (typeof showToast === 'function') showToast('Buyer shipping information updated.');
    } catch (error) {
      if (buyerShippingStatus) buyerShippingStatus.textContent = error.message || 'Could not save shipping information.';
    } finally {
      button.disabled = false;
      button.textContent = 'Save shipping information';
    }
  });

  if (membershipCard?.querySelector('strong')) membershipCard.querySelector('strong').textContent = 'Seller lifetime membership';

  function showMembershipCheckout(sourceButton) {
    if (!currentUser) {
      openAuth('signup');
      setTimeout(() => {
        const sellerRole = document.querySelector('#accountRoleField input[value="seller"]');
        if (sellerRole) sellerRole.checked = true;
        syncSignupRolePicker();
        const message = document.querySelector('#authMessage');
        if (message) message.textContent = 'Choose Seller to create your account. Seller membership is $9.99 one time for life.';
      }, 0);
      return;
    }
    const button = sourceButton || membershipButton || document.querySelector('.membership-checkout-button');
    if (button && typeof startMembershipCheckout === 'function') startMembershipCheckout(button);
  }

  function renderMemberAccess() {
    const active = isMember();
    const role = registeredRole();
    if (membershipCard) membershipCard.hidden = active;
    if (membershipButton) membershipButton.hidden = active;

    if (active) {
      memberMode = loadSavedMode();
      const sellerMode = memberMode === 'seller';
      if (accountModeTitle) accountModeTitle.textContent = sellerMode ? 'Seller account' : 'Buyer account';
      if (accountModeText) accountModeText.textContent = sellerMode
        ? 'Seller mode is active. List items, manage payouts, shipping, and buyer messages with this same lifetime-member login.'
        : 'Buyer mode is active. Shop with this same account and update your delivery information below.';
      if (switchModeButton) {
        switchModeButton.hidden = false;
        switchModeButton.textContent = sellerMode ? 'Switch to buyer' : 'Switch to seller';
      }
      sellerToolElements().forEach(element => { element.hidden = !sellerMode; });
      if (buyerShippingCard) buyerShippingCard.hidden = sellerMode;
      if (!sellerMode) fillShippingForm();
      if (accessText && sellerMode && !/unread/i.test(accessText.textContent || '')) accessText.textContent = 'Messages unlocked';
      if (openMessagesButton && /member/i.test(openMessagesButton.textContent || '')) openMessagesButton.textContent = 'Open messages';
      announceMode(sellerMode ? 'seller' : 'buyer');
      return;
    }

    if (currentUser) {
      memberMode = role;
      const sellerRole = role === 'seller';
      if (accountModeTitle) accountModeTitle.textContent = sellerRole ? 'Seller account' : 'Buyer account';
      if (accountModeText) accountModeText.textContent = sellerRole
        ? 'Your seller account is ready. Activate the $9.99 one-time lifetime membership to list items and receive seller payouts.'
        : 'Your buyer account is free. Shop and save or update your delivery information below.';
      if (switchModeButton) {
        switchModeButton.hidden = false;
        switchModeButton.textContent = sellerRole ? 'Activate seller membership – $9.99' : 'Become a seller – $9.99 lifetime';
      }
      sellerToolElements().forEach(element => { element.hidden = true; });
      if (buyerShippingCard) buyerShippingCard.hidden = sellerRole;
      if (!sellerRole) fillShippingForm();
      announceMode(sellerRole ? 'seller' : 'buyer');
      return;
    }

    if (buyerShippingCard) buyerShippingCard.hidden = true;
    announceMode('buyer');
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
  }, true);

  sellForm?.addEventListener('submit', event => {
    if (isMember()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showMembershipCheckout(sellForm.querySelector('[type="submit"]'));
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