const STORAGE_KEY = "sportshop_products";
const CAROUSEL_KEY = "sportshop_carousel_slides";
const PROMOTIONS_KEY = "sportshop_promotions";
const NEWS_KEY = "sportshop_news";
const SERVICES_KEY = "sportshop_services";
const SETTINGS_KEY = "sportshop_settings";

const defaultProducts = [
  {
    id: crypto.randomUUID(),
    name: "Горный велосипед Trail X300",
    category: "bicycles",
    price: 48990,
    description: "Лёгкая алюминиевая рама, дисковые тормоза и 24 скорости для уверенного катания по пересечённой местности.",
    fullDescription:
      "Trail X300 создан для тех, кто хочет уверенно чувствовать себя и в городе, и на лёгком бездорожье.\n\nКомбинация лёгкой рамы, дисковых тормозов и трансмиссии на 24 скорости позволяет подобрать комфортный режим на подъёмах и спусках.",
    images: [
      "https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg?auto=compress&cs=tinysrgb&w=1200",
      "https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=1200",
      "https://images.pexels.com/photos/1413412/pexels-photo-1413412.jpeg?auto=compress&cs=tinysrgb&w=1200",
    ],
    tag: "Новинка",
    attributes: {
      manufacturer: "Trail",
      wheelDiameter: 29,
      frameSize: "M",
      color: "Чёрный",
      brakeType: "Дисковые",
      suspension: "Передняя",
    },
  },
  {
    id: crypto.randomUUID(),
    name: "Городской самокат Urban Glide",
    category: "scooters",
    price: 12990,
    description: "Складной алюминиевый самокат с амортизацией и большими колёсами для города.",
    fullDescription:
      "Urban Glide — лёгкий и прочный складной самокат для ежедневных поездок.\n\nАмортизация и большие колёса снижают вибрации на плитке и неровном асфальте.",
    images: [
      "https://images.pexels.com/photos/1448387/pexels-photo-1448387.jpeg?auto=compress&cs=tinysrgb&w=1200",
      "https://images.pexels.com/photos/1448386/pexels-photo-1448386.jpeg?auto=compress&cs=tinysrgb&w=1200",
    ],
    tag: "Хит",
  },
  {
    id: crypto.randomUUID(),
    name: "Роликовые коньки Street Pro 80",
    category: "rollers",
    price: 8990,
    description: "Комфортные ролики с поддержкой голеностопа и колёсами 80 мм для городского катания.",
    fullDescription:
      "Street Pro 80 — универсальные ролики для прогулок и обучения.\n\nЖёсткий ботинок фиксирует ногу, а колёса 80 мм дают баланс скорости и управляемости.",
    images: [
      "https://images.pexels.com/photos/6156384/pexels-photo-6156384.jpeg?auto=compress&cs=tinysrgb&w=1200",
      "https://images.pexels.com/photos/6156405/pexels-photo-6156405.jpeg?auto=compress&cs=tinysrgb&w=1200",
    ],
    tag: "Популярно",
  },
  {
    id: crypto.randomUUID(),
    name: "Комплект светодиодных фонарей",
    category: "accessories",
    price: 1990,
    description: "Передний и задний фонарь с несколькими режимами свечения для безопасности в тёмное время суток.",
    fullDescription:
      "Набор фонарей для велосипеда и самоката: яркий передний свет и заметный красный задний.\n\nПоддерживаются несколько режимов, включая мигание.",
    images: ["https://images.pexels.com/photos/6408298/pexels-photo-6408298.jpeg?auto=compress&cs=tinysrgb&w=1200"],
    tag: "Безопасность",
  },
  {
    id: crypto.randomUUID(),
    name: "Цепь усиленная 10‑скоростная",
    category: "parts",
    price: 1590,
    description: "Износостойкая цепь для горных и городских велосипедов с трансмиссией 10 скоростей.",
    fullDescription:
      "Усиленная цепь для 10‑скоростных трансмиссий.\n\nПодходит для регулярных поездок и тренировок, рассчитана на повышенные нагрузки.",
    images: ["https://images.pexels.com/photos/2765175/pexels-photo-2765175.jpeg?auto=compress&cs=tinysrgb&w=1200"],
    tag: "Запчасть",
  },
];

