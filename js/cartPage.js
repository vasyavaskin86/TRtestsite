function cartPageLoadProducts() {
  try {
    const raw = localStorage.getItem("sportshop_products");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cartPageFormatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function loadPublicSettingsLocal() {
  try {
    const raw = localStorage.getItem("sportshop_settings");
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function updateAuthUI() {
  const user = currentUser();
  const userPill = document.getElementById("userPill");
  const authButton = document.getElementById("authButton");
  const logoutButton = document.getElementById("logoutButton");

  if (userPill) userPill.textContent = user ? `Привет, ${user.name}` : "Гость";
  if (authButton) authButton.classList.toggle("hidden", Boolean(user));
  if (logoutButton) logoutButton.classList.toggle("hidden", !user);
}

function renderCart() {
  const empty = document.getElementById("cartEmpty");
  const layout = document.getElementById("cartLayout");
  const itemsEl = document.getElementById("cartItems");
  const summaryCount = document.getElementById("summaryCount");
  const summaryTotal = document.getElementById("summaryTotal");

  const cartItems = loadCart();
  const products = cartPageLoadProducts();

  if (!cartItems.length) {
    empty.classList.remove("hidden");
    layout.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  layout.classList.remove("hidden");

  const mapped = cartItems
    .map((ci) => {
      const product = products.find((p) => p.id === ci.productId);
      if (!product) return null;
      return { ...ci, product };
    })
    .filter(Boolean);

  itemsEl.innerHTML = "";

  mapped.forEach(({ productId, qty, product }) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    const imageUrl = (() => {
      const imgs = Array.isArray(product.images) ? product.images : [];
      const first = imgs.find((x) => typeof x === "string" && x.trim().length > 0);
      if (first) return first;
      if (product.image && typeof product.image === "string" && product.image.trim()) return product.image;
      return "https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg?auto=compress&cs=tinysrgb&w=1200";
    })();

    row.innerHTML = `
      <div class="cart-item-thumb" style="background-image:url('${imageUrl}')"></div>
      <div class="cart-item-main">
        <h3 class="cart-item-title">${product.name}</h3>
        <div class="cart-item-meta">${cartPageFormatPrice(product.price)} ₽ · ${product.category}</div>
        <div class="cart-item-controls">
          <label class="pill pill-muted">
            Кол-во
            <input class="qty-input" type="number" min="1" value="${qty}" data-qty="${productId}" />
          </label>
          <button class="pill pill-muted" type="button" data-remove="${productId}">Удалить</button>
        </div>
      </div>
      <div class="cart-item-main" style="justify-items:end; text-align:right;">
        <div class="pill">${cartPageFormatPrice(product.price * qty)} ₽</div>
      </div>
    `;

    itemsEl.appendChild(row);
  });

  const totalCount = mapped.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);
  const total = mapped.reduce((sum, x) => sum + (Number(x.qty) || 0) * (Number(x.product.price) || 0), 0);

  summaryCount.textContent = totalCount.toString();
  summaryTotal.textContent = `${cartPageFormatPrice(total)} ₽`;
}

document.addEventListener("DOMContentLoaded", async () => {
  await restoreSession?.();
  await syncPublicDataFromServer?.();
  initYear();

  const authButton = document.getElementById("authButton");
  const logoutButton = document.getElementById("logoutButton");
  const clearButton = document.getElementById("clearCartButton");
  const checkoutButton = document.getElementById("checkoutButton");
  const paymentWrap = document.getElementById("paymentMethodWrap");
  const deliveryFields = document.getElementById("deliveryFields");
  const settings = loadPublicSettingsLocal();
  paymentWrap?.classList.toggle("hidden", !settings.enableOnlinePayment);
  deliveryFields?.classList.toggle("hidden", !settings.enableDeliveryForm);

  authButton?.addEventListener("click", () => openAuthModal());
  logoutButton?.addEventListener("click", () => {
    logoutUser();
    document.dispatchEvent(new CustomEvent("auth:changed"));
  });

  clearButton?.addEventListener("click", () => {
    if (!confirm("Очистить корзину?")) return;
    clearCart();
  });

  checkoutButton?.addEventListener("click", async () => {
    const user = currentUser();
    if (!user) {
      openAuthModal();
      return;
    }
    const items = loadCart();
    const customerName = String(document.getElementById("orderCustomerName")?.value || "").trim();
    const customerPhone = String(document.getElementById("orderCustomerPhone")?.value || "").trim();
    const customerEmail = String(document.getElementById("orderCustomerEmail")?.value || "").trim();
    const deliveryAddress = String(document.getElementById("orderDeliveryAddress")?.value || "").trim();
    const deliveryComment = String(document.getElementById("orderDeliveryComment")?.value || "").trim();
    const paymentMethod = String(document.getElementById("orderPaymentMethod")?.value || "cash");
    if (!items.length) {
      alert("Корзина пуста.");
      return;
    }
    if (!customerName || !customerPhone || !customerEmail) {
      alert("Пожалуйста, заполните имя, телефон и e-mail.");
      return;
    }
    checkoutButton.disabled = true;
    const prevText = checkoutButton.textContent;
    checkoutButton.textContent = "Оформляем...";
    try {
      const order = await api.createOrder({
        items,
        customerName,
        customerPhone,
        phone: customerPhone,
        customerEmail,
        paymentMethod,
        deliveryAddress,
        deliveryComment,
      });
      clearCart();
      alert(`Заказ #${String(order.id || "").slice(0, 8)} успешно оформлен.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось оформить заказ.");
    } finally {
      checkoutButton.disabled = false;
      checkoutButton.textContent = prevText;
    }
  });

  document.getElementById("cartItems")?.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const productId = target.dataset.qty;
    if (!productId) return;
    setQty(productId, Number(target.value || 1));
  });

  document.getElementById("cartItems")?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const productId = target.dataset.remove;
    if (!productId) return;
    removeFromCart(productId);
  });

  document.addEventListener("auth:changed", () => {
    mergeGuestCartIntoUser();
    updateAuthUI();
    renderCart();
  });

  document.addEventListener("cart:changed", () => {
    renderCart();
  });

  updateAuthUI();
  renderCart();
});

