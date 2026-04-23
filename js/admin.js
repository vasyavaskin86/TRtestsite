const STORAGE_KEY = "sportshop_products";
const CAROUSEL_KEY = "sportshop_carousel_slides";
const PROMOTIONS_KEY = "sportshop_promotions";
const NEWS_KEY = "sportshop_news";
const ORDERS_KEY = "sportshop_orders";
const SERVICES_KEY = "sportshop_services";
const SETTINGS_KEY = "sportshop_settings";

let pendingImageDataUrls = [];
let pendingCarouselImageDataUrl = "";

function updateAdminHeaderUI() {
  const user = typeof currentUser === "function" ? currentUser() : null;
  const authButton = document.getElementById("authButton");
  const logoutButton = document.getElementById("logoutButton");
  const cartCountEl = document.getElementById("cartCount");
  if (authButton) {
    authButton.textContent = user ? `Привет, ${user.name}` : "Войти";
    authButton.classList.toggle("pill-muted", !user);
  }
  if (logoutButton) logoutButton.classList.toggle("hidden", !user);
  document.querySelectorAll(".admin-link, .footer-admin-link").forEach((el) => {
    el.classList.toggle("hidden", !user?.isAdmin);
  });
  if (cartCountEl && typeof cartCount === "function") {
    cartCountEl.textContent = String(cartCount());
  }
}

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

async function downscaleDataUrl(dataUrl, maxSize = 1400, quality = 0.82) {
  // Сжатие, чтобы localStorage не переполнялся
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve(out);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function renderImagesPreview(urls) {
  const wrap = document.getElementById("imagesPreview");
  if (!wrap) return;
  const list = urls.filter(Boolean).slice(0, 10);
  wrap.classList.toggle("hidden", list.length === 0);
  wrap.innerHTML = "";
  list.forEach((url) => {
    const div = document.createElement("div");
    div.className = "preview-thumb";
    div.style.backgroundImage = `url('${url}')`;
    wrap.appendChild(div);
  });
}

function renderSingleImagePreview(elementId, url) {
  const wrap = document.getElementById(elementId);
  if (!wrap) return;
  wrap.classList.toggle("hidden", !url);
  wrap.innerHTML = "";
  if (!url) return;
  const div = document.createElement("div");
  div.className = "preview-thumb";
  div.style.backgroundImage = `url('${url}')`;
  wrap.appendChild(div);
}

function adminLoadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function adminSaveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  saveAllAdminStateToServer();
}

