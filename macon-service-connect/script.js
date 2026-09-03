document.getElementById('year').textContent = new Date().getFullYear();

const servicePhotoStyles=document.createElement('style');
servicePhotoStyles.textContent=`
.service-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px!important}
.service-card{position:relative!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;justify-content:flex-end!important;min-height:300px!important;padding:28px!important;background-size:cover!important;background-position:center!important;color:#fff!important;border-color:rgba(255,255,255,.15)!important;box-shadow:0 16px 34px rgba(14,27,54,.12)!important;isolation:isolate!important}
.service-card::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,20,43,.08) 0%,rgba(8,20,43,.32) 42%,rgba(8,20,43,.86) 100%);z-index:0}
.service-card>*{position:relative;z-index:1}.service-card>span{position:absolute!important;top:20px;left:20px;width:52px;height:52px;display:grid;place-items:center;font-size:26px!important;border-radius:15px;background:rgba(255,255,255,.22);backdrop-filter:blur(8px);box-shadow:0 8px 18px rgba(0,0,0,.12)}
.service-card h3{margin:0 0 7px!important;color:#fff!important;font-size:25px!important;letter-spacing:-.02em}.service-card p{margin:0!important;color:rgba(255,255,255,.94)!important;font-size:15px!important;max-width:520px}.service-card:hover{transform:translateY(-4px)!important;border-color:rgba(255,255,255,.38)!important;box-shadow:0 20px 42px rgba(14,27,54,.18)!important}
.service-card[data-service="Lawn Care"]{background-image:url('https://images.unsplash.com/photo-1598902108854-10e335adac99?auto=format&fit=crop&w=1400&q=82')}
.service-card[data-service="Junk Removal"]{background-image:url('https://images.unsplash.com/photo-1517142089942-ba376ce32a2e?auto=format&fit=crop&w=1400&q=82')}
.service-card[data-service="House Cleaning"]{background-image:url('https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=82')}
.service-card[data-service="Mobile Detailing"]{background-image:url('https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1400&q=82')}
.service-card[data-service="Handyman"]{background-image:url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=82')}
.service-card[data-service="Moving Help"]{background-image:url('https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1400&q=82')}
.service-card[data-service="Pressure Washing"]{background-image:url('https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1400&q=82')}
.service-card[data-service="Other"]{background-image:url('https://images.unsplash.com/photo-1521790797524-b2497295b8a0?auto=format&fit=crop&w=1400&q=82')}
.sample-work-visual{height:210px!important;background-size:cover!important;background-position:center!important}
.sample-work-visual.lawn{background-image:linear-gradient(180deg,rgba(8,20,43,.08),rgba(8,20,43,.28)),url('https://images.unsplash.com/photo-1598902108854-10e335adac99?auto=format&fit=crop&w=1200&q=82')!important}
.sample-work-visual.junk{background-image:linear-gradient(180deg,rgba(8,20,43,.08),rgba(8,20,43,.28)),url('https://images.unsplash.com/photo-1517142089942-ba376ce32a2e?auto=format&fit=crop&w=1200&q=82')!important}
.sample-work-visual.clean{background-image:linear-gradient(180deg,rgba(8,20,43,.08),rgba(8,20,43,.28)),url('https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=82')!important}
.sample-work-visual.detail{background-image:linear-gradient(180deg,rgba(8,20,43,.08),rgba(8,20,43,.28)),url('https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1200&q=82')!important}
.sample-work-visual.handyman{background-image:linear-gradient(180deg,rgba(8,20,43,.08),rgba(8,20,43,.28)),url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=82')!important}
.sample-work-visual.wash{background-image:linear-gradient(180deg,rgba(8,20,43,.08),rgba(8,20,43,.28)),url('https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=82')!important}
@media(max-width:900px){.service-card{min-height:250px!important}}
@media(max-width:620px){.service-grid{grid-template-columns:1fr!important}.service-card{min-height:280px!important;padding:24px!important}.service-card h3{font-size:23px!important}}
`;
document.head.appendChild(servicePhotoStyles);


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

// Public provider work gallery + approved provider service covers
const mscEsc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function loadPublicPortfolio(){
  if(!window.mscSupabase)return;
  const {data,error}=await window.mscSupabase.from('msc_work_photos').select('id,business_name,image_path,caption,service_category,created_at,is_cover').order('created_at',{ascending:false}).limit(40);
  if(error){console.error(error);return;}
  const photos=data||[];
  const gallery=document.getElementById('workGallery');
  if(gallery){
    const recent=photos.slice(0,8);
    if(!recent.length){gallery.innerHTML='<div class="empty-state"><strong>No approved provider photos yet.</strong><br>Approved business owners can upload completed-work pictures from their dashboard.</div>';}
    else gallery.innerHTML=recent.map(photo=>{const url=window.mscSupabase.storage.from('msc-work-photos').getPublicUrl(photo.image_path).data.publicUrl;return `<article class="work-card"><img src="${mscEsc(url)}" alt="${mscEsc(photo.caption||photo.service_category)}" loading="lazy"><div class="work-card-body"><span class="eyebrow">${mscEsc(photo.service_category)}</span><h3>${mscEsc(photo.caption||'Completed local project')}</h3><p>${mscEsc(photo.business_name||'Local provider')}</p></div></article>`;}).join('');
  }
  const covers=new Map();
  photos.filter(p=>p.is_cover).forEach(photo=>{if(!covers.has(photo.service_category))covers.set(photo.service_category,photo);});
  document.querySelectorAll('.service-card[data-service]').forEach(card=>{
    const photo=covers.get(card.dataset.service);
    if(!photo)return;
    const url=window.mscSupabase.storage.from('msc-work-photos').getPublicUrl(photo.image_path).data.publicUrl;
    card.style.backgroundImage=`url("${url.replace(/"/g,'%22')}")`;
    card.dataset.providerCover='true';
    card.title=`Service photo from ${photo.business_name||'an approved local provider'}`;
  });
}
loadPublicPortfolio();
