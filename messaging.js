(() => {
  const detailButton = document.querySelector('#detailMessageSellerButton');
  const composeDialog = document.querySelector('#messageSellerDialog');
  const composeForm = document.querySelector('#messageSellerForm');
  const openMessagesButton = document.querySelector('#openMessagesButton');
  const messageList = document.querySelector('#sellerMessageList');
  const accessText = document.querySelector('#messageAccessText');
  const headerBadge = document.querySelector('#headerMessageBadge');
  const profileBadge = document.querySelector('#profileMessageBadge');

  function setBadge(count) {
    const value = Number(count || 0);
    [headerBadge, profileBadge].forEach(badge => {
      badge.hidden = value < 1;
      badge.textContent = value > 99 ? '99+' : String(value);
      badge.setAttribute('aria-label', value + ' unread buyer messages');
    });
  }

  function listingTitle(id) {
    return listings.find(item => String(item.id) === String(id))?.title || 'Listing #' + id;
  }

  async function refreshSellerMessages() {
    if (!currentUser) {
      setBadge(0);
      accessText.textContent = 'Sign in to see notifications';
      messageList.hidden = true;
      return;
    }

    const { data: notice } = await db.from('seller_message_notifications')
      .select('unread_count')
      .eq('seller_id', currentUser.id)
      .maybeSingle();
    setBadge(notice?.unread_count || 0);

    if (!membershipActive) {
      accessText.textContent = 'Messages unlock with seller membership';
      openMessagesButton.textContent = 'Become a member to open';
      messageList.hidden = true;
      return;
    }

    accessText.textContent = notice?.unread_count ? notice.unread_count + ' unread' : 'Membership active';
    openMessagesButton.textContent = messageList.hidden ? 'Open messages' : 'Refresh messages';
    if (!messageList.hidden) await loadMessageContents();
  }

  async function loadMessageContents() {
    messageList.hidden = false;
    messageList.innerHTML = '<p class="seller-message-empty">Loading messages…</p>';
    const { data, error } = await db.from('listing_messages')
      .select('id,listing_id,buyer_email,body,read_at,created_at')
      .eq('seller_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      messageList.innerHTML = '<p class="seller-message-empty">' + escapeHtml(error.message) + '</p>';
      return;
    }
    if (!data?.length) {
      messageList.innerHTML = '';
      accessText.textContent = 'No buyer messages yet';
      return;
    }
    messageList.innerHTML = data.map(message => `
      <article class="seller-message ${message.read_at ? '' : 'unread'}">
        <div class="seller-message-meta"><strong>${escapeHtml(listingTitle(message.listing_id))}</strong><time>${new Date(message.created_at).toLocaleString()}</time></div>
        <p>${escapeHtml(message.body)}</p>
        <a class="seller-reply-link" href="mailto:${encodeURIComponent(message.buyer_email)}?subject=${encodeURIComponent('Re: ' + listingTitle(message.listing_id))}">Reply by email</a>
      </article>
    `).join('');
    const unreadIds = data.filter(message => !message.read_at).map(message => message.id);
    if (unreadIds.length) {
      await db.from('listing_messages').update({ read_at: new Date().toISOString() })
        .eq('seller_id', currentUser.id)
        .in('id', unreadIds);
      setBadge(0);
      accessText.textContent = 'Membership active';
    }
  }

  detailButton.addEventListener('click', () => {
    if (!currentUser) {
      listingDialog.close();
      openAuth('signin');
      document.querySelector('#authMessage').textContent = 'Sign in to message this seller.';
      return;
    }
    if (detailButton.dataset.sellerId === currentUser.id) {
      showToast('This is your own listing.');
      return;
    }
    composeForm.elements.listingId.value = detailButton.dataset.listingId;
    composeForm.elements.sellerId.value = detailButton.dataset.sellerId;
    document.querySelector('#messageSellerTitle').textContent = 'Ask about ' + detailButton.dataset.listingTitle;
    composeForm.elements.message.value = '';
    listingDialog.close();
    composeDialog.showModal();
  });

  document.querySelector('[data-close-message-seller]').addEventListener('click', () => composeDialog.close());

  composeForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentUser) return openAuth('signin');
    const submit = composeForm.querySelector('[type="submit"]');
    const form = new FormData(composeForm);
    submit.disabled = true;
    submit.textContent = 'Sending…';
    const payload = {
      listing_id: Number(form.get('listingId')),
      seller_id: String(form.get('sellerId')),
      buyer_id: currentUser.id,
      buyer_email: currentUser.email,
      body: String(form.get('message')).trim()
    };
    const { error } = await db.from('listing_messages').insert(payload);
    submit.disabled = false;
    submit.textContent = 'Send message';
    if (error) return showToast(error.message);
    composeDialog.close();
    composeForm.reset();
    showToast('Your message was sent to the seller.');
  });

  openMessagesButton.addEventListener('click', async () => {
    if (!membershipActive) return startMembershipCheckout(openMessagesButton);
    await loadMessageContents();
  });

  document.querySelector('#accountButton').addEventListener('click', () => window.setTimeout(refreshSellerMessages, 400));
  window.addEventListener('flipora:membership-status', refreshSellerMessages);
  db.auth.onAuthStateChange(() => window.setTimeout(refreshSellerMessages, 700));
  window.setInterval(() => { if (currentUser) refreshSellerMessages(); }, 60000);
})();