function loadCarouselSlides() {
  try {
    const raw = localStorage.getItem(CAROUSEL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCarouselSlides(slides) {
  localStorage.setItem(CAROUSEL_KEY, JSON.stringify(slides));
  saveAllAdminStateToServer();
}

function loadPromotions() {
  try {
    const raw = localStorage.getItem(PROMOTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePromotions(items) {
  localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(items));
  saveAllAdminStateToServer();
}

function loadNews() {
  try {
    const raw = localStorage.getItem(NEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNews(items) {
  localStorage.setItem(NEWS_KEY, JSON.stringify(items));
  saveAllAdminStateToServer();
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOrders(items) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(items));
  saveAllAdminStateToServer();
}

function loadServices() {
  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveServices(items) {
  localStorage.setItem(SERVICES_KEY, JSON.stringify(items));
  saveAllAdminStateToServer();
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings || {}));
  saveAllAdminStateToServer();
}

async function saveAllAdminStateToServer() {
  try {
    await api.saveAdminState({
      products: adminLoadProducts(),
      carouselSlides: loadCarouselSlides(),
      promotions: loadPromotions(),
      news: loadNews(),
      orders: loadOrders(),
      services: loadServices(),
      settings: loadSettings(),
    });
  } catch (err) {
    alert(err instanceof Error ? err.message : "Не удалось сохранить изменения на сервер.");
  }
}

async function restoreAdminStateFromServer() {
  try {
    await restoreSession?.();
    const user = currentUser?.();
    if (!user || !user.isAdmin) {
      alert("Нужен вход администратора. Используйте admin@start.ru / admin123.");
      window.location.href = "index.html";
      return false;
    }
    const [state, orders, services] = await Promise.all([
      api.getAdminState(),
      api.getOrders(),
      api.getServices(),
    ]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(state.products) ? state.products : []));
    localStorage.setItem(CAROUSEL_KEY, JSON.stringify(Array.isArray(state.carouselSlides) ? state.carouselSlides : []));
    localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(Array.isArray(state.promotions) ? state.promotions : []));
    localStorage.setItem(NEWS_KEY, JSON.stringify(Array.isArray(state.news) ? state.news : []));
    localStorage.setItem(ORDERS_KEY, JSON.stringify(Array.isArray(orders) ? orders : Array.isArray(state.orders) ? state.orders : []));
    localStorage.setItem(SERVICES_KEY, JSON.stringify(Array.isArray(services) ? services : Array.isArray(state.services) ? state.services : []));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings || {}));
    return true;
  } catch (err) {
    alert(err instanceof Error ? err.message : "Не удалось загрузить данные админки.");
    window.location.href = "index.html";
    return false;
  }
}

function adminFormatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function adminCategoryLabel(category) {
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
      return "-";
  }
}

function fillForm(product) {
  document.getElementById("productId").value = product.id || "";
  document.getElementById("productName").value = product.name || "";
  document.getElementById("productCategory").value = product.category || "";
  document.getElementById("productPrice").value = product.price || "";
  document.getElementById("productImage").value = product.image || "";
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productFullDescription").value = product.fullDescription || "";
  const stocks = Array.isArray(product.stocksByWarehouse) ? product.stocksByWarehouse : [];
  document.getElementById("productWarehouseStocks").value = stocks.map((s) => `${s.warehouse}:${s.qty}`).join("\n");

  const images = Array.isArray(product.images) ? product.images : [];
  document.getElementById("productImages").value = images.slice(0, 10).join("\n");
  pendingImageDataUrls = [];
  const fileInput = document.getElementById("productImageFiles");
  if (fileInput) fileInput.value = "";
  renderImagesPreview(images);

  const attrs = product.attributes || {};
  document.getElementById("bikeManufacturer").value = attrs.manufacturer || "";
  document.getElementById("bikeWheelDiameter").value = attrs.wheelDiameter ?? "";
  document.getElementById("bikeFrameSize").value = attrs.frameSize || "";
  document.getElementById("bikeColor").value = attrs.color || "";
  document.getElementById("bikeBrakeType").value = attrs.brakeType || "";
  document.getElementById("bikeSuspension").value = attrs.suspension || "";

  toggleBikeFields(product.category);
  document.getElementById("saveButton").textContent = "Сохранить изменения";
}

function resetForm() {
  document.getElementById("productId").value = "";
  document.getElementById("productName").value = "";
  document.getElementById("productCategory").value = "";
  document.getElementById("productPrice").value = "";
  document.getElementById("productImage").value = "";
  document.getElementById("productDescription").value = "";
  document.getElementById("productFullDescription").value = "";
  document.getElementById("productWarehouseStocks").value = "";
  document.getElementById("productImages").value = "";
  pendingImageDataUrls = [];
  const fileInput = document.getElementById("productImageFiles");
  if (fileInput) fileInput.value = "";
  renderImagesPreview([]);

  document.getElementById("bikeManufacturer").value = "";
  document.getElementById("bikeWheelDiameter").value = "";
  document.getElementById("bikeFrameSize").value = "";
  document.getElementById("bikeColor").value = "";
  document.getElementById("bikeBrakeType").value = "";
  document.getElementById("bikeSuspension").value = "";

  toggleBikeFields("");
  document.getElementById("saveButton").textContent = "Сохранить товар";
}

function toggleBikeFields(category) {
  const bikeFields = document.getElementById("bikeFields");
  if (!bikeFields) return;
  bikeFields.classList.toggle("hidden", category !== "bicycles");
}

function renderAdminList() {
  const listEl = document.getElementById("adminProductsList");
  const countEl = document.getElementById("productsCount");
  if (!listEl) return;

  const products = adminLoadProducts();
  listEl.innerHTML = "";

  countEl.textContent = `${products.length} товар${products.length === 1 ? "" : products.length >= 2 && products.length <= 4 ? "а" : "ов"}`;

  if (!products.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Пока нет ни одного товара. Добавьте первый через форму слева.";
    listEl.appendChild(empty);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("div");
    row.className = "admin-product-row";

    const imageLabel =
      product.image && typeof product.image === "string" && product.image.trim().length > 0
        ? "с изображением"
        : "без изображения";

    row.innerHTML = `
      <div class="admin-product-main">
        <div class="admin-product-title">${product.name}</div>
        <div class="admin-product-meta">
          <span class="admin-product-category">${adminCategoryLabel(product.category)}</span>
          &nbsp;·&nbsp; ${imageLabel}
        </div>
      </div>
      <div class="admin-product-price">${adminFormatPrice(product.price)} ₽</div>
      <div></div>
      <div class="admin-product-actions">
        <button type="button" data-action="edit" data-id="${product.id}">Редактировать</button>
        <button type="button" data-action="delete" data-id="${product.id}" class="danger">Удалить</button>
      </div>
    `;

    listEl.appendChild(row);
  });
}

function renderCarouselAdmin() {
  const listEl = document.getElementById("carouselSlidesList");
  const countEl = document.getElementById("carouselCount");
  if (!listEl || !countEl) return;

  const slides = loadCarouselSlides();
  countEl.textContent = `${slides.length} слайд${slides.length === 1 ? "" : slides.length >= 2 && slides.length <= 4 ? "а" : "ов"}`;

  listEl.innerHTML = "";

  if (!slides.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Слайды не заданы. Добавьте первый слайд через форму выше.";
    listEl.appendChild(empty);
    return;
  }

  slides.forEach((s) => {
    const row = document.createElement("div");
    row.className = "admin-product-row";
    row.innerHTML = `
      <div class="admin-product-main">
        <div class="admin-product-title">${s.title}</div>
        <div class="admin-product-meta">
          <span class="admin-product-category">${s.kind === "new" ? "Новинки" : s.kind === "sale" ? "Акция" : "Новости"}</span>
          &nbsp;·&nbsp; ${s.text}
        </div>
      </div>
      <div class="admin-product-price">${s.buttonLabel ? s.buttonLabel : "—"}</div>
      <div></div>
      <div class="admin-product-actions">
        <button type="button" data-caction="edit" data-id="${s.id}">Редактировать</button>
        <button type="button" data-caction="delete" data-id="${s.id}" class="danger">Удалить</button>
      </div>
    `;
    listEl.appendChild(row);
  });
}

