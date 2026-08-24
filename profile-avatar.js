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
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${currentUser.id}/avatar.${extension}`;
      const { error: uploadError } = await db.storage.from('profile-images').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true
      });
      if (uploadError) throw uploadError;
      const publicUrl = db.storage.from('profile-images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
      const { error: profileError } = await db.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
      if (profileError) throw profileError;
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

  document.querySelector('#accountButton').addEventListener('click', () => window.setTimeout(loadAvatar, 250));
  db.auth.onAuthStateChange((_event, session) => {
    if (session?.user) window.setTimeout(loadAvatar, 350);
    else showAvatar('', 'F');
  });
})();