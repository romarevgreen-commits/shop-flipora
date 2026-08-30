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
    if (url) { image.src = url; image.hidden = false; placeholder.hidden = true; }
    else { image.removeAttribute('src'); image.hidden = true; placeholder.hidden = false; placeholder.textContent = String(name || 'F').charAt(0).toUpperCase(); }
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
    chooseButton.disabled = true; chooseButton.textContent = 'Uploading…';
    try {
      await ensureProfile();
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${currentUser.id}/avatar.${extension}`;
      const { error: uploadError } = await db.storage.from('profile-images').upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const publicUrl = db.storage.from('profile-images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
      const { data: updated, error: profileError } = await db.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id).select('id').maybeSingle();
      if (profileError) throw profileError;
      if (!updated) throw new Error('Could not save your profile picture to your account.');
      showAvatar(publicUrl, currentUser.email); showToast('Your seller profile picture was updated.');
    } catch (error) { showToast(error.message || 'Could not upload profile picture.'); }
    finally { input.value = ''; chooseButton.disabled = false; chooseButton.textContent = 'Add or change photo'; }
  });
  document.querySelector('#accountButton').addEventListener('click', () => window.setTimeout(loadAvatar, 250));
  db.auth.onAuthStateChange((_event, session) => { if (session?.user) window.setTimeout(loadAvatar, 350); else showAvatar('', 'F'); });
})();