function fillCarouselForm(slide) {
  document.getElementById("carouselSlideId").value = slide.id || "";
  document.getElementById("carouselKind").value = slide.kind || "new";
  document.getElementById("carouselTitle").value = slide.title || "";
  document.getElementById("carouselText").value = slide.text || "";
  document.getElementById("carouselImageUrl").value = slide.image || "";
  document.getElementById("carouselImageFit").value = slide.imageFit || "auto";
  pendingCarouselImageDataUrl = "";
  const file = document.getElementById("carouselImageFile");
  if (file) file.value = "";
  renderSingleImagePreview("carouselImagePreview", slide.image || "");
  document.getElementById("carouselButtonLabel").value = slide.buttonLabel || "";
  const hrefSelect = document.getElementById("carouselButtonHref");
  const customWrap = document.getElementById("carouselCustomHrefWrap");
  const customInput = document.getElementById("carouselCustomHref");
  const rawHref = slide.buttonHref || "";
  const predefinedValues = Array.from(hrefSelect.options).map((o) => o.value);
  if (predefinedValues.includes(rawHref)) {
    hrefSelect.value = rawHref;
    customInput.value = "";
    customWrap?.classList.add("hidden");
  } else {
    hrefSelect.value = "custom";
    customInput.value = rawHref;
    customWrap?.classList.remove("hidden");
  }
  document.getElementById("carouselSaveButton").textContent = "Сохранить изменения";
}

function resetCarouselForm() {
  document.getElementById("carouselSlideId").value = "";
  document.getElementById("carouselKind").value = "new";
  document.getElementById("carouselTitle").value = "";
  document.getElementById("carouselText").value = "";
  document.getElementById("carouselImageUrl").value = "";
  document.getElementById("carouselImageFit").value = "auto";
  pendingCarouselImageDataUrl = "";
  const file = document.getElementById("carouselImageFile");
  if (file) file.value = "";
  renderSingleImagePreview("carouselImagePreview", "");
  document.getElementById("carouselButtonLabel").value = "";
  document.getElementById("carouselButtonHref").value = "#catalog";
  document.getElementById("carouselCustomHref").value = "";
  document.getElementById("carouselCustomHrefWrap")?.classList.add("hidden");
  document.getElementById("carouselSaveButton").textContent = "Сохранить слайд";
}

