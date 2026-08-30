(() => {
  const avatarSizeStyle = document.createElement('style');
  avatarSizeStyle.textContent = `
    .profile-photo-card{display:flex;align-items:center;gap:14px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff;overflow:hidden}
    .profile-photo-card>div:last-of-type{min-width:0;display:grid;gap:5px;flex:1}.profile-photo-card>div:last-of-type>span{color:var(--muted);font-size:.76rem;line-height:1.4}
    .profile-avatar-wrap{width:88px!important;height:88px!important;min-width:88px!important;max-width:88px!important;min-height:88px!important;max-height:88px!important;flex:0 0 88px;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#ebe6ff}
    #profileAvatarImage{display:block;width:88px!important;height:88px!important;max-width:88px!important;max-height:88px!important;object-fit:cover!important;object-position:center;border-radius:50%}
    #profileAvatarPlaceholder{width:88px;height:88px;display:grid;place-items:center;border-radius:50%;background:var(--purple);color:#fff;font-size:2rem;font-weight:900}
    @media(max-width:480px){.profile-photo-card{align-items:flex-start}.profile-avatar-wrap,#profileAvatarImage,#profileAvatarPlaceholder{width:72px!important;height:72px!important;min-width:72px!important;max-width:72px!important;min-height:72px!important;max-height:72px!important}.profile-avatar-wrap{flex-basis:72px}}
  `;
  document.head.appendChild(avatarSizeStyle);

  const input = document.querySelector('#profilePhotoInput');
  const chooseButton = document.querySelector('#chooseProfilePhoto');
  const image = document.querySelector('#profileAvatarImage');
  const placeholder = document.querySelector('#profileAvatarPlaceholder');

  function showAvatar(url, name = 'F') {
    if (url) {
      image.src = url;
      image.hidden = false;
      placeholder.hidden = true;
    } else {
      image.removeAttribute('src');
      image.hidden = true;
      placeholder.hidden = false;
      placeholder.textContent = String(name || 'F').charAt(0).toUpperCase();
    }
  }

  async function ensureProfile() {
    if (!currentUser) return;
    const displayName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Flipora seller';
    const city = currentUser.user_metadata?.seller_location || '';
    const { error } = await db.from('profiles').upsert({ id: currentUser.id, display_name: displayName, city }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  }

  async function loadAvatar() {
    if (!currentUser) return showAvatar('', 'F');
    const { data } = await db.from('profiles').select('avatar_url,display_name').eq('id', currentUser.id).maybeSingle();
    showAvatar(data?.avatar_url, data?.display_name || currentUser.user_metadata?.display_name || currentUser.email);
  }

  chooseButton.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file || !currentUser) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return showToast('Choose a JPG, PNG, or WebP image.');
    if (file.size > 5 * 1024 * 1024) return showToast('Profile pictures must be smaller than 5 MB.');

    chooseButton.disabled = true;
    chooseButton.textContent = 'Uploading…';
    try {
      await ensureProfile();
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${currentUser.id}/avatar.${extension}`;
      const { error: uploadError } = await db.storage.from('profile-images').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true
      });
      if (uploadError) throw uploadError;
      const publicUrl = db.storage.from('profile-images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
      const { data: updated, error: profileError } = await db.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id).select('id').maybeSingle();
      if (profileError) throw profileError;
      if (!updated) throw new Error('Could not save your profile picture to your account.');
      showAvatar(publicUrl, currentUser.email);
      showToast('Your seller profile picture was updated.');
    } catch (error) {
      showToast(error.message || 'Could not upload profile picture.');
    } finally {
      input.value = '';
      chooseButton.disabled = false;
      chooseButton.textContent = 'Add or change photo';
    }
  });

  const accountPanel = document.querySelector('#accountDialog .account-panel');
  const signOutButton = document.querySelector('#signOutButton');
  let sellerVideoInput = null;
  let sellerVideoPreview = null;
  let sellerVideoUploadButton = null;
  let sellerVideoRemoveButton = null;
  let selectedVideoFile = null;
  let selectedPreviewUrl = '';

  if (accountPanel && signOutButton && !document.querySelector('#sellerVideoSection')) {
    const style = document.createElement('style');
    style.textContent = `
      .seller-video-card{border:1px solid var(--line);border-radius:16px;padding:15px;display:grid;gap:12px;background:#fff}
      .seller-video-card h3{margin:0}.seller-video-card p{margin:0;color:var(--muted);font-size:.82rem;line-height:1.45}
      .seller-video-preview{width:100%;max-height:300px;border-radius:14px;background:#111;display:block}
      .seller-video-actions{display:flex;gap:8px;flex-wrap:wrap}.seller-video-note{font-size:.74rem!important}
      .seller-video-remove{border:1px solid #d92d20;background:#fff;color:#b42318;border-radius:10px;padding:9px 13px;font-weight:800;cursor:pointer}
    `;
    document.head.appendChild(style);

    const section = document.createElement('section');
    section.id = 'sellerVideoSection';
    section.className = 'seller-video-card';
    section.innerHTML = `
      <div><h3>Make a Video for Your Items</h3><p>Add a short video buyers can watch on your seller profile.</p></div>
      <video id="sellerVideoPreview" class="seller-video-preview" controls playsinline hidden></video>
      <input id="sellerVideoInput" type="file" accept="video/*,.mp4,.mov,.webm,.m4v,.3gp" hidden>
      <div class="seller-video-actions">
        <button class="button button-secondary" id="chooseSellerVideo" type="button">Record or choose video</button>
        <button class="button" id="uploadSellerVideo" type="button" disabled>Publish video</button>
        <button class="seller-video-remove" id="removeSellerVideo" type="button" hidden>Remove video</button>
      </div>
      <p class="seller-video-note">Maximum length: 15 seconds · Maximum file size: 100 MB · MP4, MOV, WebM, M4V, or 3GP</p>
    `;
    accountPanel.insertBefore(section, signOutButton);
    sellerVideoInput = section.querySelector('#sellerVideoInput');
    sellerVideoPreview = section.querySelector('#sellerVideoPreview');
    sellerVideoUploadButton = section.querySelector('#uploadSellerVideo');
    sellerVideoRemoveButton = section.querySelector('#removeSellerVideo');
    const chooseSellerVideo = section.querySelector('#chooseSellerVideo');

    chooseSellerVideo.addEventListener('click', () => {
      // Clear the previous selection so Android fires change even when the
      // seller chooses the same recording again.
      sellerVideoInput.value = '';
      sellerVideoInput.click();
    });

    sellerVideoPreview.addEventListener('error', () => {
      const hadSavedVideo = !selectedVideoFile;
      sellerVideoPreview.pause();
      sellerVideoPreview.removeAttribute('src');
      sellerVideoPreview.hidden = true;
      if (hadSavedVideo) {
        sellerVideoRemoveButton.hidden = false;
        showToast('This saved video cannot play on this phone. Remove it, then record or choose an MP4 video.');
      } else {
        sellerVideoUploadButton.disabled = true;
        selectedVideoFile = null;
        if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
        selectedPreviewUrl = '';
        showToast('This video format cannot play. Choose an MP4 or WebM video.');
      }
    });

    sellerVideoInput.addEventListener('change', async () => {
      const file = sellerVideoInput.files?.[0];
      selectedVideoFile = null;
      sellerVideoUploadButton.disabled = true;
      if (!file) return;

      const extensionFromName = String(file.name || '').split('.').pop().toLowerCase();
      const allowedExtensions = ['mp4','mov','webm','m4v','3gp'];
      const allowedTypes = ['video/mp4','video/webm','video/quicktime','video/x-m4v','video/3gpp','application/octet-stream',''];
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extensionFromName)) {
        sellerVideoInput.value = '';
        return showToast('Choose an MP4, MOV, WebM, M4V, or 3GP video.');
      }
      if (file.size > 100 * 1024 * 1024) {
        sellerVideoInput.value = '';
        return showToast('Seller videos must be smaller than 100 MB.');
      }
      if (!file.size) {
        sellerVideoInput.value = '';
        return showToast('This video file is empty. Record or choose the video again.');
      }

      const objectUrl = URL.createObjectURL(file);
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.playsInline = true;
      let durationResolved = false;
      const rejectUnreadableVideo = () => {
        if (durationResolved) return;
        durationResolved = true;
        URL.revokeObjectURL(objectUrl);
        selectedPreviewUrl = '';
        selectedVideoFile = null;
        sellerVideoInput.value = '';
        sellerVideoPreview.pause();
        sellerVideoPreview.removeAttribute('src');
        sellerVideoPreview.hidden = true;
        sellerVideoUploadButton.disabled = true;
        showToast('This video cannot play. Record it again or choose an MP4 video.');
      };
      const acceptDuration = duration => {
        if (durationResolved || !Number.isFinite(duration) || duration <= 0) return false;
        durationResolved = true;
        if (duration > 15.25) {
          URL.revokeObjectURL(objectUrl);
          selectedPreviewUrl = '';
          selectedVideoFile = null;
          sellerVideoInput.value = '';
          sellerVideoPreview.hidden = true;
          sellerVideoPreview.removeAttribute('src');
          sellerVideoUploadButton.disabled = true;
          showToast('Your seller profile video must be 15 seconds or shorter.');
          return true;
        }
        if (selectedPreviewUrl && selectedPreviewUrl !== objectUrl) URL.revokeObjectURL(selectedPreviewUrl);
        selectedPreviewUrl = objectUrl;
        selectedVideoFile = file;
        sellerVideoPreview.src = objectUrl;
        sellerVideoPreview.hidden = false;
        sellerVideoUploadButton.disabled = false;
        showToast('Video ready. Tap Publish video to add it to your seller profile.');
        return true;
      };
      probe.onloadedmetadata = () => {
        if (acceptDuration(probe.duration)) return;
        // Some Android recordings initially report Infinity. Seeking forces
        // Chromium to calculate the real duration before upload validation.
        probe.currentTime = Number.MAX_SAFE_INTEGER;
      };
      probe.ontimeupdate = () => acceptDuration(probe.duration);
      probe.ondurationchange = () => acceptDuration(probe.duration);
      probe.onerror = rejectUnreadableVideo;

      // Do not enable Publish until the phone proves the recording is playable.
      // This prevents empty or unsupported Android recordings from being saved
      // as a permanent 0:00 seller video.
      probe.src = objectUrl;
      probe.load();
      window.setTimeout(() => {
        if (!durationResolved) rejectUnreadableVideo();
      }, 5000);
    });

    sellerVideoUploadButton.addEventListener('click', async () => {
      if (!currentUser) return showToast('Sign in before publishing a seller video.');
      if (!selectedVideoFile) return showToast('Choose a video first.');
      sellerVideoUploadButton.disabled = true;
      const originalText = sellerVideoUploadButton.textContent;
      sellerVideoUploadButton.textContent = 'Publishing…';
      try {
        await ensureProfile();
        const extensionFromName = String(selectedVideoFile.name || '').split('.').pop().toLowerCase();
        const extension = ['mp4','mov','webm','m4v','3gp'].includes(extensionFromName)
          ? extensionFromName
          : selectedVideoFile.type === 'video/webm' ? 'webm'
          : selectedVideoFile.type === 'video/quicktime' ? 'mov'
          : selectedVideoFile.type === 'video/x-m4v' ? 'm4v'
          : selectedVideoFile.type === 'video/3gpp' ? '3gp'
          : 'mp4';
        const contentType = selectedVideoFile.type && selectedVideoFile.type !== 'application/octet-stream'
          ? selectedVideoFile.type
          : extension === 'mov' ? 'video/quicktime'
          : extension === 'webm' ? 'video/webm'
          : extension === 'm4v' ? 'video/x-m4v'
          : extension === '3gp' ? 'video/3gpp'
          : 'video/mp4';
        const path = `${currentUser.id}/profile-video.${extension}`;
        const { error: uploadError } = await db.storage.from('seller-videos').upload(path, selectedVideoFile, {
          cacheControl: '3600',
          contentType,
          upsert: true
        });
        if (uploadError) throw uploadError;
        const publicUrl = db.storage.from('seller-videos').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
        const { data: updated, error: profileError } = await db.from('profiles').update({ profile_video_url: publicUrl }).eq('id', currentUser.id).select('id').maybeSingle();
        if (profileError) {
          console.error('Could not attach seller video to profile', profileError);
          throw new Error('Your video could not be saved to your seller profile. Please try again.');
        }
        if (!updated) throw new Error('The video uploaded, but Flipora could not attach it to your seller account.');
        if (selectedPreviewUrl) {
          URL.revokeObjectURL(selectedPreviewUrl);
          selectedPreviewUrl = '';
        }
        sellerVideoPreview.src = publicUrl;
        sellerVideoPreview.hidden = false;
        sellerVideoRemoveButton.hidden = false;
        selectedVideoFile = null;
        sellerVideoInput.value = '';
        showToast('Your seller video is saved to your account and visible to buyers.');
      } catch (error) {
        showToast(error.message || 'Could not publish seller video.');
        sellerVideoUploadButton.disabled = false;
      } finally {
        sellerVideoUploadButton.textContent = originalText;
        if (!selectedVideoFile) sellerVideoUploadButton.disabled = true;
      }
    });

    sellerVideoRemoveButton.addEventListener('click', async () => {
      if (!currentUser) return;
      sellerVideoRemoveButton.disabled = true;
      try {
        const { data: profile } = await db.from('profiles').select('profile_video_url').eq('id', currentUser.id).maybeSingle();
        const videoUrl = profile?.profile_video_url || '';
        if (videoUrl) {
          const marker = '/storage/v1/object/public/seller-videos/';
          const index = videoUrl.indexOf(marker);
          if (index !== -1) {
            const path = decodeURIComponent(videoUrl.slice(index + marker.length).split('?')[0]);
            const { error: removeError } = await db.storage.from('seller-videos').remove([path]);
            if (removeError) throw removeError;
          }
        }
        const { error } = await db.from('profiles').update({ profile_video_url: null }).eq('id', currentUser.id);
        if (error) throw error;
        sellerVideoPreview.pause();
        sellerVideoPreview.removeAttribute('src');
        sellerVideoPreview.hidden = true;
        sellerVideoRemoveButton.hidden = true;
        showToast('Seller profile video removed.');
      } catch (error) {
        showToast(error.message || 'Could not remove seller video.');
      } finally {
        sellerVideoRemoveButton.disabled = false;
      }
    });
  }

  async function loadSellerVideo() {
    if (!currentUser || !sellerVideoPreview) return;
    try {
      await ensureProfile();
      const { data, error } = await db.from('profiles').select('profile_video_url').eq('id', currentUser.id).maybeSingle();
      if (error) throw error;
      const url = data?.profile_video_url || '';
      sellerVideoPreview.hidden = !url;
      sellerVideoRemoveButton.hidden = !url;
      if (url) {
        sellerVideoPreview.src = url;
        sellerVideoPreview.load();
      } else {
        sellerVideoPreview.removeAttribute('src');
      }
    } catch (error) {
      console.error('Could not load seller video', error);
    }
  }

  document.querySelector('#accountButton').addEventListener('click', () => {
    window.setTimeout(loadAvatar, 250);
    window.setTimeout(loadSellerVideo, 300);
  });
  db.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      window.setTimeout(loadAvatar, 350);
      window.setTimeout(loadSellerVideo, 400);
    } else {
      showAvatar('', 'F');
      if (sellerVideoPreview) {
        sellerVideoPreview.removeAttribute('src');
        sellerVideoPreview.hidden = true;
        sellerVideoRemoveButton.hidden = true;
      }
    }
  });
})();
