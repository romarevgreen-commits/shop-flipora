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

(() => {
  function loadScript(src, attribute) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[${attribute}]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.setAttribute(attribute, 'true');
      script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.body.appendChild(script);
    });
  }

  const loadMemberTools = async () => {
    try {
      await loadScript('stripe-connect-ui.js?v=20260829-seller-gate-1', 'data-flipora-stripe-connect');
      await loadScript('item-purchase-details.js?v=20260827-1', 'data-flipora-item-details');
      await loadScript('membership-access.js?v=20260829-seller-stripe-gate-1', 'data-flipora-member-access');
      await loadScript('orders-dashboard.js?v=20260826-item-number-shipping-2', 'data-flipora-orders-dashboard');
      await loadScript('seller-activity.js?v=20260826-seller-chart-1', 'data-flipora-seller-activity');
      await loadScript('opportunity-membership.js?v=20260826-member-lock-1', 'data-flipora-opportunity-membership');
    } catch (error) {
      console.error('Could not load Flipora member tools', error);
    }
  };

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', loadMemberTools, { once: true });
  else loadMemberTools();
})();