function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
      return defaultProducts;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
      return defaultProducts;
    }
    return parsed;
  } catch {
    return defaultProducts;
  }
}

async function syncPublicDataFromServer() {
  const grid = document.getElementById("productsGrid");
  if (grid) {
    grid.innerHTML = Array(8).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-img skeleton"></div>
        <div class="skeleton-title skeleton"></div>
        <div class="skeleton-text skeleton"></div>
        <div class="skeleton-price skeleton"></div>
      </div>
    `).join("");
  }

  try {
    const [products, carousel, promotions, news, services, settings] = await Promise.all([
      api.getProducts(),
      api.getCarousel(),
      api.getPromotions(),
      api.getNews(),
      api.getServices(),
      api.getPublicSettings(),
    ]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(products) ? products : []));
    localStorage.setItem(CAROUSEL_KEY, JSON.stringify(Array.isArray(carousel) ? carousel : []));
    localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(Array.isArray(promotions) ? promotions : []));
    localStorage.setItem(NEWS_KEY, JSON.stringify(Array.isArray(news) ? news : []));
    localStorage.setItem(SERVICES_KEY, JSON.stringify(Array.isArray(services) ? services : []));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings || {}));
  } catch {
    // Фолбэк: продолжаем работу с локальными данными
  }
}

function getCategoryLabel(category) {
  switch (category) {
    case "bicycles":
      return "Велосипеды";
    case "scooters":
      return "Самокаты";
    case "rollers":
      return "Ролики";
    case "parts":
      return "Запчасти";
    case "accessories":
      return "Аксессуары";
    default:
      return "Товар";
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function userLabel() {
  const user = typeof currentUser === "function" ? currentUser() : null;
  return user ? `Привет, ${user.name}` : "Гость";
}

function setHeaderAuthUI() {
  const authButton = document.getElementById("authButton");
  const logoutButton = document.getElementById("logoutButton");
  const user = typeof currentUser === "function" ? currentUser() : null;

  if (authButton) {
    authButton.textContent = user ? userLabel() : "Войти";
    authButton.classList.toggle("pill-muted", !user);
  }
  if (logoutButton) logoutButton.classList.toggle("hidden", !user);
  document.getElementById("myOrdersLink")?.classList.toggle("hidden", !user);
  document.querySelectorAll(".admin-link, .footer-admin-link").forEach((el) => {
    el.classList.toggle("hidden", !user?.isAdmin);
  });
}

function setCartCountUI() {
  const el = document.getElementById("cartCount");
  if (!el || typeof cartCount !== "function") return;
  el.textContent = String(cartCount());
}

function createProductCard(product, index = 0) {
  const card = document.createElement("article");
  card.className = "product-card animate-fade-in";
  card.style.animationDelay = `${index * 0.05}s`;
  card.tabIndex = 0;
  card.role = "link";
  card.dataset.productId = product.id;

  const imageUrl = (() => {
    const imgs = Array.isArray(product.images) ? product.images : [];
    const first = imgs.find((x) => typeof x === "string" && x.trim().length > 0);
    if (first) return first;
    if (product.image && typeof product.image === "string" && product.image.trim().length > 0) return product.image;
    return "https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg?auto=compress&cs=tinysrgb&w=1200";
  })();

  const bikeAttrs =
    product.category === "bicycles" && product.attributes
      ? `
        <div class="product-attrs">
          ${product.attributes.manufacturer ? `<span class="pill pill-muted">Бренд: ${product.attributes.manufacturer}</span>` : ""}
          ${product.attributes.wheelDiameter ? `<span class="pill pill-muted">Колёса: ${product.attributes.wheelDiameter}"</span>` : ""}
          ${product.attributes.frameSize ? `<span class="pill pill-muted">Рама: ${product.attributes.frameSize}</span>` : ""}
          ${product.attributes.color ? `<span class="pill pill-muted">Цвет: ${product.attributes.color}</span>` : ""}
        </div>
      `
      : "";

  card.innerHTML = `
    <button class="wishlist-btn ${typeof isInWishlist === 'function' && isInWishlist(product.id) ? 'active' : ''}" type="button" data-wishlist-toggle="${product.id}" aria-label="В избранное">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
    </button>
    <div class="product-image" style="background-image:url('${imageUrl}')"></div>
    <div class="product-content">
      <div class="product-category">${getCategoryLabel(product.category)}</div>
      <h3 class="product-title">${product.name}</h3>
      <p class="product-description">${product.description}</p>
      ${bikeAttrs}
      <div class="product-footer">
        <div class="product-price">
          ${formatPrice(product.price)} <span>₽</span>
        </div>
        <div class="product-actions">
          <button class="btn btn-secondary" type="button" data-add-to-cart="${product.id}">В корзину</button>
        </div>
      </div>
    </div>
  `;
  return card;
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const activeBtn = document.querySelector(".filter-btn.active");
  const bikeFiltersWrap = document.getElementById("bikeFilters");
  const extraFiltersWrap = document.getElementById("extraCategoryFilters");

  if (!grid || !emptyState) return;

  const category = activeBtn ? activeBtn.dataset.category : "all";
  const term = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const products = loadProducts();

  if (bikeFiltersWrap) bikeFiltersWrap.classList.toggle("hidden", category !== "bicycles");
  if (extraFiltersWrap) extraFiltersWrap.classList.toggle("hidden", category === "all" || category === "bicycles");

  const bikeFilterValues = {
    manufacturer: document.getElementById("filterManufacturer")?.value || "",
    wheelDiameter: document.getElementById("filterWheel")?.value || "",
    frameSize: document.getElementById("filterFrame")?.value || "",
    color: document.getElementById("filterColor")?.value || "",
    brakeType: document.getElementById("filterBrake")?.value || "",
    suspension: document.getElementById("filterSuspension")?.value || "",
  };
  const extraFilterValues = {
    brand: document.getElementById("filterBrand")?.value || "",
    material: document.getElementById("filterMaterial")?.value || "",
    purpose: document.getElementById("filterPurpose")?.value || "",
    subcategory: document.getElementById("filterSubcategory")?.value || "",
  };

  const filtered = products.filter((p) => {
    if (category === "wishlist") {
      return isInWishlist(p.id);
    }
    const byCategory = category === "all" || p.category === category;
    const bySearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term);

    const byBikeFilters = (() => {
      if (category !== "bicycles") return true;
      const attrs = p.attributes || {};
      if (bikeFilterValues.manufacturer && (attrs.manufacturer || "") !== bikeFilterValues.manufacturer) return false;
      if (bikeFilterValues.wheelDiameter && String(attrs.wheelDiameter || "") !== bikeFilterValues.wheelDiameter) return false;
      if (bikeFilterValues.frameSize && (attrs.frameSize || "") !== bikeFilterValues.frameSize) return false;
      if (bikeFilterValues.color && (attrs.color || "") !== bikeFilterValues.color) return false;
      if (bikeFilterValues.brakeType && (attrs.brakeType || "") !== bikeFilterValues.brakeType) return false;
      if (bikeFilterValues.suspension && (attrs.suspension || "") !== bikeFilterValues.suspension) return false;
      return true;
    })();

    const byExtraFilters = (() => {
      if (category === "all" || category === "bicycles") return true;
      const attrs = p.attributes || {};
      if (extraFilterValues.brand && (attrs.brand || "") !== extraFilterValues.brand) return false;
      if (extraFilterValues.material && (attrs.material || "") !== extraFilterValues.material) return false;
      if (extraFilterValues.purpose && (attrs.purpose || "") !== extraFilterValues.purpose) return false;
      if (extraFilterValues.subcategory && (attrs.subcategory || "") !== extraFilterValues.subcategory) return false;
      return true;
    })();

    return byCategory && bySearch && byBikeFilters && byExtraFilters;
  });

  grid.innerHTML = "";

  if (!filtered.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filtered.forEach((product, index) => {
    const card = createProductCard(product, index);
    grid.appendChild(card);
  });
}

function uniqSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "ru"));
}

function fillSelectOptions(selectEl, options) {
  if (!selectEl) return;
  const current = selectEl.value;
  const firstOption = selectEl.querySelector("option")?.outerHTML || '<option value="">Любой</option>';
  selectEl.innerHTML = firstOption + options.map((o) => `<option value="${String(o)}">${String(o)}</option>`).join("");
  if (options.includes(current)) selectEl.value = current;
}

function initBikeFilters() {
  const wrap = document.getElementById("bikeFilters");
  if (!wrap) return;

  const products = loadProducts().filter((p) => p.category === "bicycles");
  const attrsList = products.map((p) => p.attributes || {});

  const manufacturers = uniqSorted(attrsList.map((a) => a.manufacturer));
  const wheels = uniqSorted(attrsList.map((a) => a.wheelDiameter).map((x) => (x === undefined ? "" : String(x))));
  const frames = uniqSorted(attrsList.map((a) => a.frameSize));
  const colors = uniqSorted(attrsList.map((a) => a.color));
  const brakes = uniqSorted(attrsList.map((a) => a.brakeType));
  const suspensions = uniqSorted(attrsList.map((a) => a.suspension));

  fillSelectOptions(document.getElementById("filterManufacturer"), manufacturers);
  fillSelectOptions(document.getElementById("filterWheel"), wheels);
  fillSelectOptions(document.getElementById("filterFrame"), frames);
  fillSelectOptions(document.getElementById("filterColor"), colors);
  fillSelectOptions(document.getElementById("filterBrake"), brakes);
  fillSelectOptions(document.getElementById("filterSuspension"), suspensions);

  wrap.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", () => renderProducts());
  });

  document.getElementById("resetBikeFilters")?.addEventListener("click", () => {
    wrap.querySelectorAll("select").forEach((sel) => {
      sel.value = "";
    });
    renderProducts();
  });
}

function initExtraCategoryFilters() {
  const wrap = document.getElementById("extraCategoryFilters");
  if (!wrap) return;

  function rebuild() {
    const activeCategory = document.querySelector(".filter-btn.active")?.dataset.category || "all";
    if (activeCategory === "all" || activeCategory === "bicycles") return;
    const products = loadProducts().filter((p) => p.category === activeCategory);
    const attrsList = products.map((p) => p.attributes || {});
    fillSelectOptions(document.getElementById("filterBrand"), uniqSorted(attrsList.map((a) => a.brand)));
    fillSelectOptions(document.getElementById("filterMaterial"), uniqSorted(attrsList.map((a) => a.material)));
    fillSelectOptions(document.getElementById("filterPurpose"), uniqSorted(attrsList.map((a) => a.purpose)));
    fillSelectOptions(document.getElementById("filterSubcategory"), uniqSorted(attrsList.map((a) => a.subcategory)));
  }

  wrap.querySelectorAll("select").forEach((sel) => sel.addEventListener("change", () => renderProducts()));
  document.getElementById("resetExtraFilters")?.addEventListener("click", () => {
    wrap.querySelectorAll("select").forEach((sel) => {
      sel.value = "";
    });
    renderProducts();
  });
  document.addEventListener("catalog:categoryChanged", rebuild);
  rebuild();
}

function initFilters() {
  const buttons = document.querySelectorAll(".filter-btn");
  const categoryFromQuery = new URLSearchParams(window.location.search).get("category");
  if (categoryFromQuery) {
    buttons.forEach((b) => b.classList.remove("active"));
    const matched = Array.from(buttons).find((b) => b.dataset.category === categoryFromQuery);
    if (matched) matched.classList.add("active");
    document.dispatchEvent(new CustomEvent("catalog:categoryChanged"));
  }
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.dispatchEvent(new CustomEvent("catalog:categoryChanged"));
      renderProducts();
    });
  });
}

function initSearch() {
  const input = document.getElementById("searchInput");
  const wrap = input?.closest(".search-wrap");
  if (!input || !wrap) return;

  const results = document.createElement("div");
  results.className = "search-results";
  wrap.appendChild(results);

  input.addEventListener("input", () => {
    const term = input.value.trim().toLowerCase();
    if (!term) {
      results.classList.remove("active");
      renderProducts();
      return;
    }

    const products = loadProducts();
    const matched = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.description.toLowerCase().includes(term)
    ).slice(0, 5);

    if (matched.length) {
      results.innerHTML = matched.map(p => `
        <div class="search-item" data-product-id="${p.id}">
          <div class="search-item-img" style="background-image: url('${Array.isArray(p.images) ? p.images[0] : p.image}')"></div>
          <div class="search-item-info">
            <div class="search-item-title">${p.name}</div>
            <div class="search-item-price">${formatPrice(p.price)} ₽</div>
          </div>
        </div>
      `).join("");
      results.classList.add("active");
    } else {
      results.innerHTML = '<div class="search-item">Ничего не найдено</div>';
      results.classList.add("active");
    }
    
    renderProducts();
  });

  results.addEventListener("click", (e) => {
    const item = e.target.closest(".search-item");
    if (item && item.dataset.productId) {
      window.location.href = `product.html?id=${item.dataset.productId}`;
    }
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      results.classList.remove("active");
    }
  });
}

function initYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }
}

function initCarousel() {
  const track = document.getElementById("carouselTrack");
  const viewport = document.getElementById("carouselViewport");
  const prev = document.getElementById("carouselPrev");
  const next = document.getElementById("carouselNext");
  const dotsWrap = document.getElementById("carouselDots");

  if (!track || !viewport || !dotsWrap) return;

  const slides = Array.from(track.querySelectorAll(".carousel-slide"));
  if (!slides.length) return;

  let index = 0;
  let timer = null;
  const intervalMs = 6500;

  function setIndex(i, { silent = false } = {}) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    prevTranslate = -index * viewport.offsetWidth;
    dotsWrap.querySelectorAll(".dot").forEach((d) => {
      d.classList.toggle("active", d.dataset.dot === String(index));
    });
    if (!silent) restart();
  }

  function restart() {
    stop();
    timer = window.setInterval(() => setIndex(index + 1, { silent: true }), intervalMs);
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  // Swipe support
  let startX = 0;
  let isDragging = false;
  let currentTranslate = 0;
  let prevTranslate = 0;

  function handleTouchStart(e) {
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    isDragging = true;
    stop();
    track.style.transition = 'none';
  }

  function handleTouchMove(e) {
    if (!isDragging) return;
    const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    const diff = currentX - startX;
    currentTranslate = prevTranslate + diff;
    track.style.transform = `translateX(${currentTranslate}px)`;
  }

  function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    track.style.transition = 'transform var(--transition-normal, 0.3s ease)';
    
    const slideWidth = viewport.offsetWidth;
    const diff = currentTranslate - prevTranslate;
    
    if (Math.abs(diff) > slideWidth / 4) {
      if (diff > 0 && index > 0) index--;
      else if (diff < 0 && index < slides.length - 1) index++;
    }
    
    setIndex(index);
    restart();
  }

  viewport.addEventListener('touchstart', handleTouchStart);
  viewport.addEventListener('touchmove', handleTouchMove);
  viewport.addEventListener('touchend', handleTouchEnd);
  viewport.addEventListener('mousedown', handleTouchStart);
  viewport.addEventListener('mousemove', handleTouchMove);
  viewport.addEventListener('mouseup', handleTouchEnd);
  viewport.addEventListener('mouseleave', handleTouchEnd);

  prev?.addEventListener("click", () => setIndex(index - 1));
  next?.addEventListener("click", () => setIndex(index + 1));

  dotsWrap.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const dot = target.closest(".dot");
    if (!(dot instanceof HTMLElement)) return;
    const i = Number(dot.dataset.dot);
    if (!Number.isFinite(i)) return;
    setIndex(i);
  });

  viewport.addEventListener("mouseenter", stop);
  viewport.addEventListener("mouseleave", restart);
  viewport.addEventListener("focusin", stop);
  viewport.addEventListener("focusout", restart);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") setIndex(index - 1);
    if (e.key === "ArrowRight") setIndex(index + 1);
  });

  setIndex(0, { silent: true });
  restart();
}

function defaultCarouselSlides() {
  return [
    {
      id: "default-1",
      kind: "new",
      title: "Городские велосипеды 2026",
      text: "Лёгкие рамы, улучшенная геометрия, больше комфорта на ежедневных маршрутах.",
      buttonLabel: "Смотреть в каталоге",
      buttonHref: "#catalog",
    },
    {
      id: "default-2",
      kind: "sale",
      title: "-15% на аксессуары для безопасности",
      text: "Фонари, шлемы, светоотражатели и замки — комплектом выгоднее.",
      buttonLabel: "Выбрать аксессуары",
      buttonHref: "#catalog",
    },
    {
      id: "default-3",
      kind: "news",
      title: "Открыли сервисную зону",
      text: "Настройка тормозов и переключателей, базовое ТО и консультации по подбору.",
      buttonLabel: "Узнать подробнее",
      buttonHref: "#contacts",
    },
  ];
}

function loadCarouselSlides() {
  try {
    const raw = localStorage.getItem(CAROUSEL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultCarouselSlides();
    return parsed.slice(0, 10);
  } catch {
    return defaultCarouselSlides();
  }
}

function defaultPromotions() {
  return [
    {
      id: "promo-1",
      title: "Скидка на самокаты",
      discount: 20,
      description: "Только до конца недели: популярные модели самокатов со скидкой 20%.",
      image: "https://images.pexels.com/photos/1448387/pexels-photo-1448387.jpeg?auto=compress&cs=tinysrgb&w=1200",
      link: "#catalog",
    },
  ];
}

function loadPromotions() {
  try {
    const raw = localStorage.getItem(PROMOTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultPromotions();
    return parsed;
  } catch {
    return defaultPromotions();
  }
}

function defaultNews() {
  return [
    {
      id: "news-1",
      title: "Открытие новой сервисной зоны",
      date: new Date().toISOString().slice(0, 10),
      text: "Теперь можно пройти базовое ТО велосипеда прямо в магазине.",
    },
  ];
}

function loadNews() {
  try {
    const raw = localStorage.getItem(NEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultNews();
    return parsed;
  } catch {
    return defaultNews();
  }
}

function formatDateRu(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function renderPromotions() {
  const grid = document.getElementById("promotionsGrid");
  const empty = document.getElementById("promotionsEmpty");
  if (!grid || !empty) return;

  const promotions = loadPromotions();
  grid.innerHTML = "";

  if (!promotions.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  promotions.forEach((promo) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image" style="background-image:url('${promo.image || "https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg?auto=compress&cs=tinysrgb&w=1200"}')"></div>
      <div class="product-content">
        <div class="product-category">Акция</div>
        <h3 class="product-title">${promo.title}</h3>
        <p class="product-description">${promo.description || ""}</p>
        <div class="product-footer">
          <div class="product-price">${promo.discount ? `-${promo.discount}%` : "Спецпредложение"}</div>
          <a class="btn btn-secondary" href="${promo.link || "#catalog"}">Подробнее</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderNews() {
  const list = document.getElementById("newsList");
  const empty = document.getElementById("newsEmpty");
  if (!list || !empty) return;
  const items = loadNews()
    .slice()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  list.innerHTML = "";
  if (!items.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.title}</strong><br><small>${formatDateRu(item.date)}</small><br>${item.text || ""}`;
    list.appendChild(li);
  });
}

