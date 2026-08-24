(() => {
  const supported = new Set(['en', 'es', 'fr', 'pt', 'zh-CN', 'vi', 'ko']);
  const select = document.querySelector('#languageSelect');
  if (!select) return;

  const readLanguage = () => {
    const match = document.cookie.match(/(?:^|; )googtrans=\/en\/([^;]+)/);
    return match && supported.has(match[1]) ? match[1] : 'en';
  };

  const applyLanguage = language => {
    const combo = document.querySelector('.goog-te-combo');
    if (!combo) return false;
    combo.value = language;
    combo.dispatchEvent(new Event('change'));
    localStorage.setItem('flipora-language', language);
    return true;
  };

  select.value = readLanguage();
  select.addEventListener('change', () => {
    const language = select.value;
    if (language === 'en') {
      document.cookie = 'googtrans=; max-age=0; path=/';
      document.cookie = 'googtrans=; max-age=0; path=/; domain=' + location.hostname;
      localStorage.setItem('flipora-language', 'en');
      location.reload();
      return;
    }
    if (!applyLanguage(language)) {
      select.disabled = true;
      setTimeout(() => {
        select.disabled = false;
        if (!applyLanguage(language)) alert('Translation is still loading. Please try again.');
      }, 1200);
    }
  });

  window.fliporaTranslateInit = () => {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'es,fr,pt,zh-CN,vi,ko',
      autoDisplay: false
    }, 'google_translate_element');
    const saved = localStorage.getItem('flipora-language');
    if (saved && saved !== 'en' && supported.has(saved)) {
      select.value = saved;
      setTimeout(() => applyLanguage(saved), 400);
    }
  };
})();