function initAdminForm() {
  const form = document.getElementById("productForm");
  const resetButton = document.getElementById("resetButton");
  const clearAllButton = document.getElementById("clearAllButton");
  const listEl = document.getElementById("adminProductsList");
  const categorySelect = document.getElementById("productCategory");
  const fileInput = document.getElementById("productImageFiles");
  const csvInput = document.getElementById("productsCsvFile");
  const csvImportButton = document.getElementById("importCsvButton");

  if (!form) return;

  fileInput?.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []).slice(0, 10);
    if (!files.length) {
      pendingImageDataUrls = [];
      renderImagesPreview(
        document
          .getElementById("productImages")
          .value.split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
      );
      return;
    }

    // Ограничим общий лимит 10, учитывая ссылки
    const urlImages = document
      .getElementById("productImages")
      .value.split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const remaining = Math.max(0, 10 - urlImages.length);
    const toRead = files.slice(0, remaining);

    try {
      const dataUrls = [];
      for (const f of toRead) {
        const raw = await readFileAsImage(f);
        const scaled = await downscaleDataUrl(raw);
        dataUrls.push(scaled);
      }
      pendingImageDataUrls = dataUrls;
      renderImagesPreview([...urlImages, ...pendingImageDataUrls]);
      if (files.length > remaining) {
        alert(`Можно добавить максимум 10 фото. Уже занято ссылками: ${urlImages.length}. Файлами добавлено: ${remaining}.`);
      }
    } catch {
      pendingImageDataUrls = [];
      alert("Не удалось обработать изображения.");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("productId").value || crypto.randomUUID();
    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("productCategory").value;
    const price = Number(document.getElementById("productPrice").value || 0);
    const image = document.getElementById("productImage").value.trim();
    const description = document.getElementById("productDescription").value.trim();
    const fullDescription = document.getElementById("productFullDescription").value.trim();
    const imagesRaw = document.getElementById("productImages").value;
    const stocksRaw = document.getElementById("productWarehouseStocks").value;
    const urlImages = imagesRaw
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 10);

    const mergedImages = [...urlImages, ...pendingImageDataUrls].slice(0, 10);
    const stocksByWarehouse = stocksRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [warehousePart, qtyPart] = line.split(":");
        return { warehouse: String(warehousePart || "").trim(), qty: Math.max(0, Number(qtyPart || 0)) };
      })
      .filter((x) => x.warehouse);

    const manufacturer = document.getElementById("bikeManufacturer").value.trim();
    const wheelDiameterRaw = document.getElementById("bikeWheelDiameter").value;
    const wheelDiameter = wheelDiameterRaw ? Number(wheelDiameterRaw) : null;
    const frameSize = document.getElementById("bikeFrameSize").value.trim();
    const color = document.getElementById("bikeColor").value.trim();
    const brakeType = document.getElementById("bikeBrakeType").value.trim();
    const suspension = document.getElementById("bikeSuspension").value.trim();

    if (!name || !category || price <= 0 || !description) {
      alert("Пожалуйста, заполните все обязательные поля и укажите корректную цену.");
      return;
    }

    const products = adminLoadProducts();
    const existingIndex = products.findIndex((p) => p.id === id);

    const product = {
      id,
      name,
      category,
      price,
      image,
      description,
      fullDescription: fullDescription || undefined,
      images: mergedImages.length ? mergedImages : undefined,
      stocksByWarehouse: stocksByWarehouse.length ? stocksByWarehouse : undefined,
      attributes:
        category === "bicycles"
          ? {
              manufacturer: manufacturer || undefined,
              wheelDiameter: Number.isFinite(wheelDiameter) ? wheelDiameter : undefined,
              frameSize: frameSize || undefined,
              color: color || undefined,
              brakeType: brakeType || undefined,
              suspension: suspension || undefined,
            }
          : undefined,
    };

    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.push(product);
    }

    adminSaveProducts(products);
    renderAdminList();
    resetForm();
  });

  categorySelect?.addEventListener("change", () => {
    toggleBikeFields(categorySelect.value);
  });

  resetButton.addEventListener("click", () => {
    resetForm();
  });

  clearAllButton.addEventListener("click", () => {
    if (!confirm("Удалить все товары? Это действие нельзя будет отменить.")) return;
    localStorage.removeItem(STORAGE_KEY);
    saveAllAdminStateToServer();
    renderAdminList();
  });

  listEl.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    const products = adminLoadProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return;

    if (action === "edit") {
      fillForm(products[index]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "delete") {
      if (!confirm(`Удалить товар "${products[index].name}"?`)) return;
      products.splice(index, 1);
      adminSaveProducts(products);
      renderAdminList();
    }
  });

  csvImportButton?.addEventListener("click", async () => {
    const file = (csvInput?.files || [])[0];
    if (!file) {
      alert("Выберите CSV-файл для импорта.");
      return;
    }
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        alert("CSV пустой или содержит только заголовок.");
        return;
      }
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const idxName = header.indexOf("name");
      const idxCategory = header.indexOf("category");
      const idxPrice = header.indexOf("price");
      const idxDescription = header.indexOf("description");
      const idxImage = header.indexOf("image");
      const idxManufacturer = header.indexOf("manufacturer");
      const idxBrand = header.indexOf("brand");
      const idxMaterial = header.indexOf("material");
      const idxPurpose = header.indexOf("purpose");
      const idxSubcategory = header.indexOf("subcategory");
      const idxStocks = header.indexOf("stocks");
      if (idxName < 0 || idxCategory < 0 || idxPrice < 0) {
        alert("CSV должен содержать колонки name, category, price.");
        return;
      }
      const products = adminLoadProducts();
      let added = 0;
      for (const line of lines.slice(1)) {
        const cols = line.split(",").map((x) => x.trim());
        const name = cols[idxName] || "";
        const category = cols[idxCategory] || "";
        const price = Number(cols[idxPrice] || 0);
        if (!name || !category || !Number.isFinite(price) || price < 0) continue;
        products.push({
          id: crypto.randomUUID(),
          name,
          category,
          price,
          description: idxDescription >= 0 ? cols[idxDescription] || "" : "",
          image: idxImage >= 0 ? cols[idxImage] || "" : "",
          attributes:
            idxManufacturer >= 0 || idxBrand >= 0 || idxMaterial >= 0 || idxPurpose >= 0 || idxSubcategory >= 0
              ? {
                  manufacturer: idxManufacturer >= 0 ? cols[idxManufacturer] || undefined : undefined,
                  brand: idxBrand >= 0 ? cols[idxBrand] || undefined : undefined,
                  material: idxMaterial >= 0 ? cols[idxMaterial] || undefined : undefined,
                  purpose: idxPurpose >= 0 ? cols[idxPurpose] || undefined : undefined,
                  subcategory: idxSubcategory >= 0 ? cols[idxSubcategory] || undefined : undefined,
                }
              : undefined,
          stocksByWarehouse:
            idxStocks >= 0 && cols[idxStocks]
              ? cols[idxStocks]
                  .split("|")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => {
                    const [warehouse, qty] = s.split(":");
                    return { warehouse: String(warehouse || "").trim(), qty: Math.max(0, Number(qty || 0)) };
                  })
                  .filter((x) => x.warehouse)
              : undefined,
        });
        added += 1;
      }
      adminSaveProducts(products);
      renderAdminList();
      alert(`Импорт завершён. Добавлено товаров: ${added}.`);
    } catch {
      alert("Не удалось прочитать CSV-файл.");
    }
  });
}