function badgeForKind(kind) {
  if (kind === "sale") return { text: "Акция", cls: "alt" };
  if (kind === "news") return { text: "Новости", cls: "neutral" };
  return { text: "Новинки", cls: "" };
}

function renderCarouselFromStorage() {
  const track = document.getElementById("carouselTrack");
  const dotsWrap = document.getElementById("carouselDots");
  const prev = document.getElementById("carouselPrev");
  const next = document.getElementById("carouselNext");
  if (!track || !dotsWrap) return;

  const slides = loadCarouselSlides();
  track.innerHTML = "";
  dotsWrap.innerHTML = "";

  function resolveButtonHref(rawHref) {
    const value = String(rawHref || "").trim();
    if (!value) return "";
    if (value.startsWith("category:")) {
      const category = value.slice("category:".length).trim();
      return `index.html?category=${encodeURIComponent(category)}#catalog`;
    }
    return value;
  }

  slides.forEach((s, i) => {
    const badge = badgeForKind(s.kind);
    const hasButton = s.buttonLabel && s.buttonHref;
    const aClass = s.kind === "new" ? "btn btn-primary" : "btn btn-secondary";
    const hasImage = Boolean(s.image);
    const fit = s.imageFit === "cover" || s.imageFit === "contain" || s.imageFit === "auto" ? s.imageFit : "auto";
    const backgroundSize = fit === "contain" || fit === "auto" ? "contain" : "cover";

    const slide = document.createElement("article");
    slide.className = "carousel-slide" + (hasImage ? " with-image" : "");
    slide.dataset.kind = s.kind || "new";
    slide.innerHTML = `
      <div class="carousel-badge ${badge.cls}">${badge.text}</div>
      <h3>${s.title}</h3>
      <p>${s.text}</p>
      ${hasButton ? `<a class="${aClass}" href="${resolveButtonHref(s.buttonHref)}">${s.buttonLabel}</a>` : ""}
      ${
        hasImage
          ? `<div class="carousel-slide-image ${backgroundSize === "contain" ? "fit-contain" : ""}" style="background-image:url('${s.image}'); background-size:${backgroundSize};"></div>`
          : ""
      }
    `;
    track.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = "dot" + (i === 0 ? " active" : "");
    dot.type = "button";
    dot.dataset.dot = String(i);
    dot.setAttribute("aria-label", `Слайд ${i + 1}`);
    dotsWrap.appendChild(dot);
  });

  const many = slides.length > 1;
  dotsWrap.classList.toggle("hidden", !many);
  prev?.classList.toggle("hidden", !many);
  next?.classList.toggle("hidden", !many);
}

