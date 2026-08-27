(() => {
  const STRONG_PASSWORD_MESSAGE = 'Use at least 10 characters with uppercase, lowercase, a number, and a symbol.';
  const strongPassword = value => {
    const password = String(value || '');
    return password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  };

  const style = document.createElement('style');
  style.textContent = `
    .account-security-card{border:1px solid var(--line);border-radius:16px;padding:14px;display:grid;gap:11px;background:#f8fbff}
    .account-security-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.account-security-head strong{display:block}.account-security-head span{display:block;color:var(--muted);font-size:.72rem;margin-top:3px}
    .security-shield{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#e9f7ef;font-size:1rem}
    .account-security-status{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.account-security-status div{border:1px solid var(--line);border-radius:11px;padding:9px;background:#fff}.account-security-status strong{font-size:.78rem}.account-security-status span{display:block;font-size:.67rem;color:var(--muted);margin-top:2px}
    .security-password-note{margin:0;color:var(--muted);font-size:.7rem;line-height:1.4}
    @media(max-width:480px){.account-security-status{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function showSecurityMessage(target, message) {
    if (!target) return;
    target.textContent = message;
    target.setAttribute('role', 'alert');
  }

  const authForm = document.querySelector('#authForm');
  const resetForm = document.querySelector('#passwordResetForm');

  authForm?.addEventListener('submit', event => {
    const signupMode = !document.querySelector('#displayNameLabel')?.hidden;
    if (!signupMode) return;
    const password = authForm.elements.password?.value || '';
    if (strongPassword(password)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showSecurityMessage(document.querySelector('#authMessage'), STRONG_PASSWORD_MESSAGE);
  }, true);

  resetForm?.addEventListener('submit', event => {
    const password = resetForm.elements.newPassword?.value || '';
    if (strongPassword(password)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showSecurityMessage(document.querySelector('#passwordResetMessage'), STRONG_PASSWORD_MESSAGE);
  }, true);

  function ensureSecurityCard() {
    const panel = document.querySelector('#accountDialog .account-panel');
    if (!panel) return null;
    let card = panel.querySelector('#accountSecurityCard');
    if (card) return card;

    card = document.createElement('section');
    card.id = 'accountSecurityCard';
    card.className = 'account-security-card';
    card.innerHTML = `
      <div class="account-security-head"><div><strong>Account security</strong><span>Session and sign-in protection</span></div><span class="security-shield" aria-hidden="true">🛡️</span></div>
      <div class="account-security-status">
        <div><strong id="securityEmailStatus">Checking email…</strong><span>Email verification</span></div>
        <div><strong id="securitySessionStatus">Checking session…</strong><span>Secure session</span></div>
      </div>
      <p class="security-password-note">New and reset passwords must use 10+ characters with uppercase, lowercase, a number, and a symbol.</p>
      <button class="button button-small button-secondary" id="signOutAllDevices" type="button">Sign out all devices</button>`;

    const payoutCard = panel.querySelector('.payout-card');
    if (payoutCard) payoutCard.insertAdjacentElement('beforebegin', card);
    else panel.appendChild(card);

    card.querySelector('#signOutAllDevices')?.addEventListener('click', async () => {
      const button = card.querySelector('#signOutAllDevices');
      button.disabled = true;
      button.textContent = 'Signing out…';
      try {
        const { error } = await db.auth.signOut({ scope: 'global' });
        if (error) throw error;
        document.querySelector('#accountDialog')?.close();
        if (typeof showToast === 'function') showToast('Signed out on all devices.');
      } catch (error) {
        if (typeof showToast === 'function') showToast(error.message || 'Could not sign out all devices.');
        button.disabled = false;
        button.textContent = 'Sign out all devices';
      }
    });
    return card;
  }

  function renderSecurity(user) {
    const card = ensureSecurityCard();
    if (!card) return;
    const verified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
    const https = location.protocol === 'https:';
    card.querySelector('#securityEmailStatus').textContent = verified ? 'Verified' : 'Verification needed';
    card.querySelector('#securitySessionStatus').textContent = user && https ? 'Protected' : user ? 'Signed in' : 'Not signed in';
    card.hidden = !user;
  }

  document.querySelector('#accountButton')?.addEventListener('click', () => setTimeout(() => renderSecurity(currentUser), 80));
  db.auth.onAuthStateChange((_event, session) => renderSecurity(session?.user || null));
  db.auth.getSession().then(({ data }) => renderSecurity(data.session?.user || null));
})();