function initCarouselAdmin() {
  const form = document.getElementById("carouselForm");
  const list = document.getElementById("carouselSlidesList");
  const resetBtn = document.getElementById("carouselResetButton");
  const clearBtn = document.getElementById("clearCarouselButton");
  const imageUrlInput = document.getElementById("carouselImageUrl");
  const imageFileInput = document.getElementById("carouselImageFile");
  const hrefSelect = document.getElementById("carouselButtonHref");
  const customHrefWrap = document.getElementById("carouselCustomHrefWrap");
  const customHrefInput = document.getElementById("carouselCustomHref");
  if (!form || !list) return;

  hrefSelect?.addEventListener("change", () => {
    customHrefWrap?.classList.toggle("hidden", hrefSelect.value !== "custom");
    if (hrefSelect.value !== "custom") customHrefInput.value = "";
  });

  imageUrlInput?.addEventListener("input", () => {
    const url = imageUrlInput.value.trim();
    renderSingleImagePreview("carouselImagePreview", pendingCarouselImageDataUrl || url);
  });

  imageFileInput?.addEventListener("change", async () => {
    const file = (imageFileInput.files || [])[0];
    if (!file) {
      pendingCarouselImageDataUrl = "";
      const url = imageUrlInput?.value.trim() || "";
      renderSingleImagePreview("carouselImagePreview", url);
      return;
    }
    try {
      const raw = await readFileAsImage(file);
      const scaled = await downscaleDataUrl(raw);
      pendingCarouselImageDataUrl = scaled;
      renderSingleImagePreview("carouselImagePreview", pendingCarouselImageDataUrl);
    } catch {
      pendingCarouselImageDataUrl = "";
      alert("Не удалось обработать картинку слайда.");
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("carouselSlideId").value || crypto.randomUUID();
    const kind = document.getElementById("carouselKind").value;
    const title = document.getElementById("carouselTitle").value.trim();
    const text = document.getElementById("carouselText").value.trim();
    const imageUrl = document.getElementById("carouselImageUrl").value.trim();
    const imageFit = document.getElementById("carouselImageFit").value;
    const buttonLabel = document.getElementById("carouselButtonLabel").value.trim();
    const buttonHrefRaw = document.getElementById("carouselButtonHref").value.trim();
    const buttonHref = buttonHrefRaw === "custom" ? document.getElementById("carouselCustomHref").value.trim() : buttonHrefRaw;

    if (!title || !text) {
      alert("Заполните заголовок и текст слайда.");
      return;
    }

    const slides = loadCarouselSlides();
    const idx = slides.findIndex((s) => s.id === id);
    const slide = {
      id,
      kind: kind === "sale" || kind === "news" || kind === "new" ? kind : "new",
      title,
      text,
      image: (pendingCarouselImageDataUrl || imageUrl) || undefined,
      imageFit: imageFit === "cover" || imageFit === "contain" || imageFit === "auto" ? imageFit : "auto",
      buttonLabel: buttonLabel || undefined,
      buttonHref: buttonHref || undefined,
      updatedAt: Date.now(),
    };

    if (idx >= 0) slides[idx] = slide;
    else slides.push(slide);

    if (slides.length > 10) {
      alert("Максимум 10 слайдов в карусели.");
      return;
    }

    saveCarouselSlides(slides);
    renderCarouselAdmin();
    resetCarouselForm();
  });

  resetBtn?.addEventListener("click", () => resetCarouselForm());

  clearBtn?.addEventListener("click", () => {
    if (!confirm("Очистить карусель на главной?")) return;
    localStorage.removeItem(CAROUSEL_KEY);
    saveAllAdminStateToServer();
    renderCarouselAdmin();
    resetCarouselForm();
  });

  list.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.caction;
    const id = target.dataset.id;
    if (!action || !id) return;

    const slides = loadCarouselSlides();
    const idx = slides.findIndex((s) => s.id === id);
    if (idx === -1) return;

    if (action === "edit") {
      fillCarouselForm(slides[idx]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "delete") {
      if (!confirm(`Удалить слайд "${slides[idx].title}"?`)) return;
      slides.splice(idx, 1);
      saveCarouselSlides(slides);
      renderCarouselAdmin();
      resetCarouselForm();
    }
  });
}

function fillPromotionForm(item) {
  document.getElementById("promotionId").value = item.id || "";
  document.getElementById("promotionTitle").value = item.title || "";
  document.getElementById("promotionDiscount").value = item.discount || "";
  document.getElementById("promotionDescription").value = item.description || "";
  document.getElementById("promotionImage").value = item.image || "";
  document.getElementById("promotionLink").value = item.link || "";
  document.getElementById("promotionSaveButton").textContent = "Сохранить изменения";
}

function resetPromotionForm() {
  document.getElementById("promotionId").value = "";
  document.getElementById("promotionTitle").value = "";
  document.getElementById("promotionDiscount").value = "";
  document.getElementById("promotionDescription").value = "";
  document.getElementById("promotionImage").value = "";
  document.getElementById("promotionLink").value = "";
  document.getElementById("promotionSaveButton").textContent = "Сохранить акцию";
}

