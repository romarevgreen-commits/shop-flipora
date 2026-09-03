const MSC_SUPABASE_URL='https://opyzvpsbjqcdfeircica.supabase.co';
const MSC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_dZXo7TQxYnqloxuvYJ5hxA_MMNdDOIK';
window.mscSupabase=window.supabase.createClient(MSC_SUPABASE_URL,MSC_SUPABASE_PUBLISHABLE_KEY);
if(!document.querySelector('link[href="portfolio.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='portfolio.css';document.head.appendChild(l);}
const p=location.pathname;if(/\/macon-service-connect\/(?:index\.html)?$/.test(p)){const s=document.createElement('script');s.src='public-work-gallery.js';s.defer=true;document.head.appendChild(s);}
