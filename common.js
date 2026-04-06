// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
  apiKey: "AIzaSyD16uGnm1vodkbqGoFSdFdJjGFSLpJmflk",
  authDomain: "myessantia.firebaseapp.com",
  projectId: "myessantia",
  storageBucket: "myessantia.firebasestorage.app",
  messagingSenderId: "701726517205",
  appId: "1:701726517205:web:f6ab79efdffeab6dbbbf5c",
  measurementId: "G-SZF11SHZBH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========== GLOBAL VARIABLES ==========
let cart = [];
let currentUser = null;
let products = [];
let eventListenersInitialized = false;
let modalListenersBound = false;
let cartButtonListenerBound = false;

// ========== CHECKOUT STATE ==========
let checkoutLoaded = false;
let checkoutMapsLoaded = false;
let checkoutState = {
  appliedPromo: null,
  subtotal: 0,
  discount: 0,
  shippingMethod: "standard",
  shippingCharge: 60,
  total: 0,
  autocomplete: null
};

const checkoutPromos = {
  WELCOME10: { type: "percent", value: 10, msg: "10% OFF applied!" },
  MYESSANTIA20: { type: "percent", value: 20, msg: "20% OFF applied!" },
  SAVE100: { type: "fixed", value: 100, msg: "₹100 OFF applied!" }
};

// ========== LOAD CART FROM LOCALSTORAGE ON INIT ==========
function loadCartFromLocalStorage() {
  try {
    const savedCart = localStorage.getItem("MyEssantia_cart");
    if (savedCart) {
      cart = JSON.parse(savedCart);
      console.log("Cart loaded from localStorage:", cart);
    } else {
      console.log("No cart found in localStorage");
    }
  } catch (error) {
    console.error("Error loading cart from localStorage:", error);
    cart = [];
  }
}

// ========== SAVE CART TO LOCALSTORAGE ==========
function saveCartToLocalStorage() {
  try {
    localStorage.setItem("MyEssantia_cart", JSON.stringify(cart));
    console.log("Cart saved to localStorage:", cart);
  } catch (error) {
    console.error("Error saving cart to localStorage:", error);
  }
}

// Load cart from localStorage immediately when script runs
loadCartFromLocalStorage();

// ========== FIREBASE AUTH STATE OBSERVER ==========
auth.onAuthStateChanged(async (user) => {
  console.log("Auth state changed:", user ? "Logged in" : "Logged out");
  if (user) {
    currentUser = {
      uid: user.uid,
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      picture: user.photoURL || "https://via.placeholder.com/80",
      provider: user.providerData[0]?.providerId || "email",
      memberSince: user.metadata.creationTime
    };

    localStorage.setItem("MyEssantia_user", JSON.stringify(currentUser));

    await loadUserCart(user.uid);
    await loadProducts();

    updateProfileIcon();
    if (document.getElementById("profile-content")) {
      renderProfileContent();
    }

    updateCartCount();
  } else {
    currentUser = null;
    localStorage.removeItem("MyEssantia_user");
    updateProfileIcon();
    if (document.getElementById("profile-content")) {
      renderProfileContent();
    }
  }
});

// ========== FIREBASE DATA FUNCTIONS ==========
async function loadUserCart(userId) {
  try {
    const cartDoc = await db.collection("carts").doc(userId).get();
    let firebaseCart = [];

    if (cartDoc.exists) {
      firebaseCart = cartDoc.data().items || [];
      console.log("Firebase cart loaded:", firebaseCart);
    }

    if (firebaseCart.length > 0 && cart.length > 0) {
      cart = mergeCarts(cart, firebaseCart);
      console.log("Carts merged:", cart);
    } else if (firebaseCart.length > 0) {
      cart = firebaseCart;
      console.log("Using Firebase cart:", cart);
    }

    saveCartToLocalStorage();
    updateCartCount();
  } catch (error) {
    console.error("Error loading cart:", error);
    updateCartCount();
  }
}

// ========== MERGE CARTS FUNCTION ==========
function mergeCarts(localCart, firebaseCart) {
  const merged = [...firebaseCart];

  localCart.forEach((localItem) => {
    const existingItem = merged.find((item) => item.id === localItem.id);
    if (existingItem) {
      existingItem.quantity = Math.max(existingItem.quantity, localItem.quantity);
    } else {
      merged.push(localItem);
    }
  });

  return merged;
}

