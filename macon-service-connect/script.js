document.getElementById('year').textContent = new Date().getFullYear();

const serviceSelect = document.getElementById('serviceSelect');
document.querySelectorAll('[data-service]').forEach(card => {
  card.addEventListener('click', () => {
    serviceSelect.value = card.dataset.service;
    document.getElementById('quote').scrollIntoView({behavior:'smooth'});
    setTimeout(() => serviceSelect.focus(), 450);
  });
});

document.querySelectorAll('[data-plan]').forEach(button => {
  button.addEventListener('click', () => {
    const plan = button.dataset.plan.toLowerCase().includes('featured') ? 'Featured' : 'Starter';
    window.location.href = `business-account.html?mode=signup&plan=${encodeURIComponent(plan)}`;
  });
});

const quoteForm = document.getElementById('customerQuoteForm');
if (quoteForm && window.mscSupabase) {
  quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = quoteForm.querySelector('button[type="submit"]');
    const message = document.getElementById('quoteMessage');
    button.disabled = true;
    message.textContent = 'Sending your request…';
    const form = new FormData(quoteForm);
    const payload = {
      customer_name: form.get('name').trim(),
      customer_email: form.get('email').trim(),
      customer_phone: form.get('phone').trim(),
      service_category: form.get('service'),
      street_address: form.get('street-address').trim(),
      city: form.get('city').trim() || 'Macon',
      zip: form.get('zip').trim(),
      preferred_date: form.get('preferred-date') || null,
      preferred_time: form.get('preferred-time') || null,
      job_description: form.get('details').trim(),
      access_notes: form.get('access-notes').trim() || null
    };
    const { error } = await window.mscSupabase.from('msc_customer_requests').insert(payload);
    button.disabled = false;
    if (error) {
      message.textContent = 'We could not send the request. Please check your information and try again.';
      message.className = 'form-message error';
      console.error(error);
      return;
    }
    window.location.href = 'thanks.html';
  });
}
