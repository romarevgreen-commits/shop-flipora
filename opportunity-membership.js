(() => {
  const section = document.querySelector('#opportunities');
  if (!section) return;

  const style = document.createElement('style');
  style.textContent = `
    #opportunities{position:relative}
    .opportunity-member-lock{display:grid;gap:10px;place-items:center;text-align:center;margin:18px 0;padding:22px;border:1px solid var(--line);border-radius:18px;background:#fff}
    .opportunity-member-lock strong{font-size:1.05rem}
    .opportunity-member-lock p{margin:0;max-width:620px;color:var(--muted);font-size:.86rem;line-height:1.5}
    #opportunities[data-member-locked="true"] .opportunity-grid{filter:blur(2px);opacity:.48;pointer-events:none;user-select:none}
    #opportunities[data-member-locked="true"] .opportunity-note{opacity:.55}
    #opportunities[data-member-locked="false"] .opportunity-member-lock{display:none}
  `;
  document.head.appendChild(style);

  const lock = document.createElement('div');
  lock.className = 'opportunity-member-lock';
  lock.innerHTML = `
    <span aria-hidden="true" style="font-size:1.6rem">🔒</span>
    <strong>More Ways to Earn is for Flipora lifetime members</strong>
    <p>Activate the $9.99 one-time lifetime membership to unlock hauling, equipment, jobs, events, business services, advertising tools, and full buyer/seller account access with the same login.</p>
    <button class="button membership-checkout-button" type="button" id="opportunityMembershipButton">Unlock member access — $9.99</button>`;
  const intro = section.querySelector('.section-intro');
  if (intro) intro.insertAdjacentElement('afterend', lock); else section.prepend(lock);

  function isMember() {
    try { return Boolean(membershipActive); } catch { return false; }
  }

  function openMembership() {
    if (!currentUser) {
      if (typeof openAuth === 'function') {
        openAuth('signin');
        const message = document.querySelector('#authMessage');
        if (message) message.textContent = 'Sign in, then activate your $9.99 lifetime membership to unlock More Ways to Earn.';
      }
      return;
    }
    const button = lock.querySelector('#opportunityMembershipButton');
    if (typeof startMembershipCheckout === 'function') startMembershipCheckout(button);
  }

  function renderAccess() {
    const active = isMember();
    section.dataset.memberLocked = active ? 'false' : 'true';
    lock.hidden = active;
    section.querySelectorAll('[data-start-category]').forEach(button => {
      button.setAttribute('aria-disabled', active ? 'false' : 'true');
      button.tabIndex = active ? 0 : -1;
    });
  }

  lock.querySelector('#opportunityMembershipButton').addEventListener('click', openMembership);

  section.addEventListener('click', event => {
    const action = event.target.closest('[data-start-category]');
    if (!action || isMember()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openMembership();
  }, true);

  window.addEventListener('flipora:membership-status', renderAccess);
  db?.auth?.onAuthStateChange(() => setTimeout(renderAccess, 600));
  setTimeout(renderAccess, 1100);
})();
