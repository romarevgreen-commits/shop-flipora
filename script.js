const starterListings = [
  { title: "Noise-canceling headphones", price: 48, category: "Tech", area: "2 miles away", emoji: "🎧", color: "#e8e1ff" },
  { title: "Healthy monstera plant", price: 22, category: "Home", area: "1 mile away", emoji: "🪴", color: "#e3f4d5" },
  { title: "Classic 35mm camera", price: 95, category: "Hobbies", area: "4 miles away", emoji: "📷", color: "#f5e4ce" },
  { title: "Everyday canvas sneakers", price: 35, category: "Style", area: "3 miles away", emoji: "👟", color: "#dcecff" },
  { title: "Compact turntable", price: 80, category: "Tech", area: "5 miles away", emoji: "🎵", color: "#f6ddeb" },
  { title: "Ceramic table lamp", price: 30, category: "Home", area: "2 miles away", emoji: "💡", color: "#fff1c7" },
  { title: "Weekend travel bag", price: 42, category: "Style", area: "6 miles away", emoji: "👜", color: "#e5ddda" },
  { title: "Complete skateboard", price: 55, category: "Hobbies", area: "1 mile away", emoji: "🛹", color: "#dff4f1" }
];

const saved = JSON.parse(localStorage.getItem("fliporaListings") || "[]");
let listings = [...saved, ...starterListings];
let activeCategory = "All";
const grid = document.querySelector("#listingGrid");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");

function renderListings() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = listings.filter((item) =>
    (activeCategory === "All" || item.category === activeCategory) &&
    item.title.toLowerCase().includes(query)
  );
  grid.innerHTML = visible.map((item) => `
    <article class="listing-card">
      <div class="listing-image" style="--card-bg:${item.color}" aria-hidden="true">${item.emoji}</div>
      <div class="listing-body">
        <div class="listing-meta"><span class="listing-category">${item.category}</span><span class="price">$${Number(item.price).toLocaleString()}</span></div>
        <h3>${escapeHtml(item.title)}</h3><p>${item.area}</p>
      </div>
    </article>`).join("");
  emptyState.hidden = visible.length !== 0;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

document.querySelector("#categoryFilters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("active", chip === button));
  renderListings();
});
searchInput.addEventListener("input", renderListings);

const dialog = document.querySelector("#sellDialog");
document.querySelectorAll("[data-open-sell]").forEach((button) => button.addEventListener("click", () => dialog.showModal()));
document.querySelector("#sellForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const item = { title: String(form.get("title")), price: Number(form.get("price")), category: String(form.get("category")), area: "Just listed", emoji: "✨", color: "#e8e1ff" };
  saved.unshift(item); listings.unshift(item);
  localStorage.setItem("fliporaListings", JSON.stringify(saved));
  event.currentTarget.reset(); dialog.close(); activeCategory = "All";
  document.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.category === "All"));
  renderListings(); showToast("Your demo listing is live!");
});

function showToast(message) {
  const toast = document.querySelector("#toast"); toast.textContent = message; toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}
document.querySelector("#year").textContent = new Date().getFullYear();
renderListings();
