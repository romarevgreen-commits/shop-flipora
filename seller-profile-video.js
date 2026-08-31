(() => {
  const style = document.createElement('style');
  style.textContent = `
    .profile-video-card{display:flex;align-items:center;gap:14px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff;overflow:hidden}
    .profile-video-card>div:last-of-type{min-width:0;display:grid;gap:5px;flex:1}
    .profile-video-card>div:last-of-type>span{color:var(--muted);font-size:.76rem;line-height:1.4}
    .profile-video-preview{width:88px!important;height:88px!important;min-width:88px!important;max-width:88px!important;min-height:88px!important;max-height:88px!important;flex:0 0 88px;display:grid;place-items:center;overflow:hidden;border-radius:16px;background:#ebe6ff}
    .profile-video-preview video{display:block;width:88px!important;height:88px!important;max-width:88px!important;max-height:88px!important;object-fit:cover!important;object-position:center;border-radius:16px}
    #profileVideoPlaceholder{font-size:2rem}
    .profile-video-card .button-secondary{margin-top:2px}
    @media(max-width:480px){.profile-video-card{align-items:flex-start}.profile-video-preview,.profile-video-preview video{width:72px!important;height:72px!important;min-width:72px!important;max-width:72px!important;min-height:72px!important;max-height:72px!important}.profile-video-preview{flex-basis:72px}}
  `;
  document.head.appendChild(style);

  const input = document.querySelector('#profileVideoInput');
  const chooseButton = document.querySelector('#chooseProfileVideo');
  const removeButton = document.querySelector('#removeProfileVideo');
  const preview = document.querySelector('#profileVideoPreview');
  const MAX_SECONDS = 30.5;
  const MAX_BYTES = 50 * 1024 * 1024;

  function showVideo(url) {
    if (url) {
      preview.innerHTML = `<video src="${url}" muted playsinline preload="metadata"></video>`;
      removeButton.hidden = false;
    } else {
      preview.innerHTML = '<span id="profileVideoPlaceholder">🎥</span>';
      removeButton.hidden = true;
    }
  }

  async function loadVideo() {
    if (!currentUser) return showVideo('');
    const { data } = await db.from('profiles').select('profile_video_url').eq('id', currentUser.id).maybeSingle();
    showVideo(data?.profile_video_url || '');
  }

  chooseButton.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file || !currentUser) return;
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    const allowedExtensions = new Set(['mp4', 'webm', 'mov', 'm4v', '3gp', '3g2']);
    const isVideo = (file.type || '').startsWith('video/') || allowedExtensions.has(extension);
    if (!isVideo) return showToast('Choose a video file.');
    if (file.size > MAX_BYTES) return showToast('Video must be smaller than 50 MB.');
    let duration = null;
    try { duration = await videoDuration(file); } catch (error) { console.warn('Seller video metadata unavailable', error); }
    if (Number.isFinite(duration) && duration > MAX_SECONDS) return showToast('Video must be 30 seconds or shorter.');

    chooseButton.disabled = true;
    chooseButton.textContent = 'Uploading…';
    try {
      const safeExtension = allowedExtensions.has(extension) ? extension : (file.type.split('/')[1] || 'mp4');
      const path = `${currentUser.id}/intro.${safeExtension}`;
      const { error: uploadError } = await db.storage.from('seller-videos').upload(path, file, { cacheControl: '3600', contentType: file.type || 'video/mp4', upsert: true });
      if (uploadError) throw uploadError;
      const publicUrl = db.storage.from('seller-videos').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
      const { data: updated, error: profileError } = await db.from('profiles').update({ profile_video_url: publicUrl }).eq('id', currentUser.id).select('id').maybeSingle();
      if (profileError) throw profileError;
      if (!updated) throw new Error('Could not save your intro video to your account.');
      showVideo(publicUrl);
      showToast('Your seller intro video was updated.');
    } catch (error) {
      showToast(error.message || 'Could not upload intro video.');
    } finally {
      input.value = '';
      chooseButton.disabled = false;
      chooseButton.textContent = 'Add or change video';
    }
  });

  removeButton.addEventListener('click', async () => {
    if (!currentUser) return;
    removeButton.disabled = true;
    try {
      const { error } = await db.from('profiles').update({ profile_video_url: null }).eq('id', currentUser.id);
      if (error) throw error;
      showVideo('');
      showToast('Intro video removed.');
    } catch (error) {
      showToast(error.message || 'Could not remove intro video.');
    } finally {
      removeButton.disabled = false;
    }
  });

  document.querySelector('#accountButton').addEventListener('click', () => window.setTimeout(loadVideo, 250));
  db.auth.onAuthStateChange((_event, session) => { if (session?.user) window.setTimeout(loadVideo, 350); else showVideo(''); });
})();
