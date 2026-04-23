const CART_PREFIX = "sportshop_cart_";

function getCartKey() {
  const user = typeof currentUser === "function" ? currentUser() : null;
  return `${CART_PREFIX}${user ? user.id : "guest"}`;
}

function loadCart() {
  try {
    const raw = localStorage.getItem(getCartKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(getCartKey(), JSON.stringify(items));
  document.dispatchEvent(new CustomEvent("cart:changed"));
}

function addToCart(productId, qty = 1) {
  const items = loadCart();
  const existing = items.find((i) => i.productId === productId);
  if (existing) existing.qty += qty;
  else items.push({ productId, qty });
  saveCart(items);
  
  // Show notification
  const products = typeof loadProducts === "function" ? loadProducts() : [];
  const product = products.find(p => p.id === productId);
  showToast("Добавлено в корзину", product ? product.name : "Товар добавлен");
}

function showToast(title, message, duration = 3000) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div class="toast-icon">✓</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("removing");
    toast.addEventListener("animationend", () => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    });
  }, duration);
}

function removeFromCart(productId) {
  const items = loadCart().filter((i) => i.productId !== productId);
  saveCart(items);
}

function setQty(productId, qty) {
  const items = loadCart();
  const item = items.find((i) => i.productId === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(items);
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return loadCart().reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
}

function mergeGuestCartIntoUser() {
  const user = currentUser();
  if (!user) return;
  const guestKey = `${CART_PREFIX}guest`;
  const userKey = `${CART_PREFIX}${user.id}`;

  let guestItems = [];
  try {
    const raw = localStorage.getItem(guestKey);
    guestItems = raw ? JSON.parse(raw) : [];
  } catch {
    guestItems = [];
  }

  if (!Array.isArray(guestItems) || guestItems.length === 0) return;

  let userItems = [];
  try {
    const raw = localStorage.getItem(userKey);
    userItems = raw ? JSON.parse(raw) : [];
  } catch {
    userItems = [];
  }
  if (!Array.isArray(userItems)) userItems = [];

  guestItems.forEach((g) => {
    const u = userItems.find((x) => x.productId === g.productId);
    if (u) u.qty += Number(g.qty) || 0;
    else userItems.push({ productId: g.productId, qty: Number(g.qty) || 1 });
  });

  localStorage.setItem(userKey, JSON.stringify(userItems));
  localStorage.removeItem(guestKey);
  document.dispatchEvent(new CustomEvent("cart:changed"));
}