document.addEventListener("DOMContentLoaded", async () => {
  await restoreSession?.();
  await syncPublicDataFromServer();
  initYear();
  initFilters();
  initSearch();
  initBikeFilters();
  initExtraCategoryFilters();
  renderCarouselFromStorage();
  initCarousel();
  renderProducts();
  renderPromotions();
  renderNews();
  setHeaderAuthUI();
  setCartCountUI();

  document.getElementById("authButton")?.addEventListener("click", () => {
    const user = typeof currentUser === "function" ? currentUser() : null;
    if (!user) openAuthModal();
  });

  document.getElementById("logoutButton")?.addEventListener("click", () => {
    logoutUser();
    document.dispatchEvent(new CustomEvent("auth:changed"));
  });

  document.getElementById("productsGrid")?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.addToCart;
    if (!id) return;
    if (typeof addToCart === "function") addToCart(id, 1);
  });

  document.getElementById("productsGrid")?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-add-to-cart]")) return;
    const card = target.closest(".product-card");
    if (!(card instanceof HTMLElement)) return;
    const id = card.dataset.productId;
    if (!id) return;
    window.location.href = `product.html?id=${encodeURIComponent(id)}`;
  });

  document.getElementById("productsGrid")?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest(".product-card");
    if (!(card instanceof HTMLElement)) return;
    const id = card.dataset.productId;
    if (!id) return;
    window.location.href = `product.html?id=${encodeURIComponent(id)}`;
  });

  document.addEventListener("auth:changed", () => {
    if (typeof mergeGuestCartIntoUser === "function") mergeGuestCartIntoUser();
    setHeaderAuthUI();
    setCartCountUI();
    initBikeFilters();
  });

  document.addEventListener("cart:changed", () => {
    setCartCountUI();
  });

  // Burger Menu
  const burgerMenu = document.getElementById("burgerMenu");
  const mainNav = document.getElementById("mainNav");
  
  if (burgerMenu && mainNav) {
    burgerMenu.addEventListener("click", () => {
      burgerMenu.classList.toggle("active");
      mainNav.classList.toggle("active");
      document.body.classList.toggle("no-scroll");
    });

    mainNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        burgerMenu.classList.remove("active");
        mainNav.classList.remove("active");
        document.body.classList.remove("no-scroll");
      });
    });
  }
});

