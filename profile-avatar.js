(() => {
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
      <div><h3>Seller profile video</h3><p>Add a short video buyers can watch on your seller profile.</p></div>
      <video id="sellerVideoPreview" class="seller-video-preview" controls playsinline hidden></video>
      <input id="sellerVideoInput" type="file" accept="video/*,.mp4,.mov,.webm,.m4v,.3gp" hidden>
      <div class="seller-video-actions">
        <button class="button button-secondary" id="chooseSellerVideo" type="button">Choose 15-second video</button>
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

    chooseSellerVideo.addEventListener('click', () => sellerVideoInput.click());

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

      const objectUrl = URL.createObjectURL(file);
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.playsInline = true;
      probe.src = objectUrl;
      probe.onloadedmetadata = () => {
        const duration = probe.duration;
        if (!Number.isFinite(duration) || duration > 15.5) {
          URL.revokeObjectURL(objectUrl);
          sellerVideoInput.value = '';
          sellerVideoPreview.hidden = true;
          sellerVideoPreview.removeAttribute('src');
          showToast('Your seller profile video must be 15 seconds or shorter.');
          return;
        }
        if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
        selectedPreviewUrl = objectUrl;
        selectedVideoFile = file;
        sellerVideoPreview.src = objectUrl;
        sellerVideoPreview.hidden = false;
        sellerVideoUploadButton.disabled = false;
        showToast('Video ready. Tap Publish video to add it to your seller profile.');
      };
      probe.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        sellerVideoInput.value = '';
        showToast('Could not read that video. Try recording or exporting it as MP4.');
      };
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
        if (profileError) throw profileError;
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
      if (url) sellerVideoPreview.src = url;
      else sellerVideoPreview.removeAttribute('src');
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