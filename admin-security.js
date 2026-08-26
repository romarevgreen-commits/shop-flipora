(() => {
  const storageKey = 'flipora-admin-dismissed-alerts';
  let lastSignature = '';

  function dismissed() {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { return new Set(); }
  }

  function saveDismissed(set) {
    localStorage.setItem(storageKey, JSON.stringify([...set].slice(-200)));
  }

  function ensureCenter() {
    if (document.querySelector('#adminSecurityCenter')) return document.querySelector('#adminSecurityCenter');
    const analytics = document.querySelector('.analytics-grid');
    if (!analytics) return null;
    const section = document.createElement('section');
    section.id = 'adminSecurityCenter';
    section.className = 'security-center';
    section.innerHTML = `
      <div class="security-center-head">
        <div><p class="eyebrow">Fraud & security</p><h2>Alerts & notifications</h2><p class="security-note">These are review signals, not proof of fraud. Confirm the facts before restricting an account, refunding an order, or contacting a client.</p></div>
        <button class="secondary" id="refreshSecurity" type="button">Refresh alerts</button>
      </div>
      <div class="security-center-summary" id="securitySummary"></div>
      <div class="security-alert-list" id="securityAlertList"></div>
      <div class="security-audit"><h3>Recent administrator activity</h3><div class="audit-list" id="securityAuditList"></div></div>`;
    analytics.insertAdjacentElement('afterend', section);
    section.querySelector('#refreshSecurity').addEventListener('click', async () => {
      try { await loadDashboard(); toast('Security alerts refreshed.'); }
      catch (error) { toast(error.message); }
    });
    return section;
  }

  function alertKey(alert) {
    return [alert.code, alert.order_id || '', alert.user_id || '', alert.message || ''].join(':');
  }

  function renderSecurity() {
    if (!adminData || document.querySelector('#adminDashboard')?.hidden) return;
    const center = ensureCenter();
    if (!center) return;
    const alerts = Array.isArray(adminData.securityAlerts) ? adminData.securityAlerts : [];
    const dismissedSet = dismissed();
    const visible = alerts.filter(alert => !dismissedSet.has(alertKey(alert)));
    const high = visible.filter(a => a.severity === 'high').length;
    const medium = visible.filter(a => a.severity === 'medium').length;
    const low = visible.filter(a => a.severity === 'low').length;
    const disputes = (adminData.orders || []).filter(o => String(o.status || '').toLowerCase() === 'disputed').length;

    center.querySelector('#securitySummary').innerHTML = `
      <div class="security-summary"><strong>${high}</strong><span>High-priority alerts</span></div>
      <div class="security-summary"><strong>${medium}</strong><span>Review alerts</span></div>
      <div class="security-summary"><strong>${low}</strong><span>Operational notices</span></div>
      <div class="security-summary"><strong>${disputes}</strong><span>Open disputes</span></div>`;

    const list = center.querySelector('#securityAlertList');
    if (!visible.length) {
      list.innerHTML = '<div class="security-empty">No active fraud or security alerts were found from the current order and account data.</div>';
    } else {
      list.innerHTML = visible.map(alert => {
        const key = escapeHtml(alertKey(alert));
        const icon = alert.severity === 'high' ? '⚠️' : alert.severity === 'medium' ? '🔎' : '🔔';
        const target = alert.order_id ? `Order #${escapeHtml(alert.order_id)}` : alert.user_id ? escapeHtml(userEmail(alert.user_id)) : 'Flipora';
        return `<article class="security-alert ${escapeHtml(alert.severity || 'low')}">
          <span class="security-alert-icon">${icon}</span>
          <div><span class="security-badge">${escapeHtml(alert.severity || 'notice')}</span> <strong>${escapeHtml(alert.title || 'Security notice')}</strong><p>${escapeHtml(alert.message || '')}</p><p><strong>${target}</strong></p></div>
          <div class="security-actions"><button class="secondary" type="button" data-dismiss-security="${key}">Dismiss</button></div>
        </article>`;
      }).join('');
      list.querySelectorAll('[data-dismiss-security]').forEach(button => button.addEventListener('click', () => {
        const set = dismissed();
        set.add(button.dataset.dismissSecurity);
        saveDismissed(set);
        renderSecurity();
      }));
    }

    const audit = Array.isArray(adminData.auditLog) ? adminData.auditLog : [];
    center.querySelector('#securityAuditList').innerHTML = audit.length ? audit.slice(0, 20).map(row => `
      <div class="audit-row"><time>${escapeHtml(dateTime(row.created_at))}</time><strong>${escapeHtml(row.action || 'admin_action')}</strong><span>${escapeHtml(row.target_type || 'system')}${row.target_id ? ' · ' + escapeHtml(row.target_id) : ''}</span></div>`).join('') : '<div class="security-empty">No administrator actions have been logged yet.</div>';
  }

  const originalLoadDashboard = loadDashboard;
  loadDashboard = async function(...args) {
    const result = await originalLoadDashboard.apply(this, args);
    renderSecurity();
    return result;
  };

  const observer = new MutationObserver(() => {
    if (!adminData) return;
    const signature = JSON.stringify([(adminData.securityAlerts || []).length, (adminData.auditLog || []).length, (adminData.orders || []).length]);
    if (signature !== lastSignature) {
      lastSignature = signature;
      renderSecurity();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  setTimeout(renderSecurity, 1500);
})();
