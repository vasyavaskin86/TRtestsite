const WISHLIST_KEY = "sportshop_wishlist";

function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWishlist(ids) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  document.dispatchEvent(new CustomEvent("wishlist:changed"));
}

function toggleWishlist(productId) {
  const wishlist = loadWishlist();
  const index = wishlist.indexOf(productId);
  if (index >= 0) {
    wishlist.splice(index, 1);
    showToast("Удалено", "Товар удален из избранного");
  } else {
    wishlist.push(productId);
    showToast("Добавлено", "Товар добавлен в избранное");
  }
  saveWishlist(wishlist);
}

function isInWishlist(productId) {
  return loadWishlist().includes(productId);
}

function updateWishlistUI() {
  const count = loadWishlist().length;
  const el = document.getElementById("wishlistCount");
  if (el) {
    el.textContent = String(count);
    // Remove the toggle that hides the pill when count is 0
    el.closest(".pill").classList.remove("hidden");
  }
  
  // Update all heart icons on page
  document.querySelectorAll("[data-wishlist-toggle]").forEach(btn => {
    const id = btn.dataset.wishlistToggle;
    btn.classList.toggle("active", isInWishlist(id));
  });
}

document.addEventListener("wishlist:changed", updateWishlistUI);
document.addEventListener("DOMContentLoaded", updateWishlistUI);

// Event delegation for wishlist buttons
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-wishlist-toggle]");
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.wishlistToggle;
    toggleWishlist(id);
  }
});