function renderPromotionsAdmin() {
  const list = document.getElementById("promotionsList");
  const count = document.getElementById("promoCount");
  if (!list || !count) return;
  const items = loadPromotions();
  count.textContent = `${items.length} акци${items.length === 1 ? "я" : items.length >= 2 && items.length <= 4 ? "и" : "й"}`;
  list.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Пока нет акций.";
    list.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "admin-product-row";
    row.innerHTML = `
      <div class="admin-product-main">
        <div class="admin-product-title">${item.title}</div>
        <div class="admin-product-meta">Скидка: ${item.discount ? `${item.discount}%` : "без скидки"}</div>
      </div>
      <div class="admin-product-price">${item.discount ? `-${item.discount}%` : "—"}</div>
      <div></div>
      <div class="admin-product-actions">
        <button type="button" data-paction="edit" data-id="${item.id}">Редактировать</button>
        <button type="button" data-paction="delete" data-id="${item.id}" class="danger">Удалить</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function initPromotionsAdmin() {
  const form = document.getElementById("promotionForm");
  const list = document.getElementById("promotionsList");
  const resetBtn = document.getElementById("promotionResetButton");
  const clearBtn = document.getElementById("clearPromotionsButton");
  if (!form || !list) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("promotionId").value || crypto.randomUUID();
    const title = document.getElementById("promotionTitle").value.trim();
    const discountRaw = document.getElementById("promotionDiscount").value;
    const discount = discountRaw ? Number(discountRaw) : null;
    const description = document.getElementById("promotionDescription").value.trim();
    const image = document.getElementById("promotionImage").value.trim();
    const link = document.getElementById("promotionLink").value.trim();
    if (!title || !description || (discount !== null && (discount < 1 || discount > 99))) {
      alert("Проверьте поля акции: заголовок и описание обязательны, скидка при заполнении должна быть 1-99%.");
      return;
    }
    const items = loadPromotions();
    const idx = items.findIndex((x) => x.id === id);
    const payload = { id, title, discount: discount || undefined, description, image: image || undefined, link: link || "#catalog" };
    if (idx >= 0) items[idx] = payload;
    else items.push(payload);
    savePromotions(items);
    renderPromotionsAdmin();
    resetPromotionForm();
  });

  resetBtn?.addEventListener("click", resetPromotionForm);
  clearBtn?.addEventListener("click", () => {
    if (!confirm("Удалить все акции?")) return;
    localStorage.removeItem(PROMOTIONS_KEY);
    saveAllAdminStateToServer();
    renderPromotionsAdmin();
    resetPromotionForm();
  });

  list.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.paction;
    const id = target.dataset.id;
    if (!action || !id) return;
    const items = loadPromotions();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    if (action === "edit") fillPromotionForm(items[idx]);
    if (action === "delete") {
      if (!confirm(`Удалить акцию "${items[idx].title}"?`)) return;
      items.splice(idx, 1);
      savePromotions(items);
      renderPromotionsAdmin();
      resetPromotionForm();
    }
  });
}

function fillNewsForm(item) {
  document.getElementById("newsId").value = item.id || "";
  document.getElementById("newsTitle").value = item.title || "";
  document.getElementById("newsDate").value = item.date || "";
  document.getElementById("newsText").value = item.text || "";
  document.getElementById("newsSaveButton").textContent = "Сохранить изменения";
}

function resetNewsForm() {
  document.getElementById("newsId").value = "";
  document.getElementById("newsTitle").value = "";
  document.getElementById("newsDate").value = "";
  document.getElementById("newsText").value = "";
  document.getElementById("newsSaveButton").textContent = "Сохранить новость";
}

function renderNewsAdmin() {
  const list = document.getElementById("newsAdminList");
  const count = document.getElementById("newsCount");
  if (!list || !count) return;
  const items = loadNews()
    .slice()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  count.textContent = `${items.length} новост${items.length === 1 ? "ь" : items.length >= 2 && items.length <= 4 ? "и" : "ей"}`;
  list.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Пока нет новостей.";
    list.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "admin-product-row";
    row.innerHTML = `
      <div class="admin-product-main">
        <div class="admin-product-title">${item.title}</div>
        <div class="admin-product-meta">${item.date || ""}</div>
      </div>
      <div class="admin-product-price">${item.date || ""}</div>
      <div></div>
      <div class="admin-product-actions">
        <button type="button" data-naction="edit" data-id="${item.id}">Редактировать</button>
        <button type="button" data-naction="delete" data-id="${item.id}" class="danger">Удалить</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function initNewsAdmin() {
  const form = document.getElementById("newsForm");
  const list = document.getElementById("newsAdminList");
  const resetBtn = document.getElementById("newsResetButton");
  const clearBtn = document.getElementById("clearNewsButton");
  if (!form || !list) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("newsId").value || crypto.randomUUID();
    const title = document.getElementById("newsTitle").value.trim();
    const date = document.getElementById("newsDate").value;
    const text = document.getElementById("newsText").value.trim();
    if (!title || !date || !text) {
      alert("Заполните все поля новости.");
      return;
    }
    const items = loadNews();
    const idx = items.findIndex((x) => x.id === id);
    const payload = { id, title, date, text };
    if (idx >= 0) items[idx] = payload;
    else items.push(payload);
    saveNews(items);
    renderNewsAdmin();
    resetNewsForm();
  });

  resetBtn?.addEventListener("click", resetNewsForm);
  clearBtn?.addEventListener("click", () => {
    if (!confirm("Удалить все новости?")) return;
    localStorage.removeItem(NEWS_KEY);
    saveAllAdminStateToServer();
    renderNewsAdmin();
    resetNewsForm();
  });

  list.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.naction;
    const id = target.dataset.id;
    if (!action || !id) return;
    const items = loadNews();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    if (action === "edit") fillNewsForm(items[idx]);
    if (action === "delete") {
      if (!confirm(`Удалить новость "${items[idx].title}"?`)) return;
      items.splice(idx, 1);
      saveNews(items);
      renderNewsAdmin();
      resetNewsForm();
    }
  });
}

function orderStatusLabel(status) {
  if (status === "processing") return "В обработке";
  if (status === "done") return "Выполнен";
  if (status === "cancelled") return "Отменён";
  return "Новый";
}

function formatDateTime(timestamp) {
  const d = new Date(Number(timestamp) || Date.now());
  return d.toLocaleString("ru-RU");
}

