(() => {
  const style = document.createElement('style');
  style.textContent = `
    .hero-art.hero-photo-wall{position:relative;overflow:hidden;background:linear-gradient(145deg,#5b35f2,#7d5cff);border-radius:38px;box-shadow:var(--shadow);transform:none}
    .hero-art.hero-photo-wall:before{display:none!important}
    .hero-photo-wall .cover-photo{position:absolute;margin:0;overflow:hidden;border-radius:26px;border:5px solid rgba(255,255,255,.94);box-shadow:0 20px 45px rgba(24,20,43,.28);background:#ddd}
    .hero-photo-wall .cover-photo img{width:100%;height:100%;display:block;object-fit:cover}
    .hero-photo-wall .cover-photo-one{width:58%;height:58%;left:7%;top:8%;transform:rotate(-5deg)}
    .hero-photo-wall .cover-photo-two{width:47%;height:45%;right:5%;top:25%;transform:rotate(6deg)}
    .hero-photo-wall .cover-photo-three{width:49%;height:40%;left:22%;bottom:5%;transform:rotate(2deg)}
    .hero-photo-wall .cover-sold-badge{position:absolute;left:12px;top:12px;z-index:2;background:#18142b;color:#fff;padding:7px 11px;border-radius:999px;font-size:.68rem;font-weight:950;letter-spacing:.09em;text-transform:uppercase;box-shadow:0 5px 15px rgba(0,0,0,.18)}
    @media(max-width:900px){.hero-art.hero-photo-wall{height:420px}}
    @media(max-width:560px){.hero-art.hero-photo-wall{height:330px}.hero-photo-wall .cover-photo{border-width:4px;border-radius:20px}.hero-photo-wall .cover-sold-badge{font-size:.58rem;padding:6px 9px}}
  `;
  document.head.appendChild(style);

  const heroArt = document.querySelector('.hero-art');
  if (!heroArt) return;
  heroArt.className = 'hero-art hero-photo-wall';
  heroArt.setAttribute('aria-label', 'Photo showcase of sold marketplace items');
  heroArt.innerHTML = `
    <figure class="cover-photo cover-photo-one">
      <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=86" alt="Wireless headphones sold on a marketplace" loading="eager" referrerpolicy="no-referrer">
      <span class="cover-sold-badge">Sold</span>
    </figure>
    <figure class="cover-photo cover-photo-two">
      <img src="https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=900&q=86" alt="Home furniture sold on a marketplace" loading="eager" referrerpolicy="no-referrer">
      <span class="cover-sold-badge">Sold</span>
    </figure>
    <figure class="cover-photo cover-photo-three">
      <img src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=86" alt="Camera sold on a marketplace" loading="eager" referrerpolicy="no-referrer">
      <span class="cover-sold-badge">Sold</span>
    </figure>
  `;
})();
