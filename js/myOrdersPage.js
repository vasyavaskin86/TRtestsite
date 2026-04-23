function statusLabel(status) {
  if (status === "processing") return "В обработке";
  if (status === "done") return "Выполнен";
  if (status === "cancelled") return "Отменён";
  return "Новый";
}

function formatPriceLocal(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
}

function formatDateTimeLocal(value) {
  return new Date(Number(value) || Date.now()).toLocaleString("ru-RU");
}

async function renderMyOrders() {
  const list = document.getElementById("myOrdersList");
  if (!list) return;
  const user = currentUser?.();
  if (!user) {
    list.innerHTML = '<div class="empty-state">Войдите в аккаунт, чтобы увидеть заказы.</div>';
    return;
  }
  try {
    const orders = await api.getMyOrders();
    if (!Array.isArray(orders) || !orders.length) {
      list.innerHTML = '<div class="empty-state">У вас пока нет заказов.</div>';
      return;
    }
    list.innerHTML = "";
    orders
      .slice()
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .forEach((order) => {
        const itemLines = (order.items || [])
          .map((i) => `${i.name} — ${i.qty} шт. × ${formatPriceLocal(i.price)} ₽`)
          .join("<br>");
        const row = document.createElement("div");
        row.className = "admin-product-row";
        row.innerHTML = `
          <div class="admin-product-main">
            <div class="admin-product-title">Заказ #${String(order.id || "").slice(0, 8)}</div>
            <div class="admin-product-meta">${formatDateTimeLocal(order.createdAt)}</div>
            <div class="admin-product-meta">${itemLines}</div>
          </div>
          <div class="admin-product-price">${formatPriceLocal(order.total)} ₽</div>
          <div></div>
          <div class="admin-product-actions"><span class="pill pill-muted">${statusLabel(order.status)}</span></div>
        `;
        list.appendChild(row);
      });
  } catch (err) {
    list.innerHTML = `<div class="empty-state">${err instanceof Error ? err.message : "Не удалось загрузить заказы."}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await restoreSession?.();
  await syncPublicDataFromServer?.();
  initYear?.();
  setHeaderAuthUI?.();
  setCartCountUI?.();
  renderMyOrders();
});