function renderOrdersAdmin() {
  const list = document.getElementById("ordersAdminList");
  const count = document.getElementById("ordersCount");
  if (!list || !count) return;
  const orders = loadOrders()
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  count.textContent = `${orders.length} заказ${orders.length === 1 ? "" : orders.length >= 2 && orders.length <= 4 ? "а" : "ов"}`;
  list.innerHTML = "";
  if (!orders.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Пока заказов нет.";
    list.appendChild(empty);
    return;
  }

  orders.forEach((order) => {
    const itemsHtml = Array.isArray(order.items)
      ? order.items
          .map((it) => {
            const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
            return `${it.name || "Товар"} — ${it.qty} шт. × ${adminFormatPrice(Number(it.price) || 0)} ₽ = ${adminFormatPrice(lineTotal)} ₽`;
          })
          .join("<br>")
      : "Нет товаров";
    const row = document.createElement("div");
    row.className = "admin-product-row";
    row.dataset.orderId = order.id;
    row.innerHTML = `
      <div class="admin-product-main">
        <div class="admin-product-title">Заказ #${String(order.id || "").slice(0, 8)}</div>
        <div class="admin-product-meta"><strong>${order.customerName || order.userName || "Покупатель"}</strong> · ${order.customerEmail || order.userEmail || ""} · ${order.customerPhone || order.phone || "без телефона"}</div>
        <div class="admin-product-meta">${formatDateTime(order.createdAt)} · ${order.items?.length || 0} поз.</div>
        <div class="admin-product-meta">Оплата: ${order.paymentMethod === "online" ? "Онлайн" : "При получении"}</div>
        ${order.deliveryAddress ? `<div class="admin-product-meta">Доставка: ${order.deliveryAddress}</div>` : ""}
        ${order.deliveryComment ? `<div class="admin-product-meta">Комментарий: ${order.deliveryComment}</div>` : ""}
        <div class="admin-product-meta">${itemsHtml}</div>
      </div>
      <div class="admin-product-price">${adminFormatPrice(Number(order.total) || 0)} ₽</div>
      <div>
        <select data-order-status="${order.id}">
          <option value="new" ${order.status === "new" ? "selected" : ""}>Новый</option>
          <option value="processing" ${order.status === "processing" ? "selected" : ""}>В обработке</option>
          <option value="done" ${order.status === "done" ? "selected" : ""}>Выполнен</option>
          <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Отменён</option>
        </select>
      </div>
      <div class="admin-product-actions">
        <span class="pill pill-muted">${orderStatusLabel(order.status)}</span>
      </div>
    `;
    list.appendChild(row);
  });
}

function openOrderModal(order) {
  const modal = document.getElementById("orderModal");
  const title = document.getElementById("orderModalTitle");
  const body = document.getElementById("orderModalBody");
  if (!modal || !title || !body) return;
  title.textContent = `Заказ #${String(order.id || "").slice(0, 8)}`;
  const itemsHtml = (order.items || [])
    .map((it) => {
      const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
      return `
        <tr>
          <td>${it.name || "Товар"}</td>
          <td>${it.qty || 0}</td>
          <td>${adminFormatPrice(Number(it.price) || 0)} ₽</td>
          <td>${adminFormatPrice(lineTotal)} ₽</td>
        </tr>
      `;
    })
    .join("");
  body.innerHTML = `
    <div class="admin-product-meta"><strong>Клиент:</strong> ${order.customerName || order.userName || "-"}</div>
    <div class="admin-product-meta"><strong>E-mail:</strong> ${order.customerEmail || order.userEmail || "-"}</div>
    <div class="admin-product-meta"><strong>Телефон:</strong> ${order.customerPhone || order.phone || "-"}</div>
    <div class="admin-product-meta"><strong>Статус:</strong> ${orderStatusLabel(order.status)}</div>
    <div class="admin-product-meta"><strong>Оплата:</strong> ${order.paymentMethod === "online" ? "Онлайн" : "При получении"}</div>
    ${order.deliveryAddress ? `<div class="admin-product-meta"><strong>Адрес:</strong> ${order.deliveryAddress}</div>` : ""}
    ${order.deliveryComment ? `<div class="admin-product-meta"><strong>Комментарий:</strong> ${order.deliveryComment}</div>` : ""}
    <div class="admin-product-meta"><strong>Дата:</strong> ${formatDateTime(order.createdAt)}</div>
    <table style="width:100%; margin-top:10px; border-collapse:collapse;">
      <thead><tr><th align="left">Товар</th><th align="left">Кол-во</th><th align="left">Цена</th><th align="left">Сумма</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top:10px;"><strong>Итого:</strong> ${adminFormatPrice(Number(order.total) || 0)} ₽</div>
  `;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeOrderModal() {
  const modal = document.getElementById("orderModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function initOrdersAdmin() {
  const list = document.getElementById("ordersAdminList");
  if (!list) return;
  list.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("select")) return;
    const row = target.closest(".admin-product-row");
    if (!(row instanceof HTMLElement)) return;
    const id = row.dataset.orderId;
    if (!id) return;
    const order = loadOrders().find((o) => o.id === id);
    if (!order) return;
    openOrderModal(order);
  });
  list.addEventListener("change", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const id = target.dataset.orderStatus;
    if (!id) return;
    const status = target.value;
    try {
      await api.updateOrderStatus(id, status);
      const orders = await api.getOrders();
      localStorage.setItem(ORDERS_KEY, JSON.stringify(Array.isArray(orders) ? orders : []));
      renderOrdersAdmin();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось обновить статус заказа.");
    }
  });
  document.getElementById("orderModal")?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.orderClose === "true") closeOrderModal();
  });
}

function fillServiceForm(item) {
  document.getElementById("serviceId").value = item.id || "";
  document.getElementById("serviceName").value = item.name || "";
  document.getElementById("serviceDescription").value = item.description || "";
  document.getElementById("servicePrice").value = item.price || "";
  document.getElementById("serviceImage").value = item.image || "";
  document.getElementById("serviceSaveButton").textContent = "Сохранить изменения";
}

function resetServiceForm() {
  document.getElementById("serviceId").value = "";
  document.getElementById("serviceName").value = "";
  document.getElementById("serviceDescription").value = "";
  document.getElementById("servicePrice").value = "";
  document.getElementById("serviceImage").value = "";
  document.getElementById("serviceSaveButton").textContent = "Сохранить услугу";
}

