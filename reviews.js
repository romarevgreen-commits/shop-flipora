(() => {
  const config = window.FLIPORA_CONFIG;
  const db = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  const params = new URLSearchParams(location.search);
  const selectedSellerId = params.get('seller');
  const feed = document.querySelector('#reviewFeed');
  const sellerSelect = document.querySelector('#reviewSeller');
  const form = document.querySelector('#reviewForm');
  const profileSection = document.querySelector('#sellerReviewProfile');
  let sessionUser = null;
  let profileMap = new Map();

  const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const stars = rating => '★'.repeat(Number(rating)) + '☆'.repeat(5 - Number(rating));
  const nameFor = id => profileMap.get(id)?.display_name || 'Flipora member';

  function toast(message) {
    const box = document.querySelector('#toast');
    box.textContent = message;
    box.classList.add('show');
    setTimeout(() => box.classList.remove('show'), 3500);
  }

  async function fetchProfiles(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return [];
    const { data } = await db.from('profiles').select('id,display_name,city,avatar_url,profile_video_url,created_at').in('id', unique);
    (data || []).forEach(profile => profileMap.set(profile.id, profile));
    return data || [];
  }

  function avatarMarkup(profile, label) {
    return profile?.avatar_url
      ? `<img src="${safe(profile.avatar_url)}" alt="${safe(label)} profile picture">`
      : safe(String(label || 'F').charAt(0).toUpperCase());
  }

  async function loadSellers() {
    const { data: items } = await db.from('listings').select('seller_id,title').eq('status', 'active').not('seller_id', 'is', null);
    const sellerIds = [...new Set((items || []).map(item => item.seller_id))];
    await fetchProfiles(sellerIds);
    sellerSelect.innerHTML = '<option value="">Choose a seller</option>' + sellerIds.map(id => {
      const profile = profileMap.get(id);
      const sampleItem = items.find(item => item.seller_id === id)?.title;
      return `<option value="${safe(id)}">${safe(profile?.display_name || 'Flipora seller')}${sampleItem ? ' — ' + safe(sampleItem) : ''}</option>`;
    }).join('');
    if (selectedSellerId && sellerIds.includes(selectedSellerId)) sellerSelect.value = selectedSellerId;
  }

  function demoReviews() {
    return `
      <article class="review-card demo">
        <div class="review-card-head"><div><span class="demo-label">Demo preview — not a real review</span><strong>Example buyer review</strong></div><span class="stars">★★★★★</span></div>
        <p>Example only: The item matched the description and the seller communicated clearly.</p>
      </article>
      <article class="review-card demo">
        <div class="review-card-head"><div><span class="demo-label">Demo preview — not a real review</span><strong>Example seller review</strong></div><span class="stars">★★★★☆</span></div>
        <p>Example only: The buyer arrived at the agreed pickup time and the transaction went smoothly.</p>
      </article>`;
  }

  async function loadReviews() {
    let query = db.from('seller_reviews').select('id,seller_id,reviewer_id,reviewer_role,rating,comment,created_at').order('created_at', { ascending: false }).limit(100);
    if (selectedSellerId) query = query.eq('seller_id', selectedSellerId);
    const { data, error } = await query;
    if (error) {
      feed.innerHTML = `<p>${safe(error.message)}</p>`;
      return;
    }
    const reviews = data || [];
    await fetchProfiles(reviews.flatMap(review => [review.seller_id, review.reviewer_id]));

    if (!reviews.length) {
      feed.innerHTML = '<p class="review-auth-note">No real member reviews have been submitted yet. These labeled examples show how reviews will appear.</p>' + demoReviews();
    } else {
      feed.innerHTML = reviews.map(review => {
        const reviewer = profileMap.get(review.reviewer_id);
        const seller = profileMap.get(review.seller_id);
        const reviewerName = reviewer?.display_name || 'Flipora member';
        return `
          <article class="review-card">
            <div class="review-card-head">
              <div class="reviewer"><span class="mini-avatar">${avatarMarkup(reviewer, reviewerName)}</span><div><strong>${safe(reviewerName)}</strong><span class="review-role">${safe(review.reviewer_role)} comment</span></div></div>
              <span class="stars" aria-label="${review.rating} out of 5 stars">${stars(review.rating)}</span>
            </div>
            <p>${safe(review.comment)}</p>
            <span class="review-date">Review of ${safe(seller?.display_name || 'Flipora seller')} · ${new Date(review.created_at).toLocaleDateString()}</span>
          </article>`;
      }).join('');
    }

    if (selectedSellerId) renderSellerProfile(selectedSellerId, reviews);
  }

  async function renderSellerProfile(id, reviews) {
    if (!profileMap.has(id)) await fetchProfiles([id]);
    const profile = profileMap.get(id);
    profileSection.hidden = false;
    document.querySelector('#sellerProfileName').textContent = profile?.display_name || 'Flipora seller';
    document.querySelector('#sellerProfileCity').textContent = profile?.city ? '📍 ' + profile.city : 'Local Flipora seller';
    const image = document.querySelector('#sellerAvatar');
    const placeholder = document.querySelector('#sellerAvatarPlaceholder');
    if (profile?.avatar_url) {
      image.src = profile.avatar_url;
      image.hidden = false;
      placeholder.hidden = true;
    } else {
      image.hidden = true;
      placeholder.hidden = false;
      placeholder.textContent = String(profile?.display_name || 'F').charAt(0).toUpperCase();
    }

    let videoWrap = document.querySelector('#sellerProfileVideoWrap');
    if (!videoWrap) {
      const style = document.createElement('style');
      style.textContent = `
        .seller-profile-video-wrap{margin-top:16px;display:grid;gap:8px}
        .seller-profile-video-wrap h3{margin:0;font-size:1rem}
        .seller-profile-video{width:100%;max-width:560px;max-height:315px;border-radius:16px;background:#111;display:block}
        .seller-profile-video-note{margin:0;color:var(--muted);font-size:.78rem}
      `;
      document.head.appendChild(style);
      videoWrap = document.createElement('div');
      videoWrap.id = 'sellerProfileVideoWrap';
      videoWrap.className = 'seller-profile-video-wrap';
      profileSection.appendChild(videoWrap);
    }
    if (profile?.profile_video_url) {
      videoWrap.hidden = false;
      videoWrap.innerHTML = `
        <h3>Meet the seller</h3>
        <video class="seller-profile-video" src="${safe(profile.profile_video_url)}" controls playsinline preload="metadata" aria-label="Seller introduction video"></video>
        <p class="seller-profile-video-note">Seller introduction video · up to 15 seconds</p>
      `;
    } else {
      videoWrap.hidden = true;
      videoWrap.innerHTML = '';
    }

    const count = reviews.length;
    const average = count ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / count : 0;
    document.querySelector('#sellerAverage').textContent = count ? average.toFixed(1) + ' ★' : 'New';
    document.querySelector('#sellerReviewCount').textContent = count ? count + (count === 1 ? ' real review' : ' real reviews') : 'No real reviews yet';
    document.querySelector('#reviewFeedTitle').textContent = 'Reviews for ' + (profile?.display_name || 'this seller');
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!sessionUser) {
      toast('Sign in from the Flipora home page before publishing a review.');
      return;
    }
    const values = new FormData(form);
    const sellerId = String(values.get('sellerId') || '');
    if (sellerId === sessionUser.id) return toast('You cannot review your own seller profile.');
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Publishing…';
    const { error } = await db.from('seller_reviews').insert({
      seller_id: sellerId,
      reviewer_id: sessionUser.id,
      reviewer_role: String(values.get('reviewerRole')),
      rating: Number(values.get('rating')),
      comment: String(values.get('comment')).trim()
    });
    submit.disabled = false;
    submit.textContent = 'Publish review';
    if (error) return toast(error.code === '23505' ? 'You already reviewed this seller.' : error.message);
    form.reset();
    if (selectedSellerId) sellerSelect.value = selectedSellerId;
    toast('Your real review was published.');
    await loadReviews();
  });

  db.auth.getSession().then(({ data }) => {
    sessionUser = data.session?.user || null;
    document.querySelector('#reviewAuthNote').textContent = sessionUser ? 'Signed in as ' + sessionUser.email : 'Sign in on Flipora before submitting a review.';
  });
  db.auth.onAuthStateChange((_event, session) => {
    sessionUser = session?.user || null;
    document.querySelector('#reviewAuthNote').textContent = sessionUser ? 'Signed in as ' + sessionUser.email : 'Sign in on Flipora before submitting a review.';
  });

  document.querySelector('#year').textContent = new Date().getFullYear();
  Promise.all([loadSellers(), loadReviews()]);
})();