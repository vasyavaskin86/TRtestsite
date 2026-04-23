const SERVICES_STORAGE_KEY = "sportshop_services";

function loadServicesLocal() {
  try {
    const raw = localStorage.getItem(SERVICES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderServicesPage(items) {
  const grid = document.getElementById("servicesGrid");
  const empty = document.getElementById("servicesEmpty");
  if (!grid || !empty) return;
  const list = Array.isArray(items) ? items : [];
  grid.innerHTML = "";
  if (!list.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  list.forEach((service) => {
    const image = service.image || "https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=1200";
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image" style="background-image:url('${image}')"></div>
      <div class="product-content">
        <div class="product-category">Услуга</div>
        <h3 class="product-title">${service.name || "Услуга"}</h3>
        <p class="product-description">${service.description || "Описание услуги будет добавлено позже."}</p>
        <div class="product-footer">
          <div class="product-price">${new Intl.NumberFormat("ru-RU").format(Number(service.price) || 0)} <span>₽</span></div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await restoreSession?.();
  await syncPublicDataFromServer?.();
  initYear?.();
  setHeaderAuthUI?.();
  setCartCountUI?.();
  try {
    const services = await api.getServices();
    if (Array.isArray(services)) {
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
      renderServicesPage(services);
      return;
    }
  } catch {
    // fallback ниже
  }
  renderServicesPage(loadServicesLocal());
});