function renderServicesAdmin() {
  const list = document.getElementById("servicesList");
  const count = document.getElementById("servicesCount");
  if (!list || !count) return;
  const items = loadServices();
  count.textContent = `${items.length} услуг${items.length === 1 ? "а" : items.length >= 2 && items.length <= 4 ? "и" : ""}`;
  list.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Пока нет услуг.";
    list.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "admin-product-row";
    row.innerHTML = `
      <div class="admin-product-main">
        <div class="admin-product-title">${item.name}</div>
        <div class="admin-product-meta">${item.description || "Без описания"}</div>
      </div>
      <div class="admin-product-price">${adminFormatPrice(Number(item.price) || 0)} ₽</div>
      <div></div>
      <div class="admin-product-actions">
        <button type="button" data-saction="edit" data-id="${item.id}">Редактировать</button>
        <button type="button" data-saction="delete" data-id="${item.id}" class="danger">Удалить</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function initServicesAdmin() {
  const form = document.getElementById("serviceForm");
  const list = document.getElementById("servicesList");
  const resetBtn = document.getElementById("serviceResetButton");
  const clearBtn = document.getElementById("clearServicesButton");
  if (!form || !list) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("serviceId").value || crypto.randomUUID();
    const name = document.getElementById("serviceName").value.trim();
    const description = document.getElementById("serviceDescription").value.trim();
    const price = Number(document.getElementById("servicePrice").value || 0);
    const image = document.getElementById("serviceImage").value.trim();
    if (!name || price < 0) {
      alert("Укажите корректные название и цену услуги.");
      return;
    }
    const items = loadServices();
    const idx = items.findIndex((x) => x.id === id);
    const payload = { id, name, description: description || undefined, price, image: image || undefined };
    try {
      if (idx >= 0) await api.updateService(id, payload);
      else await api.createService(payload);
      const fresh = await api.getServices();
      localStorage.setItem(SERVICES_KEY, JSON.stringify(Array.isArray(fresh) ? fresh : []));
      renderServicesAdmin();
      resetServiceForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось сохранить услугу.");
    }
  });

  resetBtn?.addEventListener("click", resetServiceForm);
  clearBtn?.addEventListener("click", async () => {
    if (!confirm("Удалить все услуги?")) return;
    try {
      const all = loadServices();
      for (const item of all) {
        await api.deleteService(item.id);
      }
      localStorage.setItem(SERVICES_KEY, JSON.stringify([]));
      renderServicesAdmin();
      resetServiceForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось очистить услуги.");
    }
  });

  list.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.saction;
    const id = target.dataset.id;
    if (!action || !id) return;
    const items = loadServices();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    if (action === "edit") fillServiceForm(items[idx]);
    if (action === "delete") {
      if (!confirm(`Удалить услугу "${items[idx].name}"?`)) return;
      (async () => {
        try {
          await api.deleteService(items[idx].id);
          const fresh = await api.getServices();
          localStorage.setItem(SERVICES_KEY, JSON.stringify(Array.isArray(fresh) ? fresh : []));
          renderServicesAdmin();
          resetServiceForm();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Не удалось удалить услугу.");
        }
      })();
    }
  });
}

function initSettingsAdmin() {
  const form = document.getElementById("settingsForm");
  if (!form) return;
  const data = loadSettings();
  document.getElementById("settingEnableOnlinePayment").checked = Boolean(data.enableOnlinePayment);
  document.getElementById("settingEnableDeliveryForm").checked = Boolean(data.enableDeliveryForm);
  document.getElementById("settingEnableWarehouseStocks").checked = data.enableWarehouseStocks !== false;
  document.getElementById("settingEnable1CIntegration").checked = Boolean(data.enable1CIntegration);
  document.getElementById("settingEnableNotifications").checked = Boolean(data.enableNotifications);
  document.getElementById("settingNotificationProvider").value = data.notificationProvider === "max" ? "max" : "vk";
  document.getElementById("settingNotificationWebhookUrl").value = data.notificationWebhookUrl || "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const settings = {
      enableOnlinePayment: document.getElementById("settingEnableOnlinePayment").checked,
      enableDeliveryForm: document.getElementById("settingEnableDeliveryForm").checked,
      enableWarehouseStocks: document.getElementById("settingEnableWarehouseStocks").checked,
      enable1CIntegration: document.getElementById("settingEnable1CIntegration").checked,
      enableNotifications: document.getElementById("settingEnableNotifications").checked,
      notificationProvider: document.getElementById("settingNotificationProvider").value === "max" ? "max" : "vk",
      notificationWebhookUrl: document.getElementById("settingNotificationWebhookUrl").value.trim(),
    };
    saveSettings(settings);
    alert("Настройки сохранены.");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  updateAdminHeaderUI();
  document.getElementById("authButton")?.addEventListener("click", () => {
    const user = typeof currentUser === "function" ? currentUser() : null;
    if (!user) openAuthModal?.();
  });
  document.getElementById("logoutButton")?.addEventListener("click", () => {
    logoutUser?.();
    document.dispatchEvent(new CustomEvent("auth:changed"));
    window.location.href = "index.html";
  });
  document.addEventListener("auth:changed", () => {
    updateAdminHeaderUI();
  });
  document.addEventListener("cart:changed", () => {
    updateAdminHeaderUI();
  });

  const ok = await restoreAdminStateFromServer();
  if (!ok) return;
  updateAdminHeaderUI();
  initAdminForm();
  renderAdminList();
  initCarouselAdmin();
  renderCarouselAdmin();
  initPromotionsAdmin();
  renderPromotionsAdmin();
  initNewsAdmin();
  renderNewsAdmin();
  initOrdersAdmin();
  renderOrdersAdmin();
  initServicesAdmin();
  renderServicesAdmin();
  initSettingsAdmin();

  // Check for editProduct query param
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("editProduct");
  if (editId) {
    const products = adminLoadProducts();
    const product = products.find((p) => p.id === editId);
    if (product) {
      fillForm(product);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
});