async function saveCartToFirebase() {
  if (!currentUser) return;

  try {
    await db.collection("carts").doc(currentUser.uid).set({
      items: cart,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Cart saved to Firebase");
    saveCartToLocalStorage();
  } catch (error) {
    console.error("Error saving cart to Firebase:", error);
    saveCartToLocalStorage();
  }
}

async function loadProducts() {
  try {
    const productsSnapshot = await db.collection("products").get();
    products = productsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log("Products loaded:", products.length);
    localStorage.setItem("MyEssantia_products", JSON.stringify(products));
  } catch (error) {
    console.error("Error loading products:", error);
    const cached = localStorage.getItem("MyEssantia_products");
    products = cached ? JSON.parse(cached) : [];
    console.log("Products loaded from cache:", products.length);
  }
}

// ========== UTILITY FUNCTIONS ==========
function formatPrice(price) {
  return Number(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

function renderRating(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars += '<i class="fa-solid fa-star"></i>';
    else if (rating > i - 1 && rating < i) stars += '<i class="fa-solid fa-star-half-alt"></i>';
    else stars += '<i class="fa-regular fa-star"></i>';
  }
  return stars + `<span>(${rating.toFixed(1)})</span>`;
}

function getStockStatus(stock) {
  if (stock > 10) return '<span class="stock-badge in-stock">In Stock</span>';
  if (stock > 0) return `<span class="stock-badge low-stock">Only ${stock} left</span>`;
  return '<span class="stock-badge out-of-stock">Out of Stock</span>';
}

function checkoutFormatPrice(price) {
  return "₹" + Number(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

// ========== FALLBACK COMPONENTS ==========
function getFallbackHeader() {
  return `
    <header style="padding: 1rem; background: #fff; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="logo" style="font-family: 'Playfair Display', serif; font-size: 1.8rem;">
          My<span style="color: #d4af37;">Essantia</span>
        </div>
        <div class="header-icons">
          <a href="#" id="search-icon" style="margin: 0 0.5rem;"><i class="fa-solid fa-magnifying-glass"></i></a>
          <a href="#" id="profile-icon" style="margin: 0 0.5rem;"><i class="fa-regular fa-user"></i></a>
          <a href="#" id="cart-icon" style="margin: 0 0.5rem; position: relative;">
            <i class="fa-regular fa-shopping-bag"></i>
            <span id="cart-count" style="position: absolute; top: -8px; right: -8px; background: #d4af37; color: #fff; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; display: flex; align-items: center; justify-content: center;">0</span>
          </a>
        </div>
      </div>
    </header>
  `;
}

function getFallbackFooter() {
  return `
    <footer style="background: #1a1a1a; color: #fff; padding: 2rem 1rem; margin-top: 3rem;">
      <div style="text-align: center;">
        <p>&copy; 2025 MyEssantia. All rights reserved.</p>
      </div>
    </footer>
  `;
}

// ========== COMPONENT LOADING ==========
async function loadComponents() {
  try {
    const headerResponse = await fetch("header.html");
    const headerData = await headerResponse.text();
    document.getElementById("header").innerHTML = headerData;

    const footerResponse = await fetch("footer.html");
    const footerData = await footerResponse.text();
    document.getElementById("footer").innerHTML = footerData;

    await loadProducts();

    setTimeout(() => {
      if (typeof initializeApp === "function") {
        initializeApp();
      }
      setupEventListeners();
      updateCartCount();
    }, 50);
  } catch (error) {
    console.error("Error loading components:", error);
    document.getElementById("header").innerHTML = getFallbackHeader();
    document.getElementById("footer").innerHTML = getFallbackFooter();

    const cached = localStorage.getItem("MyEssantia_products");
    products = cached ? JSON.parse(cached) : [];

    setTimeout(() => {
      if (typeof initializeApp === "function") {
        initializeApp();
      }
      setupEventListeners();
      updateCartCount();
    }, 50);
  }
}

// ========== EVENT LISTENERS SETUP ==========
function setupEventListeners() {
  if (eventListenersInitialized) return;
  eventListenersInitialized = true;

  console.log("Setting up event listeners");

  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileDropdown = document.getElementById("mobileDropdown");
  const mobileMenuClose = document.getElementById("mobileMenuClose");

  if (mobileMenuToggle && mobileDropdown) {
    mobileMenuToggle.addEventListener("click", function(e) {
      e.stopPropagation();
      this.classList.toggle("active");
      mobileDropdown.classList.toggle("show");

      if (mobileDropdown.classList.contains("show")) {
        document.body.classList.add("menu-open");
        document.body.style.overflow = "hidden";
      } else {
        document.body.classList.remove("menu-open");
        document.body.style.overflow = "";
      }
    });

    if (mobileMenuClose) {
      mobileMenuClose.addEventListener("click", function() {
        mobileMenuToggle.classList.remove("active");
        mobileDropdown.classList.remove("show");
        document.body.classList.remove("menu-open");
        document.body.style.overflow = "";
      });
    }

    const mobileLinks = document.querySelectorAll(".mobile-menu-link");
    mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenuToggle.classList.remove("active");
        mobileDropdown.classList.remove("show");
        document.body.classList.remove("menu-open");
        document.body.style.overflow = "";
      });
    });

    document.addEventListener("click", function(e) {
      if (mobileDropdown.classList.contains("show")) {
        if (!mobileDropdown.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
          mobileMenuToggle.classList.remove("active");
          mobileDropdown.classList.remove("show");
          document.body.classList.remove("menu-open");
          document.body.style.overflow = "";
        }
      }
    });
  }

  document.addEventListener("click", function(e) {
    const cartIcon = e.target.closest("#cart-icon");
    if (cartIcon) {
      e.preventDefault();
      openCart();

      if (mobileDropdown && mobileDropdown.classList.contains("show")) {
        mobileMenuToggle?.classList.remove("active");
        mobileDropdown.classList.remove("show");
        document.body.classList.remove("menu-open");
        document.body.style.overflow = "";
      }
    }
  });

  document.addEventListener("click", function(e) {
    const profileIcon = e.target.closest("#profile-icon");
    if (profileIcon) {
      e.preventDefault();
      openProfile();

      if (mobileDropdown && mobileDropdown.classList.contains("show")) {
        mobileMenuToggle?.classList.remove("active");
        mobileDropdown.classList.remove("show");
        document.body.classList.remove("menu-open");
        document.body.style.overflow = "";
      }
    }
  });

  document.addEventListener("click", function(e) {
    const searchIcon = e.target.closest("#search-icon");
    if (searchIcon) {
      e.preventDefault();
      openSearch();

      if (mobileDropdown && mobileDropdown.classList.contains("show")) {
        mobileMenuToggle?.classList.remove("active");
        mobileDropdown.classList.remove("show");
        document.body.classList.remove("menu-open");
        document.body.style.overflow = "";
      }
    }
  });

  setupModalListeners();

  window.addEventListener("click", function(e) {
    const cartModal = document.getElementById("cart-modal");
    const profileModal = document.getElementById("profile-modal");
    const searchModal = document.getElementById("search-modal");
    const checkoutOverlay = document.getElementById("checkout-overlay");

    if (e.target === cartModal) closeModal("cart-modal");
    if (e.target === profileModal) closeModal("profile-modal");
    if (e.target === searchModal) closeModal("search-modal");
    if (e.target === checkoutOverlay) closeCheckout();
  });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      if (mobileDropdown && mobileDropdown.classList.contains("show")) {
        mobileMenuToggle?.classList.remove("active");
        mobileDropdown.classList.remove("show");
        document.body.classList.remove("menu-open");
        document.body.style.overflow = "";
      }

      closeModal("cart-modal");
      closeModal("profile-modal");
      closeModal("search-modal");
      closeCheckout();
    }
  });

  window.addEventListener("resize", function() {
    if (window.innerWidth > 768) {
      if (mobileDropdown && mobileDropdown.classList.contains("show")) {
        mobileMenuToggle?.classList.remove("active");
        mobileDropdown.classList.remove("show");
        document.body.classList.remove("menu-open");
        document.body.style.overflow = "";
      }
    }
  });

  setupCartButtonListener();
}

function setupModalListeners() {
  if (modalListenersBound) return;
  modalListenersBound = true;

  const closeCart = document.getElementById("close-cart");
  if (closeCart) {
    closeCart.addEventListener("click", function(e) {
      e.preventDefault();
      closeModal("cart-modal");
    });
  }

  const closeProfile = document.getElementById("close-profile");
  if (closeProfile) {
    closeProfile.addEventListener("click", function(e) {
      e.preventDefault();
      closeModal("profile-modal");
    });
  }

  const closeSearch = document.getElementById("close-search");
  if (closeSearch) {
    closeSearch.addEventListener("click", function(e) {
      e.preventDefault();
      closeModal("search-modal");
    });
  }

  const searchInput = document.getElementById("search-products-input");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      renderSearchResults(this.value.trim());
    });
  }

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async function(e) {
      e.preventDefault();

      if (cart.length === 0) return;

      saveCartToLocalStorage();

      if (currentUser) {
        try {
          await saveCartToFirebase();
        } catch (error) {
          console.error("Error saving cart before checkout:", error);
        }
      }

      closeModal("cart-modal");
      await openCheckout();
    });
  }
}

// ========== CART BUTTON SETUP (Event Delegation) ==========
function setupCartButtonListener() {
  if (cartButtonListenerBound) return;
  cartButtonListenerBound = true;

  document.addEventListener("click", function(e) {
    const button = e.target.closest("[data-add-to-cart]");
    if (button) {
      e.preventDefault();
      const productId = button.getAttribute("data-add-to-cart");
      addToCart(productId, button);
    }
  });
}

