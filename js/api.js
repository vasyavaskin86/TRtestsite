const API_BASE = (() => {
  const { hostname, protocol, port } = window.location;
  // Если сайт запущен на GitHub Pages или другом хостинге (не localhost)
  const isLocalHost = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "";
  
  if (isLocalHost) {
    return (port === "3001") ? "" : "http://127.0.0.1:3001";
  }
  
  // Для продакшена (GitHub + облачный бэкенд)
  // ВАЖНО: После деплоя бэкенда на Render/Railway, замените адрес ниже на ваш URL
  return "https://trtestsite.onrender.com"; 
})();

const TOKEN_KEY = "start_auth_token";

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setAuthToken(token) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    // Убеждаемся, что путь начинается со слеша, а база его не имеет
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${API_BASE}${cleanPath}`;
    res = await fetch(url, { ...options, headers });
  } catch {
    const isFileProtocol = window.location.protocol === "file:";
    if (isFileProtocol) {
      throw new Error("Сайт открыт как файл. Запустите сервер и откройте http://127.0.0.1:3001.");
    }
    throw new Error("Нет соединения с сервером. Проверьте, что backend запущен на http://127.0.0.1:3001.");
  }
  if (!res.ok) {
    let message = "Ошибка запроса";
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  getProducts: async () => apiRequest("/api/products"),
  createProduct: async (payload) => apiRequest("/api/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: async (id, payload) => apiRequest(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: async (id) => apiRequest(`/api/products/${id}`, { method: "DELETE" }),

  getCarousel: async () => apiRequest("/api/carousel"),
  createCarousel: async (payload) => apiRequest("/api/carousel", { method: "POST", body: JSON.stringify(payload) }),
  updateCarousel: async (id, payload) => apiRequest(`/api/carousel/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCarousel: async (id) => apiRequest(`/api/carousel/${id}`, { method: "DELETE" }),

  getPromotions: async () => apiRequest("/api/promotions"),
  createPromotion: async (payload) => apiRequest("/api/promotions", { method: "POST", body: JSON.stringify(payload) }),
  updatePromotion: async (id, payload) => apiRequest(`/api/promotions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePromotion: async (id) => apiRequest(`/api/promotions/${id}`, { method: "DELETE" }),

  getNews: async () => apiRequest("/api/news"),
  createNews: async (payload) => apiRequest("/api/news", { method: "POST", body: JSON.stringify(payload) }),
  updateNews: async (id, payload) => apiRequest(`/api/news/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteNews: async (id) => apiRequest(`/api/news/${id}`, { method: "DELETE" }),
  getServices: async () => apiRequest("/api/services"),
  createService: async (payload) => apiRequest("/api/services", { method: "POST", body: JSON.stringify(payload) }),
  updateService: async (id, payload) => apiRequest(`/api/services/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteService: async (id) => apiRequest(`/api/services/${id}`, { method: "DELETE" }),

  login: async (payload) => apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: async (payload) => apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  me: async () => apiRequest("/api/auth/me"),
  updateProfile: async (payload) => apiRequest("/api/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),
  getAdminState: async () => apiRequest("/api/admin/state"),
  saveAdminState: async (payload) => apiRequest("/api/admin/state", { method: "PUT", body: JSON.stringify(payload) }),
  getPublicSettings: async () => apiRequest("/api/settings/public"),
  createOrder: async (payload) => apiRequest("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  getMyOrders: async () => apiRequest("/api/orders/my"),
  getOrders: async () => apiRequest("/api/orders"),
  updateOrderStatus: async (id, status) =>
    apiRequest(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
