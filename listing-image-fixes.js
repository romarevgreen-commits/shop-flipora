(() => {
  const samplePhotos = {
    "Noise-canceling headphones": { src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82", emoji: "🎧" },
    "Healthy monstera plant": { src: "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=82", emoji: "🪴" },
    "Classic 35mm camera": { src: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=82", emoji: "📷" },
    "Everyday canvas sneakers": { src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=82", emoji: "👟" },
    "Compact turntable": { src: "https://images.unsplash.com/photo-1461360228754-6e81c478b882?auto=format&fit=crop&w=900&q=82", emoji: "🎵" },
    "Ceramic table lamp": { src: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=82", emoji: "💡" },
    "Weekend travel bag": { src: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=82", emoji: "👜" },
    "Complete skateboard": { src: "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=900&q=82", emoji: "🛹" }
  };

  const style = document.createElement("style");
  style.textContent = `
    .listing-image{position:relative;overflow:hidden}
    .listing-image img{display:block;width:100%;height:100%;object-fit:cover;font-size:0!important;color:transparent!important;line-height:0!important}
    .listing-image-fallback{width:100%;height:100%;display:grid;place-items:center;font-size:4rem;line-height:1;background:var(--card-bg,#eee)}
  `;
  document.head.appendChild(style);

  const categoryEmoji = category => ({ Tech: "💻", Home: "🏠", Style: "👕", Hobbies: "🎨", Other: "📦" })[category] || "📦";

  const fallbackForCard = card => {
    const title = card.querySelector("h3")?.textContent?.trim() || "";
    const category = card.querySelector(".listing-category")?.textContent?.trim() || "";
    return samplePhotos[title]?.emoji || categoryEmoji(category);
  };

  const showFallback = (card, holder) => {
    holder.innerHTML = `<span class="listing-image-fallback" aria-hidden="true">${fallbackForCard(card)}</span>`;
  };

  const watchImage = (img, card, holder) => {
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.addEventListener("error", () => showFallback(card, holder), { once: true });
    if (img.complete && img.naturalWidth === 0) showFallback(card, holder);
  };

  const repairCard = card => {
    const holder = card.querySelector(".listing-image");
    if (!holder) return;
    const title = card.querySelector("h3")?.textContent?.trim() || "";
    let img = holder.querySelector("img");

    if (!img && samplePhotos[title]) {
      holder.innerHTML = "";
      img = document.createElement("img");
      img.src = samplePhotos[title].src;
      img.loading = "lazy";
      holder.appendChild(img);
    }

    if (img) watchImage(img, card, holder);
  };

  const repairAll = () => document.querySelectorAll("#listingGrid .listing-card").forEach(repairCard);

  const grid = document.querySelector("#listingGrid");
  if (!grid) return;
  repairAll();

  const observer = new MutationObserver(() => repairAll());
  observer.observe(grid, { childList: true, subtree: true });
})();