// ========== MAIN ADD TO CART FUNCTION ==========
window.addToCart = async function(productId, button = null) {
  console.log("Adding to cart:", productId);

  if (!button && typeof event !== "undefined") {
    button = event.target?.closest("button");
  }

  const product = products.find((p) => p.id === productId);
  if (!product) {
    console.error("Product not found:", productId);
    return;
  }

  if (product.stock <= 0) {
    alert("Sorry, this product is out of stock!");
    return;
  }

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    if (existingItem.quantity >= product.stock) {
      alert("Sorry, not enough stock available!");
      return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: productId,
      title: product.title,
      category: product.category,
      price: product.price,
      primaryImg: product.primaryImg || (product.images && product.images[0]),
      quantity: 1
    });
  }

  saveCartToLocalStorage();

  if (currentUser) {
    try {
      await saveCartToFirebase();
    } catch (error) {
      console.error("Error saving to Firebase:", error);
    }
  }

  updateCartCount();

  if (button) {
    const originalHTML = button.innerHTML;
    const originalBg = button.style.background;
    const originalColor = button.style.color;

    button.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
    button.style.background = "#4CAF50";
    button.style.color = "white";

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = originalBg;
      button.style.color = originalColor;
      openCart();
    }, 500);
  } else {
    setTimeout(() => openCart(), 300);
  }
};

window.addToCartLegacy = function(productId) {
  window.addToCart(productId, typeof event !== "undefined" ? event?.target?.closest("button") : null);
};

window.buyNow = async function(productId) {
  await window.addToCart(productId, typeof event !== "undefined" ? event?.target?.closest("button") : null);
  setTimeout(() => openCheckout(), 450);
};

// ========== CART FUNCTIONS ==========
window.updateQuantity = async function(productId, change) {
  const itemIndex = cart.findIndex((item) => item.id === productId);
  if (itemIndex === -1) return;

  const product = products.find((p) => p.id === productId);
  const item = cart[itemIndex];
  const newQuantity = item.quantity + change;

  if (newQuantity <= 0) {
    cart.splice(itemIndex, 1);
  } else if (product && newQuantity > product.stock) {
    alert("Sorry, not enough stock available!");
    return;
  } else {
    item.quantity = newQuantity;
  }

  saveCartToLocalStorage();

  if (currentUser) {
    await saveCartToFirebase();
  }

  updateCartCount();

  const cartModal = document.getElementById("cart-modal");
  if (cartModal && cartModal.classList.contains("show")) {
    renderCartItems();
  }

  if (document.getElementById("checkout-overlay")?.classList.contains("active")) {
    renderCheckoutCart();
    updateCheckoutTotals();
  }

  if (document.getElementById("search-modal")?.classList.contains("show")) {
    renderSearchResults(document.getElementById("search-products-input")?.value || "");
  }
};

window.removeFromCart = async function(productId) {
  cart = cart.filter((item) => item.id !== productId);

  saveCartToLocalStorage();

  if (currentUser) {
    await saveCartToFirebase();
  }

  updateCartCount();

  const cartModal = document.getElementById("cart-modal");
  if (cartModal && cartModal.classList.contains("show")) {
    renderCartItems();
  }

  if (document.getElementById("checkout-overlay")?.classList.contains("active")) {
    renderCheckoutCart();
    updateCheckoutTotals();
  }
};

function renderCartItems() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartItemCount = document.getElementById("cart-item-count");
  const cartTotalAmount = document.getElementById("cart-total-amount");

  if (!cartItemsContainer) return;

  if (!cart || cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-message">
        <i class="fa-regular fa-cart-shopping"></i>
        <p>Your cart is empty</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Start shopping to add items!</p>
      </div>
    `;
    if (cartItemCount) cartItemCount.textContent = "0";
    if (cartTotalAmount) cartTotalAmount.textContent = "₹0.00";
    return;
  }

  let total = 0;
  let totalItems = 0;

  const itemsHtml = cart.map((item) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    totalItems += item.quantity;

    return `
      <div class="cart-item" data-product-id="${item.id}">
        <div class="cart-item-image" style="background-image: url('${item.primaryImg || "https://via.placeholder.com/90"}');"></div>
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.title}</h4>
          <div class="cart-item-price">₹${formatPrice(item.price)}</div>
          <div class="cart-item-actions">
            <div class="quantity-controls">
              <button class="quantity-btn decrease-qty" data-product-id="${item.id}">
                <i class="fa-solid fa-minus"></i>
              </button>
              <span class="quantity-value">${item.quantity}</span>
              <button class="quantity-btn increase-qty" data-product-id="${item.id}">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
            <button class="remove-btn remove-from-cart" data-product-id="${item.id}">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  cartItemsContainer.innerHTML = itemsHtml;

  if (cartItemCount) cartItemCount.textContent = totalItems;
  if (cartTotalAmount) cartTotalAmount.textContent = `₹${formatPrice(total)}`;

  attachCartButtonListeners();
}

function attachCartButtonListeners() {
  document.querySelectorAll(".decrease-qty").forEach((button) => {
    button.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute("data-product-id");
      if (productId) {
        window.updateQuantity(productId, -1);
      }
    });
  });

  document.querySelectorAll(".increase-qty").forEach((button) => {
    button.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute("data-product-id");
      if (productId) {
        window.updateQuantity(productId, 1);
      }
    });
  });

  document.querySelectorAll(".remove-from-cart").forEach((button) => {
    button.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute("data-product-id");
      if (productId) {
        window.removeFromCart(productId);
      }
    });
  });
}

function updateCartCount() {
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
  }
}

// ========== MODAL FUNCTIONS ==========
function openCart() {
  const cartModal = document.getElementById("cart-modal");
  if (cartModal) {
    renderCartItems();
    cartModal.style.display = "flex";
    cartModal.classList.add("show");
    document.body.style.overflow = "hidden";
  } else {
    loadCommonModals().then(() => {
      setTimeout(() => {
        const modal = document.getElementById("cart-modal");
        if (modal) {
          renderCartItems();
          modal.style.display = "flex";
          modal.classList.add("show");
          document.body.style.overflow = "hidden";
        }
      }, 100);
    });
  }
}

function openProfile() {
  const profileModal = document.getElementById("profile-modal");
  if (profileModal) {
    renderProfileContent();
    profileModal.classList.add("show");
    document.body.style.overflow = "hidden";
  } else {
    loadCommonModals().then(() => {
      setTimeout(() => {
        const modal = document.getElementById("profile-modal");
        if (modal) {
          renderProfileContent();
          modal.classList.add("show");
          document.body.style.overflow = "hidden";
        }
      }, 100);
    });
  }
}

async function openSearch() {
  if (!products.length) {
    await loadProducts();
  }

  const searchModal = document.getElementById("search-modal");
  if (searchModal) {
    searchModal.classList.add("show");
    document.body.style.overflow = "hidden";
    renderSearchResults("");
    setTimeout(() => {
      document.getElementById("search-products-input")?.focus();
    }, 80);
  } else {
    await loadCommonModals();
    setTimeout(() => {
      document.getElementById("search-modal")?.classList.add("show");
      document.body.style.overflow = "hidden";
      renderSearchResults("");
      document.getElementById("search-products-input")?.focus();
    }, 100);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "";
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }
}

