(() => {
  const input = document.querySelector('#sellerContactEmailInput');
  if (!input) return;

  const style = document.createElement('style');
  style.textContent = `
    .seller-contact-email-card{display:grid;gap:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff}
    .seller-contact-email-card>div{display:grid;gap:4px}
    .seller-contact-email-card>div>span{color:var(--muted);font-size:.76rem;line-height:1.4}
    .seller-contact-email-card label{display:block}
    .seller-contact-email-card input{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font:inherit;background:#f7f6fb;color:#18142b}
  `;
  document.head.appendChild(style);

  async function syncSignupEmail(user) {
    if (!user?.email) {
      input.value = '';
      return;
    }
    input.value = user.email;
    const displayName = user.user_metadata?.display_name || user.email.split('@')[0] || 'Flipora seller';
    const city = user.user_metadata?.seller_location || '';
    const { error } = await db.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
      city,
      contact_email: user.email.toLowerCase()
    }, { onConflict: 'id' });
    if (error) console.error('Could not sync seller signup email', error);
  }

  document.querySelector('#accountButton')?.addEventListener('click', () => {
    if (currentUser) window.setTimeout(() => syncSignupEmail(currentUser), 150);
  });
  db.auth.getSession().then(({ data }) => syncSignupEmail(data.session?.user || null));
  db.auth.onAuthStateChange((_event, session) => syncSignupEmail(session?.user || null));
})();