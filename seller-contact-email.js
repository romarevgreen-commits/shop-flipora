(() => {
  const input = document.querySelector('#sellerContactEmailInput');
  const saveButton = document.querySelector('#saveSellerContactEmail');
  if (!input || !saveButton) return;

  const style = document.createElement('style');
  style.textContent = `
    .seller-contact-email-card{display:grid;gap:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff}
    .seller-contact-email-card>div{display:grid;gap:4px}
    .seller-contact-email-card>div>span{color:var(--muted);font-size:.76rem;line-height:1.4}
    .seller-contact-email-card label{display:flex;align-items:center;gap:8px}
    .seller-contact-email-card input{min-width:0;flex:1;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font:inherit}
    @media(max-width:480px){.seller-contact-email-card label{align-items:stretch;flex-direction:column}}
  `;
  document.head.appendChild(style);

  async function loadContactEmail() {
    if (!currentUser) {
      input.value = '';
      return;
    }
    const { data, error } = await db.from('profiles')
      .select('contact_email')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (error) return showToast(error.message);
    input.value = data?.contact_email || currentUser.email || '';
  }

  saveButton.addEventListener('click', async () => {
    if (!currentUser) return openAuth('signin');
    const email = input.value.trim().toLowerCase();
    if (!email || !input.checkValidity()) {
      input.reportValidity();
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    try {
      const displayName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Flipora seller';
      const city = currentUser.user_metadata?.seller_location || '';
      const { error } = await db.from('profiles').upsert({
        id: currentUser.id,
        display_name: displayName,
        city,
        contact_email: email
      }, { onConflict: 'id' });
      if (error) throw error;
      showToast('Seller contact email saved. Buyers can now email you directly.');
    } catch (error) {
      showToast(error.message || 'Could not save contact email.');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save email';
    }
  });

  document.querySelector('#accountButton')?.addEventListener('click', () => window.setTimeout(loadContactEmail, 250));
  db.auth.onAuthStateChange((_event, session) => {
    if (session?.user) window.setTimeout(loadContactEmail, 350);
    else input.value = '';
  });
})();