window.openCart = openCart;
window.closeModal = closeModal;

// ========== SEARCH FUNCTIONS ==========
function renderSearchResults(query = "") {
  const results = document.getElementById("search-results");
  if (!results) return;

  const normalized = query.trim().toLowerCase();
  const filtered = products.filter((product) => {
    const title = (product.title || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    return !normalized || title.includes(normalized) || category.includes(normalized);
  });

  if (!filtered.length) {
    results.innerHTML = `
      <div class="search-empty">
        <i class="fa-solid fa-magnifying-glass" style="font-size:1.6rem; margin-bottom:0.75rem;"></i>
        <p>No products found.</p>
      </div>
    `;
    return;
  }

  results.innerHTML = filtered.map((product) => `
    <div class="search-product-card">
      <div class="search-product-image" style="background-image:url('${product.primaryImg || (product.images && product.images[0]) || "https://via.placeholder.com/120"}')"></div>
      <div class="search-product-info">
        <h4>${product.title || "Untitled Product"}</h4>
        <div class="search-product-meta">${product.category || "Category"}</div>
        <div class="search-product-price">₹${formatPrice(product.price || 0)}</div>
      </div>
      <div class="search-product-action">
        <button class="search-add-btn" data-add-to-cart="${product.id}">
          <i class="fa-solid fa-bag-shopping"></i> Add to Cart
        </button>
      </div>
    </div>
  `).join("");
}

// ========== LOAD COMMON MODALS ==========
async function loadCommonModals() {
  try {
    if (document.getElementById("cart-modal")) {
      return;
    }

    const response = await fetch("common.html");
    const data = await response.text();
    document.getElementById("common-modals").innerHTML = data;

    modalListenersBound = false;
    setTimeout(() => {
      setupModalListeners();
    }, 100);
  } catch (error) {
    console.error("Error loading modals:", error);
  }
}

// ========== PROFILE FUNCTIONS ==========
function renderProfileContent() {
  const profileContent = document.getElementById("profile-content");
  if (!profileContent) return;

  if (currentUser) {
    profileContent.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar">
          <img src="${currentUser.picture || "https://via.placeholder.com/150"}"
               alt="Profile"
               style="width:100%;height:100%;object-fit:cover;"
               onerror="this.src='https://via.placeholder.com/150'">
        </div>

        <div class="profile-name" style="text-align:center;">${currentUser.name}</div>
        <div class="profile-email" style="text-align:center; display:block; width:100%;">${currentUser.email}</div>

        <button class="logout-btn" onclick="window.logout()">
          Logout
        </button>
      </div>
    `;
  } else {
    profileContent.innerHTML = `
      <div class="login-wrapper">
        <div class="login-icon">
          <i class="fa-brands fa-google"></i>
        </div>

        <div class="login-title">
          Welcome to <span style="color:#d4af37;">MyEssantia</span>
        </div>

        <div class="login-subtitle">
          Sign in securely with your Google account
        </div>

        <button class="google-login-btn" onclick="window.loginWithGoogle()">
          <i class="fa-brands fa-google"></i>
          Continue with Google
        </button>

        <div class="login-terms">
          By continuing, you agree to our Terms & Privacy Policy
        </div>
      </div>
    `;
  }
}

window.loginWithGoogle = async function() {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await auth.signInWithPopup(provider);

    const isNewUser = result.additionalUserInfo?.isNewUser;

    if (isNewUser) {
      await db.collection("users").doc(result.user.uid).set({
        name: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    closeModal("profile-modal");
  } catch (error) {
    console.error("Google login error:", error);
    let errorMessage = "Google login failed. Please try again.";
    if (error.code === "auth/popup-closed-by-user") {
      errorMessage = "Login cancelled.";
    } else if (error.code === "auth/popup-blocked") {
      errorMessage = "Popup was blocked by your browser.";
    }
    alert(errorMessage);
  }
};

window.logout = async function() {
  try {
    await auth.signOut();
    closeModal("profile-modal");
  } catch (error) {
    console.error("Logout error:", error);
    alert("Failed to logout. Please try again.");
  }
};

function updateProfileIcon() {
  const profileIcon = document.getElementById("profile-icon");
  if (profileIcon) {
    if (currentUser) {
      profileIcon.innerHTML = '<i class="fa-solid fa-circle-user" style="color: #d4af37;"></i>';
    } else {
      profileIcon.innerHTML = '<i class="fa-regular fa-user"></i>';
    }
  }
}

// ===== INFINITE SCROLL STRIPS =====
function initInfiniteScroll() {
  const topBarContent = document.querySelector(".top-bar-scroll-content");
  if (topBarContent) {
    const originalHTML = topBarContent.innerHTML;
    topBarContent.innerHTML = originalHTML + originalHTML;

    let position = 0;
    const speed = 0.5;

    function scrollTopBar() {
      position -= speed;
      const originalWidth = topBarContent.scrollWidth / 2;
      if (Math.abs(position) >= originalWidth) {
        position = 0;
      }
      topBarContent.style.transform = `translateX(${position}px)`;
      requestAnimationFrame(scrollTopBar);
    }

    scrollTopBar();
  }

  const valueStripScroll = document.querySelector(".value-strip-scroll");
  if (valueStripScroll) {
    const originalHTML = valueStripScroll.innerHTML;
    valueStripScroll.innerHTML = originalHTML + originalHTML;

    let valuePosition = 0;
    const valueSpeed = 0.5;

    function scrollValueStrip() {
      valuePosition -= valueSpeed;
      const originalWidth = valueStripScroll.scrollWidth / 2;
      if (Math.abs(valuePosition) >= originalWidth) {
        valuePosition = 0;
      }
      valueStripScroll.style.transform = `translateX(${valuePosition}px)`;
      requestAnimationFrame(scrollValueStrip);
    }

    scrollValueStrip();
  }
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(initInfiniteScroll, 100);
});

// ========== CHECKOUT UI ==========
function injectCheckoutStyles() {
  if (document.getElementById("checkout-ui-styles")) return;

  const style = document.createElement("style");
  style.id = "checkout-ui-styles";
  style.textContent = `
    .checkout-overlay {
      position: fixed;
      inset: 0;
      background: rgba(13, 22, 24, 0.62);
      backdrop-filter: blur(6px);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .checkout-overlay.active {
      display: flex;
    }

    .checkout-shell {
      width: min(1180px, 100%);
      max-height: 92vh;
      overflow: hidden;
      background: linear-gradient(180deg, #fcfffd 0%, #f5fbf8 100%);
      border-radius: 28px;
      box-shadow: 0 24px 80px rgba(15, 35, 28, 0.22);
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
    }

    .checkout-main {
      padding: 28px;
      overflow-y: auto;
    }

    .checkout-side {
      background: linear-gradient(180deg, #163d35 0%, #0f2924 100%);
      color: #fff;
      padding: 28px;
      overflow-y: auto;
    }

    .checkout-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 22px;
    }

    .checkout-title-wrap h2 {
      margin: 0;
      font-size: 1.8rem;
      color: #14332d;
    }

    .checkout-title-wrap p {
      margin: 6px 0 0;
      color: #5c6f68;
      font-size: 0.95rem;
    }

    .checkout-close {
      width: 42px;
      height: 42px;
      border: none;
      border-radius: 50%;
      background: #e9f2ee;
      color: #163d35;
      font-size: 1.05rem;
      cursor: pointer;
    }

    .checkout-steps {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }

    .checkout-step {
      background: #fff;
      border: 1px solid #e4efe9;
      border-radius: 18px;
      padding: 16px;
      transition: 0.25s ease;
    }

    .checkout-step.active {
      border-color: #1d7a68;
      box-shadow: 0 12px 28px rgba(29, 122, 104, 0.12);
    }

    .checkout-step.completed {
      background: #f1fbf7;
      border-color: #9ed8c8;
    }

    .checkout-step small {
      display: block;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6f847d;
      margin-bottom: 8px;
    }

    .checkout-step strong {
      display: block;
      color: #173832;
      font-size: 1rem;
      margin-bottom: 4px;
    }

    .checkout-step span {
      font-size: 0.9rem;
      color: #6c8179;
    }

    .checkout-progress {
      height: 8px;
      border-radius: 999px;
      background: #dfece6;
      overflow: hidden;
      margin-bottom: 24px;
    }

    .checkout-progress-fill {
      height: 100%;
      width: 50%;
      background: linear-gradient(90deg, #1d7a68 0%, #49b39a 100%);
      border-radius: inherit;
      transition: width 0.3s ease;
    }

    .checkout-card {
      background: rgba(255,255,255,0.92);
      border: 1px solid #e4efe9;
      border-radius: 22px;
      padding: 22px;
      margin-bottom: 18px;
      box-shadow: 0 10px 30px rgba(17, 55, 44, 0.05);
    }

    .checkout-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }

    .checkout-card-header h3 {
      margin: 0;
      font-size: 1.08rem;
      color: #14332d;
    }

    .checkout-card-header p {
      margin: 4px 0 0;
      font-size: 0.9rem;
      color: #6a7d76;
    }

    .checkout-badge {
      background: #e5f5ef;
      color: #1d7a68;
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .checkout-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .checkout-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkout-field.full {
      grid-column: 1 / -1;
    }

    .checkout-field label {
      font-size: 0.9rem;
      color: #27443d;
      font-weight: 600;
    }

    .checkout-field input,
    .checkout-field textarea {
      width: 100%;
      border: 1px solid #d6e7df;
      background: #fff;
      border-radius: 14px;
      padding: 14px 15px;
      font-size: 0.95rem;
      outline: none;
      transition: 0.2s ease;
    }

    .checkout-field textarea {
      min-height: 96px;
      resize: vertical;
    }

    .checkout-field input:focus,
    .checkout-field textarea:focus {
      border-color: #1d7a68;
      box-shadow: 0 0 0 4px rgba(29, 122, 104, 0.10);
    }

    .checkout-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 18px;
    }

    .checkout-btn-primary,
    .checkout-btn-secondary {
      border: none;
      border-radius: 14px;
      padding: 14px 18px;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.96rem;
      transition: 0.2s ease;
    }

    .checkout-btn-primary {
      background: linear-gradient(135deg, #1d7a68 0%, #145548 100%);
      color: #fff;
      min-width: 220px;
    }

    .checkout-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 24px rgba(29, 122, 104, 0.22);
    }

    .checkout-btn-secondary {
      background: #edf6f2;
      color: #173832;
    }

    .checkout-shipping-grid {
      display: grid;
      gap: 12px;
      margin: 14px 0 20px;
    }

    .checkout-shipping-option {
      position: relative;
      border: 1px solid #d7e8e0;
      border-radius: 18px;
      background: #fff;
      padding: 16px;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .checkout-shipping-option.active {
      border-color: #1d7a68;
      box-shadow: 0 10px 24px rgba(29, 122, 104, 0.12);
      background: #f5fcf9;
    }

    .checkout-shipping-option input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .checkout-shipping-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }

    .checkout-shipping-title {
      font-size: 1rem;
      font-weight: 700;
      color: #163d35;
    }

    .checkout-shipping-price {
      font-weight: 700;
      color: #1d7a68;
    }

    .checkout-shipping-note {
      color: #6e817a;
      font-size: 0.9rem;
    }

    .checkout-inline {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 16px;
    }

    .checkout-inline input {
      flex: 1;
      border: 1px solid #d6e7df;
      border-radius: 14px;
      padding: 13px 14px;
      font-size: 0.95rem;
      outline: none;
    }

    .checkout-alert {
      border-radius: 14px;
      padding: 13px 14px;
      margin-top: 14px;
      font-size: 0.93rem;
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .checkout-alert.success {
      background: #e9f9f3;
      color: #106b49;
      border: 1px solid #bcead2;
    }

    .checkout-alert.error {
      background: #fff1f1;
      color: #b33434;
      border: 1px solid #efc2c2;
    }

    .checkout-alert.info {
      background: #edf7ff;
      color: #1d5d92;
      border: 1px solid #c7e0f5;
    }

    .checkout-side h3 {
      margin: 0 0 6px;
      font-size: 1.2rem;
    }

    .checkout-side p {
      margin: 0;
      color: rgba(255,255,255,0.75);
      font-size: 0.92rem;
    }

    .checkout-summary-card {
      margin-top: 18px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 22px;
      padding: 18px;
    }

    .checkout-summary-items {
      margin-top: 16px;
      display: grid;
      gap: 12px;
      max-height: 280px;
      overflow-y: auto;
    }

    .checkout-cart-item {
      display: grid;
      grid-template-columns: 56px 1fr auto;
      gap: 12px;
      align-items: center;
      background: rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 10px;
    }

    .checkout-thumb {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background-size: cover;
      background-position: center;
      background-color: rgba(255,255,255,0.15);
    }

    .checkout-item-name {
      font-weight: 600;
      font-size: 0.95rem;
    }

    .checkout-item-sub {
      font-size: 0.83rem;
      color: rgba(255,255,255,0.72);
      margin-top: 3px;
    }

    .checkout-item-price {
      font-weight: 700;
      font-size: 0.92rem;
      white-space: nowrap;
    }

    .checkout-summary-breakup {
      margin-top: 18px;
      display: grid;
      gap: 10px;
    }

    .checkout-summary-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: rgba(255,255,255,0.86);
      font-size: 0.95rem;
    }

    .checkout-summary-row.total {
      border-top: 1px solid rgba(255,255,255,0.12);
      padding-top: 14px;
      margin-top: 4px;
      font-size: 1.08rem;
      font-weight: 700;
      color: #fff;
    }

    .checkout-summary-note {
      margin-top: 14px;
      color: #b9d7cf;
      font-size: 0.86rem;
      line-height: 1.45;
    }

    .hidden {
      display: none !important;
    }

    @media (max-width: 980px) {
      .checkout-shell {
        grid-template-columns: 1fr;
        max-height: 94vh;
      }

      .checkout-side {
        order: -1;
      }
    }

    @media (max-width: 640px) {
      .checkout-main,
      .checkout-side {
        padding: 18px;
      }

      .checkout-grid,
      .checkout-steps {
        grid-template-columns: 1fr;
      }

      .checkout-inline {
        flex-direction: column;
      }

      .checkout-inline button,
      .checkout-btn-primary {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function getCheckoutTemplate() {
  return `
    <div id="checkout-overlay" class="checkout-overlay">
      <div class="checkout-shell">
        <div class="checkout-main">
          <div class="checkout-topbar">
            <div class="checkout-title-wrap">
              <h2>Secure Checkout</h2>
              <p>Fast, clean and easy checkout for your order.</p>
            </div>
            <button id="close-checkout-modal" class="checkout-close" aria-label="Close checkout">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="checkout-steps">
            <div id="stepAddress" class="checkout-step active">
              <small>Step 1</small>
              <strong>Delivery Address</strong>
              <span id="stepStatus1">In Progress</span>
            </div>
            <div id="stepPayment" class="checkout-step">
              <small>Step 2</small>
              <strong>Shipping & Payment</strong>
              <span id="stepStatus2">Pending</span>
            </div>
          </div>

          <div class="checkout-progress">
            <div id="progressFill" class="checkout-progress-fill"></div>
          </div>

          <div id="addressCard" class="checkout-card">
            <div class="checkout-card-header">
              <div>
                <h3>Delivery details</h3>
                <p>Enter the address where you want your order delivered.</p>
              </div>
              <div class="checkout-badge">Required</div>
            </div>

            <div class="checkout-grid">
              <div class="checkout-field">
                <label for="fullName">Full Name</label>
                <input id="fullName" type="text" placeholder="Enter your full name">
              </div>

              <div class="checkout-field">
                <label for="email">Email Address</label>
                <input id="email" type="email" placeholder="Enter your email address">
              </div>

              <div class="checkout-field">
                <label for="mobileNumber">Mobile Number</label>
                <input id="mobileNumber" type="tel" maxlength="10" placeholder="10-digit mobile number">
              </div>

              <div class="checkout-field">
                <label for="pincode">Pincode</label>
                <input id="pincode" type="text" maxlength="6" placeholder="6-digit pincode">
              </div>

              <div class="checkout-field full">
                <label for="addressLine">Address</label>
                <textarea id="addressLine" placeholder="House no, street, area, apartment, etc."></textarea>
              </div>

              <div class="checkout-field">
                <label for="landmark">Landmark</label>
                <input id="landmark" type="text" placeholder="Nearby landmark">
              </div>

              <div class="checkout-field">
                <label for="city">City</label>
                <input id="city" type="text" placeholder="City">
              </div>

              <div class="checkout-field">
                <label for="state">State</label>
                <input id="state" type="text" placeholder="State">
              </div>
            </div>

            <div class="checkout-actions">
              <button id="continueToPaymentBtn" class="checkout-btn-primary">
                Continue to Shipping & Payment
              </button>
            </div>

            <div id="detailsMessage"></div>
          </div>

          <div id="paymentCard" class="checkout-card hidden">
            <div class="checkout-card-header">
              <div>
                <h3>Shipping method</h3>
                <p>Choose the delivery speed you prefer and complete payment.</p>
              </div>
              <div id="shippingSavingsBadge" class="checkout-badge">Standard may be free</div>
            </div>

            <div class="checkout-shipping-grid">
              <label class="checkout-shipping-option active" data-shipping-option="standard">
                <input type="radio" name="shippingMethod" value="standard" checked>
                <div class="checkout-shipping-top">
                  <div class="checkout-shipping-title">Standard Delivery</div>
                  <div id="standardShippingPrice" class="checkout-shipping-price">₹60.00</div>
                </div>
                <div class="checkout-shipping-note">Delivered in 4-6 business days. Free above ₹999.</div>
              </label>

              <label class="checkout-shipping-option" data-shipping-option="express">
                <input type="radio" name="shippingMethod" value="express">
                <div class="checkout-shipping-top">
                  <div class="checkout-shipping-title">Express Delivery</div>
                  <div class="checkout-shipping-price">₹140.00</div>
                </div>
                <div class="checkout-shipping-note">Delivered in 1-2 business days.</div>
              </label>
            </div>

            <div class="checkout-card-header" style="margin-top:18px;">
              <div>
                <h3>Promo code</h3>
                <p>Apply an offer if you have one.</p>
              </div>
            </div>

            <div class="checkout-inline">
              <input id="promoCode" type="text" placeholder="Enter promo code">
              <button id="applyPromoBtn" class="checkout-btn-secondary">Apply</button>
            </div>

            <div id="promoMessage"></div>

            <div class="checkout-actions" style="justify-content:space-between; gap:12px; flex-wrap:wrap; margin-top:22px;">
              <button id="backToAddressBtn" class="checkout-btn-secondary" type="button">Back to Address</button>
              <button id="payNowBtn" class="checkout-btn-primary" type="button">
                Pay Now
              </button>
            </div>

            <div id="paymentMessage"></div>
          </div>
        </div>

        <aside class="checkout-side">
          <h3>Order Summary</h3>
          <p>Review your items, delivery charges and total payable amount.</p>

          <div class="checkout-summary-card">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
              <strong>Your Bag</strong>
              <span id="checkoutItemsBadge" class="checkout-badge" style="background:rgba(255,255,255,0.12); color:#fff;">0 products</span>
            </div>

            <div id="checkoutCartItemsContainer" class="checkout-summary-items"></div>

            <div class="checkout-summary-breakup">
              <div class="checkout-summary-row">
                <span>Subtotal</span>
                <strong id="subtotal">₹0.00</strong>
              </div>
              <div id="discountRow" class="checkout-summary-row hidden">
                <span>Discount</span>
                <strong id="discountAmount">-₹0.00</strong>
              </div>
              <div class="checkout-summary-row">
                <span>Shipping</span>
                <strong id="shippingAmount">₹60.00</strong>
              </div>
              <div class="checkout-summary-row total">
                <span>Total</span>
                <strong id="totalAmount">₹0.00</strong>
              </div>
            </div>

            <div id="shippingHint" class="checkout-summary-note">
              Standard delivery becomes free automatically on orders above ₹999.
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

// ========== CHECKOUT DYNAMIC MODAL ==========
async function ensureCheckoutLoaded() {
  if (checkoutLoaded && document.getElementById("checkout-overlay")) return;

  const root = document.getElementById("checkout-modal-root");
  if (!root) return;

  injectCheckoutStyles();
  root.innerHTML = getCheckoutTemplate();
  checkoutLoaded = true;
  bindCheckoutEvents();
  loadCheckoutGooglePlaces();
}

function bindCheckoutEvents() {
  document.getElementById("close-checkout-modal")?.addEventListener("click", closeCheckout);
  document.getElementById("continueToPaymentBtn")?.addEventListener("click", showCheckoutPaymentSection);
  document.getElementById("applyPromoBtn")?.addEventListener("click", applyCheckoutPromo);
  document.getElementById("payNowBtn")?.addEventListener("click", payCheckoutNow);
  document.getElementById("backToAddressBtn")?.addEventListener("click", function() {
    document.getElementById("paymentCard")?.classList.add("hidden");
    setCheckoutStep(1);
  });

  document.querySelectorAll('input[name="shippingMethod"]').forEach((input) => {
    input.addEventListener("change", function() {
      selectCheckoutShipping(this.value);
    });
  });
}

async function openCheckout() {
  await ensureCheckoutLoaded();
  resetCheckout();
  const overlay = document.getElementById("checkout-overlay");
  if (!overlay) return;
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCheckout() {
  const overlay = document.getElementById("checkout-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }
}

window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;

function getCheckoutShippingCharge(method = checkoutState.shippingMethod, subtotal = checkoutState.subtotal) {
  if (method === "express") return 140;
  return subtotal > 999 ? 0 : 60;
}

function getCheckoutShippingLabel(amount) {
  return amount === 0 ? "FREE" : checkoutFormatPrice(amount);
}

function selectCheckoutShipping(method) {
  checkoutState.shippingMethod = method;

  document.querySelectorAll("[data-shipping-option]").forEach((option) => {
    option.classList.toggle("active", option.getAttribute("data-shipping-option") === method);
  });

  updateCheckoutTotals();
}

function resetCheckout() {
  checkoutState.appliedPromo = null;
  checkoutState.subtotal = 0;
  checkoutState.discount = 0;
  checkoutState.shippingMethod = "standard";
  checkoutState.shippingCharge = 60;
  checkoutState.total = 0;

  const savedUser = currentUser || JSON.parse(localStorage.getItem("MyEssantia_user") || "null");
  const savedCustomer = JSON.parse(sessionStorage.getItem("checkout_customer") || "null");

  document.getElementById("fullName").value = savedCustomer?.name || savedUser?.name || "";
  document.getElementById("email").value = savedCustomer?.email || savedUser?.email || "";
  document.getElementById("mobileNumber").value = savedCustomer?.mobile || "";
  document.getElementById("addressLine").value = savedCustomer?.address || "";
  document.getElementById("landmark").value = savedCustomer?.landmark || "";
  document.getElementById("city").value = savedCustomer?.city || "";
  document.getElementById("pincode").value = savedCustomer?.pincode || "";
  document.getElementById("state").value = savedCustomer?.state || "";
  document.getElementById("promoCode").value = "";

  document.getElementById("detailsMessage").innerHTML = "";
  document.getElementById("promoMessage").innerHTML = "";
  document.getElementById("paymentMessage").innerHTML = "";

  document.getElementById("paymentCard").classList.add("hidden");

  const standardInput = document.querySelector('input[name="shippingMethod"][value="standard"]');
  if (standardInput) standardInput.checked = true;
  selectCheckoutShipping("standard");

  renderCheckoutCart();
  updateCheckoutTotals();
  setCheckoutStep(1);
  initCheckoutAutocomplete();
}

function renderCheckoutCart() {
  const container = document.getElementById("checkoutCartItemsContainer");
  const badge = document.getElementById("checkoutItemsBadge");
  if (!container || !badge) return;

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = `${itemCount} product${itemCount !== 1 ? "s" : ""}`;

  if (!cart.length) {
    container.innerHTML = `<div class="checkout-alert info"><i class="fas fa-bag-shopping"></i> Your cart is empty.</div>`;
    return;
  }

  container.innerHTML = cart.map((item) => `
    <div class="checkout-cart-item">
      <div class="checkout-thumb" style="background-image:url('${item.primaryImg || "https://via.placeholder.com/200"}')"></div>
      <div>
        <div class="checkout-item-name">${item.title}</div>
        <div class="checkout-item-sub">Qty ${item.quantity}</div>
      </div>
      <div class="checkout-item-price">${checkoutFormatPrice(item.price * item.quantity)}</div>
    </div>
  `).join("");
}

function updateCheckoutTotals() {
  checkoutState.subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  checkoutState.discount = 0;

  if (checkoutState.appliedPromo && checkoutPromos[checkoutState.appliedPromo.code]) {
    const promo = checkoutPromos[checkoutState.appliedPromo.code];
    if (promo.type === "percent") {
      checkoutState.discount = checkoutState.subtotal * promo.value / 100;
    } else {
      checkoutState.discount = Math.min(promo.value, checkoutState.subtotal);
    }
  }

  checkoutState.shippingCharge = getCheckoutShippingCharge(checkoutState.shippingMethod, checkoutState.subtotal);
  checkoutState.total = Math.max(0, checkoutState.subtotal - checkoutState.discount + checkoutState.shippingCharge);

  document.getElementById("subtotal").textContent = checkoutFormatPrice(checkoutState.subtotal);
  document.getElementById("shippingAmount").textContent = getCheckoutShippingLabel(checkoutState.shippingCharge);
  document.getElementById("totalAmount").textContent = checkoutFormatPrice(checkoutState.total);

  const discountRow = document.getElementById("discountRow");
  if (checkoutState.discount > 0) {
    discountRow.classList.remove("hidden");
    document.getElementById("discountAmount").textContent = "-" + checkoutFormatPrice(checkoutState.discount);
  } else {
    discountRow.classList.add("hidden");
  }

  const standardShippingPrice = document.getElementById("standardShippingPrice");
  if (standardShippingPrice) {
    standardShippingPrice.textContent = checkoutState.subtotal > 999 ? "FREE" : "₹60.00";
  }

  const shippingHint = document.getElementById("shippingHint");
  if (shippingHint) {
    if (checkoutState.subtotal > 999) {
      shippingHint.textContent = "You unlocked free standard delivery on this order.";
    } else {
      shippingHint.textContent = `Add ${checkoutFormatPrice(1000 - checkoutState.subtotal)} more to unlock free standard delivery.`;
    }
  }

  const shippingSavingsBadge = document.getElementById("shippingSavingsBadge");
  if (shippingSavingsBadge) {
    shippingSavingsBadge.textContent = checkoutState.subtotal > 999 ? "Free standard unlocked" : "Standard may be free";
  }
}

function setCheckoutStep(step) {
  const step1 = document.getElementById("stepAddress");
  const step2 = document.getElementById("stepPayment");
  const progressFill = document.getElementById("progressFill");

  if (!step1 || !step2 || !progressFill) return;

  step1.classList.remove("active", "completed");
  step2.classList.remove("active", "completed");

  if (step === 1) {
    step1.classList.add("active");
    document.getElementById("stepStatus1").textContent = "In Progress";
    document.getElementById("stepStatus2").textContent = "Pending";
    progressFill.style.width = "50%";
  } else {
    step1.classList.add("completed");
    step2.classList.add("active");
    document.getElementById("stepStatus1").textContent = "Done";
    document.getElementById("stepStatus2").textContent = "In Progress";
    progressFill.style.width = "100%";
  }
}

function validateCheckoutDetails() {
  const name = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const mobile = document.getElementById("mobileNumber").value.trim();
  const address = document.getElementById("addressLine").value.trim();
  const city = document.getElementById("city").value.trim();
  const pincode = document.getElementById("pincode").value.trim();
  const state = document.getElementById("state").value.trim();

  if (!name || !email || !mobile || !address || !city || !state || !/^\d{6}$/.test(pincode)) return false;
  if (!/^\d{10}$/.test(mobile)) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;

  return true;
}

function saveCheckoutCustomerDraft() {
  const customer = {
    name: document.getElementById("fullName").value.trim(),
    email: document.getElementById("email").value.trim(),
    mobile: document.getElementById("mobileNumber").value.trim(),
    address: document.getElementById("addressLine").value.trim(),
    landmark: document.getElementById("landmark").value.trim(),
    city: document.getElementById("city").value.trim(),
    pincode: document.getElementById("pincode").value.trim(),
    state: document.getElementById("state").value.trim(),
    shippingMethod: checkoutState.shippingMethod
  };

  sessionStorage.setItem("checkout_customer", JSON.stringify(customer));
  return customer;
}

function showCheckoutPaymentSection() {
  const msgDiv = document.getElementById("detailsMessage");

  if (!validateCheckoutDetails()) {
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Please fill a valid name, email, mobile number and complete delivery address.</div>`;
    return;
  }

  saveCheckoutCustomerDraft();
  document.getElementById("paymentCard").classList.remove("hidden");
  setCheckoutStep(2);
  msgDiv.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> Delivery details saved. Choose shipping and complete payment.</div>`;
}

function applyCheckoutPromo() {
  const code = document.getElementById("promoCode").value.trim().toUpperCase();
  const msgDiv = document.getElementById("promoMessage");

  if (!code) {
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-ticket"></i> Enter a promo code.</div>`;
    return;
  }

  if (!checkoutPromos[code]) {
    checkoutState.appliedPromo = null;
    updateCheckoutTotals();
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Invalid or expired promo code.</div>`;
    return;
  }

  checkoutState.appliedPromo = { code, ...checkoutPromos[code] };
  updateCheckoutTotals();
  document.getElementById("promoCode").value = "";
  msgDiv.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> ${checkoutPromos[code].msg}</div>`;
}

function payCheckoutNow() {
  const paymentMessage = document.getElementById("paymentMessage");

  if (!validateCheckoutDetails()) {
    paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Please complete valid delivery details first.</div>`;
    return;
  }

  if (!cart.length) {
    paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Your cart is empty.</div>`;
    return;
  }

  const customer = saveCheckoutCustomerDraft();
  paymentMessage.innerHTML = `<div class="checkout-alert info"><i class="fas fa-lock"></i> Opening Razorpay checkout...</div>`;

  const options = {
    key: "rzp_test_YourKeyHere",
    amount: Math.round(checkoutState.total * 100),
    currency: "INR",
    name: "MyEssantia",
    description: `Order Payment (${checkoutState.shippingMethod === "express" ? "Express" : "Standard"} Shipping)`,
    image: "https://placehold.co/100x100/dcefe7/1d7a68?text=M",
    handler: async function(response) {
      const orderId = "ESS" + Date.now();

      paymentMessage.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> Payment successful. Order ID: ${orderId}</div>`;

      cart = [];
      saveCartToLocalStorage();

      if (currentUser) {
        await saveCartToFirebase();
      }

      updateCartCount();
      renderCartItems();
      renderCheckoutCart();
      updateCheckoutTotals();

      setTimeout(() => {
        closeCheckout();
        alert(
          "Order Confirmed!\n\n" +
          "Order ID: " + orderId + "\n" +
          "Amount: " + checkoutFormatPrice(checkoutState.total) + "\n" +
          "Shipping: " + (checkoutState.shippingMethod === "express" ? "Express" : "Standard") + "\n" +
          "Payment ID: " + response.razorpay_payment_id + "\n" +
          "Customer: " + customer.name
        );
      }, 800);
    },
    prefill: {
      name: customer.name || "",
      email: customer.email || "",
      contact: customer.mobile || ""
    },
    notes: {
      address: `${customer.address || ""}, ${customer.landmark || ""}, ${customer.city || ""}, ${customer.state || ""} - ${customer.pincode || ""}`,
      shipping_method: checkoutState.shippingMethod
    },
    theme: {
      color: "#1d7a68"
    },
    modal: {
      ondismiss: function() {
        paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Payment popup closed.</div>`;
      }
    }
  };

  const rzp = new Razorpay(options);

  rzp.on("payment.failed", function(response) {
    paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Payment failed: ${response.error.description}</div>`;
  });

  rzp.open();
}

function extractCheckoutAddressData(place) {
  const parts = { city: "", state: "", pincode: "" };
  if (!place || !place.address_components) return parts;

  place.address_components.forEach((component) => {
    const types = component.types || [];
    if (types.includes("postal_code")) parts.pincode = component.long_name;
    if (types.includes("administrative_area_level_1")) parts.state = component.long_name;
    if (types.includes("locality")) parts.city = component.long_name;
    if (!parts.city && types.includes("postal_town")) parts.city = component.long_name;
    if (!parts.city && types.includes("sublocality_level_1")) parts.city = component.long_name;
    if (!parts.city && types.includes("administrative_area_level_2")) parts.city = component.long_name;
  });

  return parts;
}

function fillCheckoutAddress(place) {
  if (!place) return;

  if (place.formatted_address) {
    document.getElementById("addressLine").value = place.formatted_address;
  }

  const data = extractCheckoutAddressData(place);
  if (data.city) document.getElementById("city").value = data.city;
  if (data.state) document.getElementById("state").value = data.state;
  if (data.pincode) document.getElementById("pincode").value = data.pincode;
}

function initCheckoutAutocomplete() {
  const input = document.getElementById("addressLine");
  if (!input || !window.google || !google.maps || !google.maps.places) return;

  checkoutState.autocomplete = new google.maps.places.Autocomplete(input, {
    types: ["address"],
    componentRestrictions: { country: "in" },
    fields: ["formatted_address", "address_components", "geometry", "name"]
  });

  checkoutState.autocomplete.addListener("place_changed", function() {
    fillCheckoutAddress(checkoutState.autocomplete.getPlace());
  });
}

function loadCheckoutGooglePlaces() {
  if (checkoutMapsLoaded || (window.google && google.maps && google.maps.places)) {
    checkoutMapsLoaded = true;
    initCheckoutAutocomplete();
    return;
  }

  window.initCheckoutGooglePlaces = function() {
    checkoutMapsLoaded = true;
    initCheckoutAutocomplete();
  };

  if (document.querySelector('script[data-checkout-google="true"]')) return;

  const script = document.createElement("script");
  script.src = "https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places&callback=initCheckoutGooglePlaces";
  script.async = true;
  script.defer = true;
  script.dataset.checkoutGoogle = "true";
  document.body.appendChild(script);
}

// ========== INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM Content Loaded");

  loadCommonModals().then(() => {
    setupCartButtonListener();
    updateCartCount();
    console.log("Initialization complete");
  });
});

window.addEventListener("load", function() {
  console.log("Window Loaded");

  if (!document.getElementById("cart-modal")) {
    loadCommonModals();
  }

  console.log("Current cart on load:", cart);
});
