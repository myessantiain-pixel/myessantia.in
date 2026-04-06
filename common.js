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

// ========== CHECKOUT STATE ==========
let checkoutLoaded = false;
let checkoutMapsLoaded = false;
let checkoutState = {
  appliedPromo: null,
  subtotal: 0,
  shipping: 0,
  total: 0,
  discount: 0,
  shippingMethod: "standard",
  autocomplete: null
};

const checkoutPromos = {
  WELCOME10: { type: "percent", value: 10, msg: "10% OFF applied!" },
  MYESSANTIA20: { type: "percent", value: 20, msg: "20% OFF applied!" },
  SAVE100: { type: "fixed", value: 100, msg: "₹100 OFF applied!" }
};

const shippingOptions = {
  standard: {
    label: "Standard Shipping",
    fee: 60,
    eta: "3-5 business days"
  },
  express: {
    label: "Express Shipping",
    fee: 140,
    eta: "1-2 business days"
  }
};

// ========== LOAD CART FROM LOCALSTORAGE ON INIT ==========
function loadCartFromLocalStorage() {
  try {
    const savedCart = localStorage.getItem('MyEssantia_cart');
    if (savedCart) {
      cart = JSON.parse(savedCart);
      console.log('Cart loaded from localStorage:', cart);
    } else {
      console.log('No cart found in localStorage');
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    cart = [];
  }
}

// ========== SAVE CART TO LOCALSTORAGE ==========
function saveCartToLocalStorage() {
  try {
    localStorage.setItem('MyEssantia_cart', JSON.stringify(cart));
    console.log('Cart saved to localStorage:', cart);
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}

// Load cart from localStorage immediately when script runs
loadCartFromLocalStorage();

// ========== FIREBASE AUTH STATE OBSERVER ==========
auth.onAuthStateChanged(async (user) => {
  console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
  if (user) {
    currentUser = {
      uid: user.uid,
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      picture: user.photoURL || 'https://via.placeholder.com/80',
      provider: user.providerData[0]?.providerId || 'email',
      memberSince: user.metadata.creationTime
    };

    localStorage.setItem('MyEssantia_user', JSON.stringify(currentUser));

    await loadUserCart(user.uid);
    await loadProducts();

    updateProfileIcon();
    if (document.getElementById('profile-content')) {
      renderProfileContent();
    }

    updateCartCount();
  } else {
    currentUser = null;
    localStorage.removeItem('MyEssantia_user');
    updateProfileIcon();
    if (document.getElementById('profile-content')) {
      renderProfileContent();
    }
  }
});

function initTopBarScroll() {
  const topBarContent = document.querySelector('.top-bar-scroll-content');
  if (!topBarContent) return;

  topBarContent.innerHTML = topBarContent.innerHTML + topBarContent.innerHTML;

  let position = 0;
  const speed = 0.5;

  function scroll() {
    position -= speed;

    if (Math.abs(position) >= topBarContent.scrollWidth / 2) {
      position = 0;
    }

    topBarContent.style.transform = `translateX(${position}px)`;
    requestAnimationFrame(scroll);
  }

  scroll();
}

document.addEventListener('DOMContentLoaded', initTopBarScroll);

// ========== FIREBASE DATA FUNCTIONS ==========
async function loadUserCart(userId) {
  try {
    const cartDoc = await db.collection('carts').doc(userId).get();
    let firebaseCart = [];

    if (cartDoc.exists) {
      firebaseCart = cartDoc.data().items || [];
      console.log('Firebase cart loaded:', firebaseCart);
    }

    if (firebaseCart.length > 0 && cart.length > 0) {
      cart = mergeCarts(cart, firebaseCart);
      console.log('Carts merged:', cart);
    } else if (firebaseCart.length > 0) {
      cart = firebaseCart;
      console.log('Using Firebase cart:', cart);
    }

    saveCartToLocalStorage();
    updateCartCount();
  } catch (error) {
    console.error('Error loading cart:', error);
    updateCartCount();
  }
}

// ========== MERGE CARTS FUNCTION ==========
function mergeCarts(localCart, firebaseCart) {
  const merged = [...firebaseCart];

  localCart.forEach(localItem => {
    const existingItem = merged.find(item => item.id === localItem.id);
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
    await db.collection('carts').doc(currentUser.uid).set({
      items: cart,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('Cart saved to Firebase');
    saveCartToLocalStorage();
  } catch (error) {
    console.error('Error saving cart to Firebase:', error);
    saveCartToLocalStorage();
  }
}

async function loadProducts() {
  try {
    const productsSnapshot = await db.collection('products').get();
    products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Products loaded:', products.length);
    localStorage.setItem('MyEssantia_products', JSON.stringify(products));
  } catch (error) {
    console.error('Error loading products:', error);
    const cached = localStorage.getItem('MyEssantia_products');
    products = cached ? JSON.parse(cached) : [];
    console.log('Products loaded from cache:', products.length);
  }
}

// ========== UTILITY FUNCTIONS ==========
function formatPrice(price) {
  return Number(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function renderRating(rating) {
  let stars = '';
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
  return "₹" + Number(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
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
    const headerResponse = await fetch('header.html');
    const headerData = await headerResponse.text();
    document.getElementById('header').innerHTML = headerData;

    const footerResponse = await fetch('footer.html');
    const footerData = await footerResponse.text();
    document.getElementById('footer').innerHTML = footerData;

    await loadProducts();

    setTimeout(() => {
      if (typeof initializeApp === 'function') {
        initializeApp();
      }
      setupEventListeners();
      updateCartCount();
    }, 50);
  } catch (error) {
    console.error('Error loading components:', error);
    document.getElementById('header').innerHTML = getFallbackHeader();
    document.getElementById('footer').innerHTML = getFallbackFooter();

    const cached = localStorage.getItem('MyEssantia_products');
    products = cached ? JSON.parse(cached) : [];

    setTimeout(() => {
      if (typeof initializeApp === 'function') {
        initializeApp();
      }
      setupEventListeners();
      updateCartCount();
    }, 50);
  }
}

// ========== EVENT LISTENERS SETUP ==========
function setupEventListeners() {
  console.log('Setting up event listeners');

  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileDropdown = document.getElementById('mobileDropdown');
  const mobileMenuClose = document.getElementById('mobileMenuClose');

  if (mobileMenuToggle && mobileDropdown) {
    mobileMenuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      this.classList.toggle('active');
      mobileDropdown.classList.toggle('show');

      if (mobileDropdown.classList.contains('show')) {
        document.body.classList.add('menu-open');
        document.body.style.overflow = 'hidden';
      } else {
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }
    });

    if (mobileMenuClose) {
      mobileMenuClose.addEventListener('click', function() {
        mobileMenuToggle.classList.remove('active');
        mobileDropdown.classList.remove('show');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      });
    }

    const mobileLinks = document.querySelectorAll('.mobile-menu-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuToggle.classList.remove('active');
        mobileDropdown.classList.remove('show');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      });
    });

    document.addEventListener('click', function(e) {
      if (mobileDropdown.classList.contains('show')) {
        if (!mobileDropdown.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
          mobileMenuToggle.classList.remove('active');
          mobileDropdown.classList.remove('show');
          document.body.classList.remove('menu-open');
          document.body.style.overflow = '';
        }
      }
    });
  }

  document.addEventListener('click', function(e) {
    const cartIcon = e.target.closest('#cart-icon');
    if (cartIcon) {
      e.preventDefault();
      openCart();

      if (mobileDropdown && mobileDropdown.classList.contains('show')) {
        mobileMenuToggle?.classList.remove('active');
        mobileDropdown.classList.remove('show');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }
    }
  });

  document.addEventListener('click', function(e) {
    const profileIcon = e.target.closest('#profile-icon');
    if (profileIcon) {
      e.preventDefault();
      openProfile();

      if (mobileDropdown && mobileDropdown.classList.contains('show')) {
        mobileMenuToggle?.classList.remove('active');
        mobileDropdown.classList.remove('show');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }
    }
  });

  document.addEventListener('click', function(e) {
    const searchIcon = e.target.closest('#search-icon');
    if (searchIcon) {
      e.preventDefault();
      openSearch();

      if (mobileDropdown && mobileDropdown.classList.contains('show')) {
        mobileMenuToggle?.classList.remove('active');
        mobileDropdown.classList.remove('show');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }
    }
  });

  setupModalListeners();

  window.addEventListener('click', function(e) {
    const cartModal = document.getElementById('cart-modal');
    const profileModal = document.getElementById('profile-modal');
    const searchModal = document.getElementById('search-modal');
    const checkoutOverlay = document.getElementById('checkout-overlay');

    if (e.target === cartModal) closeModal('cart-modal');
    if (e.target === profileModal) closeModal('profile-modal');
    if (e.target === searchModal) closeModal('search-modal');
    if (e.target === checkoutOverlay) closeCheckout();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (mobileDropdown && mobileDropdown.classList.contains('show')) {
        mobileMenuToggle?.classList.remove('active');
        mobileDropdown.classList.remove('show');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }

      closeModal('cart-modal');
      closeModal('profile-modal');
      closeModal('search-modal');
      closeCheckout();
    }
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      if (mobileDropdown && mobileDropdown.classList.contains('show')) {
        mobileMenuToggle?.classList.remove('active');
        mobileDropdown.classList.remove('show');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }
    }
  });

  setupCartButtonListener();
}

function setupModalListeners() {
  const closeCart = document.getElementById('close-cart');
  if (closeCart) {
    closeCart.addEventListener('click', function(e) {
      e.preventDefault();
      closeModal('cart-modal');
    });
  }

  const closeProfile = document.getElementById('close-profile');
  if (closeProfile) {
    closeProfile.addEventListener('click', function(e) {
      e.preventDefault();
      closeModal('profile-modal');
    });
  }

  const closeSearch = document.getElementById('close-search');
  if (closeSearch) {
    closeSearch.addEventListener('click', function(e) {
      e.preventDefault();
      closeModal('search-modal');
    });
  }

  const searchInput = document.getElementById('search-products-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      renderSearchResults(this.value.trim());
    });
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async function(e) {
      e.preventDefault();

      if (!currentUser) {
        closeModal('cart-modal');
        openProfile();
        return;
      }

      if (cart.length === 0) {
        return;
      }

      saveCartToLocalStorage();
      if (currentUser) {
        try {
          await saveCartToFirebase();
        } catch (error) {
          console.error('Error saving cart before checkout:', error);
        }
      }

      closeModal('cart-modal');
      await openCheckout();
    });
  }
}

// ========== CART BUTTON SETUP (Event Delegation) ==========
function setupCartButtonListener() {
  document.addEventListener('click', function(e) {
    const button = e.target.closest('[data-add-to-cart]');
    if (button) {
      e.preventDefault();
      const productId = button.getAttribute('data-add-to-cart');
      addToCart(productId, button);
    }
  });
}

// ========== MAIN ADD TO CART FUNCTION ==========
window.addToCart = async function(productId, button = null) {
  console.log('Adding to cart:', productId);

  if (!button && event) {
    button = event.target?.closest('button');
  }

  const product = products.find(p => p.id === productId);
  if (!product) {
    console.error('Product not found:', productId);
    return;
  }

  if (product.stock <= 0) {
    alert('Sorry, this product is out of stock!');
    return;
  }

  const existingItem = cart.find(item => item.id === productId);

  if (existingItem) {
    if (existingItem.quantity >= product.stock) {
      alert('Sorry, not enough stock available!');
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
      console.error('Error saving to Firebase:', error);
    }
  }

  updateCartCount();

  if (button) {
    const originalHTML = button.innerHTML;
    const originalBg = button.style.background;
    const originalColor = button.style.color;

    button.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
    button.style.background = '#4CAF50';
    button.style.color = 'white';

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
  window.addToCart(productId, event?.target?.closest('button'));
};

window.buyNow = function(productId) {
  window.addToCart(productId, event?.target?.closest('button'));
};

// ========== CART FUNCTIONS ==========
window.updateQuantity = async function(productId, change) {
  const itemIndex = cart.findIndex(item => item.id === productId);
  if (itemIndex === -1) return;

  const product = products.find(p => p.id === productId);
  const item = cart[itemIndex];
  const newQuantity = item.quantity + change;

  if (newQuantity <= 0) {
    cart.splice(itemIndex, 1);
  } else if (product && newQuantity > product.stock) {
    alert('Sorry, not enough stock available!');
    return;
  } else {
    item.quantity = newQuantity;
  }

  saveCartToLocalStorage();

  if (currentUser) {
    await saveCartToFirebase();
  }

  updateCartCount();

  const cartModal = document.getElementById('cart-modal');
  if (cartModal && cartModal.classList.contains('show')) {
    renderCartItems();
  }

  if (document.getElementById('checkout-overlay')?.classList.contains('active')) {
    renderCheckoutCart();
    updateCheckoutTotals();
  }

  if (document.getElementById('search-modal')?.classList.contains('show')) {
    renderSearchResults(document.getElementById('search-products-input')?.value || '');
  }
};

window.removeFromCart = async function(productId) {
  cart = cart.filter(item => item.id !== productId);

  saveCartToLocalStorage();

  if (currentUser) {
    await saveCartToFirebase();
  }

  updateCartCount();

  const cartModal = document.getElementById('cart-modal');
  if (cartModal && cartModal.classList.contains('show')) {
    renderCartItems();
  }

  if (document.getElementById('checkout-overlay')?.classList.contains('active')) {
    renderCheckoutCart();
    updateCheckoutTotals();
  }
};

function renderCartItems() {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartItemCount = document.getElementById('cart-item-count');
  const cartTotalAmount = document.getElementById('cart-total-amount');

  if (!cartItemsContainer) return;

  if (!cart || cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-message">
        <i class="fa-regular fa-cart-shopping"></i>
        <p>Your cart is empty</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Start shopping to add items!</p>
      </div>
    `;
    if (cartItemCount) cartItemCount.textContent = '0';
    if (cartTotalAmount) cartTotalAmount.textContent = '₹0.00';
    return;
  }

  let total = 0;
  let totalItems = 0;

  const itemsHtml = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    totalItems += item.quantity;

    return `
      <div class="cart-item" data-product-id="${item.id}">
        <div class="cart-item-image" style="background-image: url('${item.primaryImg || 'https://via.placeholder.com/90'}');"></div>
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
  }).join('');

  cartItemsContainer.innerHTML = itemsHtml;

  if (cartItemCount) cartItemCount.textContent = totalItems;
  if (cartTotalAmount) cartTotalAmount.textContent = `₹${formatPrice(total)}`;

  attachCartButtonListeners();
}

function attachCartButtonListeners() {
  document.querySelectorAll('.decrease-qty').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute('data-product-id');
      if (productId) {
        window.updateQuantity(productId, -1);
      }
    });
  });

  document.querySelectorAll('.increase-qty').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute('data-product-id');
      if (productId) {
        window.updateQuantity(productId, 1);
      }
    });
  });

  document.querySelectorAll('.remove-from-cart').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute('data-product-id');
      if (productId) {
        window.removeFromCart(productId);
      }
    });
  });
}

function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
  }
}

// ========== MODAL FUNCTIONS ==========
function openCart() {
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) {
    renderCartItems();
    cartModal.style.display = 'flex';
    cartModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  } else {
    loadCommonModals().then(() => {
      setTimeout(() => {
        const modal = document.getElementById('cart-modal');
        if (modal) {
          renderCartItems();
          modal.style.display = 'flex';
          modal.classList.add('show');
          document.body.style.overflow = 'hidden';
        }
      }, 100);
    });
  }
}

function openProfile() {
  const profileModal = document.getElementById('profile-modal');
  if (profileModal) {
    renderProfileContent();
    profileModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  } else {
    loadCommonModals().then(() => {
      setTimeout(() => {
        const modal = document.getElementById('profile-modal');
        if (modal) {
          renderProfileContent();
          modal.classList.add('show');
          document.body.style.overflow = 'hidden';
        }
      }, 100);
    });
  }
}

async function openSearch() {
  if (!products.length) {
    await loadProducts();
  }

  const searchModal = document.getElementById('search-modal');
  if (searchModal) {
    searchModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    renderSearchResults('');
    setTimeout(() => {
      document.getElementById('search-products-input')?.focus();
    }, 80);
  } else {
    await loadCommonModals();
    setTimeout(() => {
      document.getElementById('search-modal')?.classList.add('show');
      document.body.style.overflow = 'hidden';
      renderSearchResults('');
      document.getElementById('search-products-input')?.focus();
    }, 100);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = '';
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

window.openCart = openCart;
window.closeModal = closeModal;

// ========== SEARCH FUNCTIONS ==========
function renderSearchResults(query = '') {
  const results = document.getElementById('search-results');
  if (!results) return;

  const normalized = query.trim().toLowerCase();
  const filtered = products.filter(product => {
    const title = (product.title || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
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

  results.innerHTML = filtered.map(product => `
    <div class="search-product-card">
      <div class="search-product-image" style="background-image:url('${product.primaryImg || (product.images && product.images[0]) || 'https://via.placeholder.com/120'}')"></div>
      <div class="search-product-info">
        <h4>${product.title || 'Untitled Product'}</h4>
        <div class="search-product-meta">${product.category || 'Category'}</div>
        <div class="search-product-price">₹${formatPrice(product.price || 0)}</div>
      </div>
      <div class="search-product-action">
        <button class="search-add-btn" data-add-to-cart="${product.id}">
          <i class="fa-solid fa-bag-shopping"></i> Add to Cart
        </button>
      </div>
    </div>
  `).join('');
}

// ========== LOAD COMMON MODALS ==========
async function loadCommonModals() {
  try {
    if (document.getElementById('cart-modal')) {
      return;
    }

    const response = await fetch('common.html');
    const data = await response.text();
    document.getElementById('common-modals').innerHTML = data;

    setTimeout(() => {
      setupModalListeners();
    }, 100);
  } catch (error) {
    console.error('Error loading modals:', error);
  }
}

// ========== PROFILE FUNCTIONS ==========
function renderProfileContent() {
  const profileContent = document.getElementById('profile-content');
  if (!profileContent) return;

  if (currentUser) {
    profileContent.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar">
          <img src="${currentUser.picture || 'https://via.placeholder.com/150'}"
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
      await db.collection('users').doc(result.user.uid).set({
        name: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    closeModal('profile-modal');
  } catch (error) {
    console.error('Google login error:', error);
    let errorMessage = 'Google login failed. Please try again.';
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Login cancelled.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup was blocked by your browser.';
    }
    alert(errorMessage);
  }
};

window.logout = async function() {
  try {
    await auth.signOut();
    closeModal('profile-modal');
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
};

function updateProfileIcon() {
  const profileIcon = document.getElementById('profile-icon');
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
  const topBarContent = document.querySelector('.top-bar-scroll-content');
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

  const valueStripScroll = document.querySelector('.value-strip-scroll');
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

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initInfiniteScroll, 100);
});

// ========== CHECKOUT DYNAMIC MODAL ==========
function getCheckoutMarkup() {
  return `
    <div id="checkout-overlay" class="checkout-overlay">
      <div class="checkout-shell">
        <button id="close-checkout-modal" class="checkout-close-btn" aria-label="Close checkout">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="checkout-header">
          <div>
            <div class="checkout-kicker">Secure Checkout</div>
            <h2>Complete your order</h2>
            <p>Fast delivery, clean summary, and easy payment.</p>
          </div>
          <div class="checkout-badge">
            <i class="fa-solid fa-shield-heart"></i>
            100% secure
          </div>
        </div>

        <div class="checkout-progress">
          <div class="checkout-progress-track">
            <div id="progressFill" class="checkout-progress-fill"></div>
          </div>
          <div class="checkout-steps">
            <div id="stepAddress" class="checkout-step active">
              <div class="checkout-step-number">1</div>
              <div>
                <div class="checkout-step-title">Delivery Address</div>
                <div id="stepStatus1" class="checkout-step-status">In Progress</div>
              </div>
            </div>
            <div id="stepShippingPayment" class="checkout-step">
              <div class="checkout-step-number">2</div>
              <div>
                <div class="checkout-step-title">Shipping & Payment</div>
                <div id="stepStatus2" class="checkout-step-status">Pending</div>
              </div>
            </div>
          </div>
        </div>

        <div class="checkout-layout">
          <div class="checkout-main">
            <div id="detailsCard" class="checkout-card">
              <div class="checkout-card-head">
                <h3>Delivery details</h3>
                <span>Where should we send your order?</span>
              </div>

              <div id="detailsMessage"></div>

              <div class="checkout-grid two">
                <div class="checkout-field">
                  <label for="fullName">Full name</label>
                  <input type="text" id="fullName" placeholder="Enter your full name">
                </div>
                <div class="checkout-field">
                  <label for="email">Email address</label>
                  <input type="email" id="email" placeholder="Enter your email">
                </div>
              </div>

              <div class="checkout-grid two">
                <div class="checkout-field">
                  <label for="mobileInput">Mobile number</label>
                  <input type="tel" id="mobileInput" maxlength="10" placeholder="10-digit mobile number">
                </div>
                <div class="checkout-field">
                  <label for="altPhone">Alternate mobile number</label>
                  <input type="tel" id="altPhone" maxlength="10" placeholder="Alternate mobile number">
                </div>
              </div>

              <div class="checkout-field">
                <label for="addressLine">Address</label>
                <input type="text" id="addressLine" placeholder="House no, street, area">
              </div>

              <div class="checkout-field">
                <label for="landmark">Landmark</label>
                <input type="text" id="landmark" placeholder="Nearby landmark">
              </div>

              <div class="checkout-grid three">
                <div class="checkout-field">
                  <label for="city">City</label>
                  <input type="text" id="city" placeholder="City">
                </div>
                <div class="checkout-field">
                  <label for="state">State</label>
                  <input type="text" id="state" placeholder="State">
                </div>
                <div class="checkout-field">
                  <label for="pincode">Pincode</label>
                  <input type="text" id="pincode" maxlength="6" placeholder="Pincode">
                </div>
              </div>

              <button id="continueToShippingBtn" class="checkout-primary-btn">
                Continue to shipping & payment
              </button>
            </div>

            <div id="shippingPaymentCard" class="checkout-card hidden">
              <div class="checkout-card-head">
                <h3>Shipping method</h3>
                <span>Choose how quickly you want your order.</span>
              </div>

              <div id="shippingMessage"></div>

              <div class="shipping-options">
                <label class="shipping-option-card active" data-shipping-card="standard">
                  <input type="radio" name="shippingMethod" value="standard" checked>
                  <div class="shipping-option-main">
                    <div>
                      <div class="shipping-option-title">Standard Shipping</div>
                      <div class="shipping-option-sub">3-5 business days</div>
                    </div>
                    <div id="standardShippingPrice" class="shipping-option-price">₹60.00</div>
                  </div>
                  <div class="shipping-option-note">Free on orders above ₹999</div>
                </label>

                <label class="shipping-option-card" data-shipping-card="express">
                  <input type="radio" name="shippingMethod" value="express">
                  <div class="shipping-option-main">
                    <div>
                      <div class="shipping-option-title">Express Shipping</div>
                      <div class="shipping-option-sub">1-2 business days</div>
                    </div>
                    <div class="shipping-option-price">₹140.00</div>
                  </div>
                  <div class="shipping-option-note">Priority dispatch for faster delivery</div>
                </label>
              </div>

              <div class="checkout-card-head" style="margin-top: 1.5rem;">
                <h3>Promo code</h3>
                <span>Have an offer code? Apply it here.</span>
              </div>

              <div class="checkout-inline">
                <input type="text" id="promoCode" placeholder="Enter promo code">
                <button id="applyPromoBtn" class="checkout-secondary-btn">Apply</button>
              </div>

              <div id="promoMessage"></div>

              <div class="checkout-card-head" style="margin-top: 1.5rem;">
                <h3>Payment</h3>
                <span>Pay securely with Razorpay.</span>
              </div>

              <div class="payment-method-card">
                <div class="payment-method-icon">
                  <i class="fa-solid fa-credit-card"></i>
                </div>
                <div>
                  <div class="payment-method-title">Razorpay Secure Checkout</div>
                  <div class="payment-method-sub">Cards, UPI, wallets, and net banking</div>
                </div>
              </div>

              <div id="paymentMessage"></div>

              <div class="checkout-actions">
                <button id="backToAddressBtn" class="checkout-ghost-btn">Back</button>
                <button id="payNowBtn" class="checkout-primary-btn">Pay now</button>
              </div>
            </div>
          </div>

          <div class="checkout-sidebar">
            <div class="checkout-summary-card">
              <div class="checkout-summary-head">
                <h3>Order summary</h3>
                <span id="checkoutItemsBadge">0 products</span>
              </div>

              <div id="checkoutCartItemsContainer" class="checkout-cart-items"></div>

              <div class="checkout-summary-divider"></div>

              <div class="checkout-total-row">
                <span>Subtotal</span>
                <span id="subtotal">₹0.00</span>
              </div>

              <div id="discountRow" class="checkout-total-row hidden">
                <span>Discount</span>
                <span id="discountAmount">-₹0.00</span>
              </div>

              <div class="checkout-total-row">
                <span>Shipping</span>
                <span id="shippingAmount">₹0.00</span>
              </div>

              <div id="freeShippingNote" class="checkout-shipping-note hidden">
                Standard shipping is free on this order.
              </div>

              <div class="checkout-summary-divider"></div>

              <div class="checkout-grand-total">
                <span>Total</span>
                <span id="totalAmount">₹0.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .checkout-overlay {
        position: fixed;
        inset: 0;
        background: rgba(9, 14, 22, 0.72);
        backdrop-filter: blur(8px);
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }

      .checkout-overlay.active {
        display: flex;
      }

      .checkout-shell {
        width: min(1180px, 100%);
        max-height: 94vh;
        overflow-y: auto;
        background: linear-gradient(180deg, #fffefb 0%, #ffffff 100%);
        border-radius: 28px;
        position: relative;
        box-shadow: 0 25px 80px rgba(16, 24, 40, 0.22);
        padding: 1.5rem;
      }

      .checkout-close-btn {
        position: absolute;
        top: 18px;
        right: 18px;
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 50%;
        background: #f4f6f8;
        color: #0f172a;
        cursor: pointer;
        font-size: 1.1rem;
      }

      .checkout-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        margin-bottom: 1.4rem;
        padding-right: 3.5rem;
      }

      .checkout-kicker {
        font-size: 0.82rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #0f766e;
        font-weight: 700;
        margin-bottom: 0.45rem;
      }

      .checkout-header h2 {
        margin: 0;
        font-size: 2rem;
        color: #111827;
      }

      .checkout-header p {
        margin: 0.45rem 0 0;
        color: #64748b;
      }

      .checkout-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: #ecfdf5;
        color: #047857;
        padding: 0.8rem 1rem;
        border-radius: 999px;
        font-weight: 600;
        white-space: nowrap;
      }

      .checkout-progress {
        background: #fff;
        border: 1px solid #eef2f7;
        border-radius: 22px;
        padding: 1rem 1rem 1.1rem;
        margin-bottom: 1.4rem;
      }

      .checkout-progress-track {
        height: 10px;
        background: #e5e7eb;
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 1rem;
      }

      .checkout-progress-fill {
        height: 100%;
        width: 22%;
        background: linear-gradient(90deg, #0f766e, #14b8a6);
        border-radius: inherit;
        transition: width 0.25s ease;
      }

      .checkout-steps {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
      }

      .checkout-step {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.9rem 1rem;
        border-radius: 18px;
        border: 1px solid #e5e7eb;
        background: #f8fafc;
      }

      .checkout-step.active {
        border-color: rgba(20, 184, 166, 0.35);
        background: rgba(240, 253, 250, 0.95);
      }

      .checkout-step.completed {
        border-color: rgba(16, 185, 129, 0.28);
        background: rgba(236, 253, 245, 0.9);
      }

      .checkout-step-number {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #0f172a;
      }

      .checkout-step.active .checkout-step-number,
      .checkout-step.completed .checkout-step-number {
        background: linear-gradient(135deg, #0f766e, #14b8a6);
        color: #fff;
      }

      .checkout-step-title {
        font-weight: 700;
        color: #0f172a;
      }

      .checkout-step-status {
        color: #64748b;
        font-size: 0.92rem;
        margin-top: 0.15rem;
      }

      .checkout-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.9fr);
        gap: 1.25rem;
      }

      .checkout-card,
      .checkout-summary-card {
        background: #fff;
        border: 1px solid #edf2f7;
        border-radius: 24px;
        padding: 1.25rem;
        box-shadow: 0 10px 35px rgba(15, 23, 42, 0.04);
      }

      .checkout-card-head {
        margin-bottom: 1rem;
      }

      .checkout-card-head h3,
      .checkout-summary-head h3 {
        margin: 0;
        color: #111827;
        font-size: 1.15rem;
      }

      .checkout-card-head span,
      .checkout-summary-head span {
        display: block;
        margin-top: 0.28rem;
        color: #64748b;
        font-size: 0.94rem;
      }

      .checkout-grid {
        display: grid;
        gap: 0.9rem;
      }

      .checkout-grid.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .checkout-grid.three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .checkout-field {
        display: flex;
        flex-direction: column;
        gap: 0.42rem;
        margin-bottom: 0.95rem;
      }

      .checkout-field label {
        font-size: 0.92rem;
        font-weight: 600;
        color: #334155;
      }

      .checkout-field input {
        height: 50px;
        border-radius: 14px;
        border: 1px solid #dbe2ea;
        padding: 0 0.95rem;
        font-size: 0.98rem;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        background: #fff;
      }

      .checkout-field input:focus,
      .checkout-inline input:focus {
        outline: none;
        border-color: #14b8a6;
        box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
      }

      .checkout-inline {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.75rem;
        margin-bottom: 0.9rem;
      }

      .checkout-inline input {
        height: 50px;
        border-radius: 14px;
        border: 1px solid #dbe2ea;
        padding: 0 0.95rem;
        font-size: 0.98rem;
      }

      .checkout-primary-btn,
      .checkout-secondary-btn,
      .checkout-ghost-btn {
        border: none;
        cursor: pointer;
        border-radius: 14px;
        font-weight: 700;
        transition: transform 0.15s ease, opacity 0.15s ease;
      }

      .checkout-primary-btn:hover,
      .checkout-secondary-btn:hover,
      .checkout-ghost-btn:hover {
        transform: translateY(-1px);
      }

      .checkout-primary-btn {
        width: 100%;
        min-height: 52px;
        background: linear-gradient(135deg, #0f766e, #14b8a6);
        color: #fff;
        padding: 0.95rem 1rem;
      }

      .checkout-secondary-btn {
        min-width: 110px;
        min-height: 50px;
        background: #0f172a;
        color: #fff;
        padding: 0 1rem;
      }

      .checkout-ghost-btn {
        min-height: 52px;
        padding: 0.95rem 1.25rem;
        background: #f1f5f9;
        color: #0f172a;
      }

      .checkout-actions {
        display: grid;
        grid-template-columns: 130px 1fr;
        gap: 0.75rem;
        margin-top: 1.25rem;
      }

      .shipping-options {
        display: grid;
        gap: 0.85rem;
      }

      .shipping-option-card {
        display: block;
        border: 1px solid #dbe5ec;
        border-radius: 18px;
        padding: 1rem;
        background: #fbfdff;
        cursor: pointer;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }

      .shipping-option-card.active {
        border-color: #14b8a6;
        background: #f0fdfa;
        box-shadow: 0 10px 24px rgba(20, 184, 166, 0.12);
      }

      .shipping-option-card input {
        display: none;
      }

      .shipping-option-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }

      .shipping-option-title {
        font-weight: 700;
        color: #111827;
      }

      .shipping-option-sub,
      .shipping-option-note {
        color: #64748b;
        font-size: 0.92rem;
      }

      .shipping-option-note {
        margin-top: 0.35rem;
      }

      .shipping-option-price {
        font-weight: 800;
        color: #0f766e;
      }

      .payment-method-card {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        border: 1px solid #dbe5ec;
        border-radius: 18px;
        padding: 1rem;
        background: #fcfffe;
      }

      .payment-method-icon {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        background: linear-gradient(135deg, #0f766e, #14b8a6);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .payment-method-title {
        font-weight: 700;
        color: #111827;
      }

      .payment-method-sub {
        color: #64748b;
        font-size: 0.92rem;
      }

      .checkout-summary-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .checkout-cart-items {
        display: grid;
        gap: 0.8rem;
        max-height: 360px;
        overflow-y: auto;
      }

      .checkout-cart-item {
        display: grid;
        grid-template-columns: 58px 1fr auto;
        gap: 0.75rem;
        align-items: center;
      }

      .checkout-thumb {
        width: 58px;
        height: 58px;
        border-radius: 16px;
        background-size: cover;
        background-position: center;
        background-color: #f8fafc;
      }

      .checkout-item-name {
        font-weight: 700;
        color: #111827;
        font-size: 0.95rem;
      }

      .checkout-item-sub {
        color: #64748b;
        font-size: 0.88rem;
        margin-top: 0.15rem;
      }

      .checkout-item-price {
        font-weight: 700;
        color: #111827;
        white-space: nowrap;
      }

      .checkout-summary-divider {
        height: 1px;
        background: #ecf0f4;
        margin: 1rem 0;
      }

      .checkout-total-row,
      .checkout-grand-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.8rem;
        color: #334155;
      }

      .checkout-grand-total {
        margin-bottom: 0;
        font-size: 1.12rem;
        font-weight: 800;
        color: #0f172a;
      }

      .checkout-shipping-note {
        margin: -0.2rem 0 0.9rem;
        color: #047857;
        font-size: 0.9rem;
        background: #ecfdf5;
        border-radius: 12px;
        padding: 0.7rem 0.85rem;
      }

      .checkout-alert {
        border-radius: 14px;
        padding: 0.9rem 1rem;
        margin-bottom: 1rem;
        font-size: 0.94rem;
      }

      .checkout-alert.success {
        background: #ecfdf5;
        color: #047857;
      }

      .checkout-alert.error {
        background: #fef2f2;
        color: #b91c1c;
      }

      .checkout-alert.info {
        background: #eff6ff;
        color: #1d4ed8;
      }

      .hidden {
        display: none !important;
      }

      @media (max-width: 991px) {
        .checkout-layout {
          grid-template-columns: 1fr;
        }

        .checkout-shell {
          padding: 1rem;
          border-radius: 22px;
        }
      }

      @media (max-width: 767px) {
        .checkout-header {
          flex-direction: column;
          padding-right: 3rem;
        }

        .checkout-steps,
        .checkout-grid.two,
        .checkout-grid.three,
        .checkout-actions,
        .checkout-inline {
          grid-template-columns: 1fr;
        }

        .checkout-step {
          padding: 0.8rem;
        }

        .checkout-header h2 {
          font-size: 1.55rem;
        }
      }
    </style>
  `;
}

async function ensureCheckoutLoaded() {
  if (checkoutLoaded && document.getElementById('checkout-overlay')) return;

  const root = document.getElementById('checkout-modal-root');
  if (!root) return;

  root.innerHTML = getCheckoutMarkup();
  checkoutLoaded = true;
  bindCheckoutEvents();
  loadCheckoutGooglePlaces();
}

function bindCheckoutEvents() {
  document.getElementById('close-checkout-modal')?.addEventListener('click', closeCheckout);
  document.getElementById('continueToShippingBtn')?.addEventListener('click', showCheckoutShippingPaymentSection);
  document.getElementById('applyPromoBtn')?.addEventListener('click', applyCheckoutPromo);
  document.getElementById('payNowBtn')?.addEventListener('click', payCheckoutNow);
  document.getElementById('backToAddressBtn')?.addEventListener('click', function() {
    document.getElementById('shippingPaymentCard')?.classList.add('hidden');
    document.getElementById('detailsCard')?.classList.remove('hidden');
    setCheckoutStep(1);
  });

  document.querySelectorAll('input[name="shippingMethod"]').forEach(input => {
    input.addEventListener('change', function() {
      checkoutState.shippingMethod = this.value;
      updateShippingSelectionUI();
      updateCheckoutTotals();
    });
  });
}

async function openCheckout() {
  await ensureCheckoutLoaded();
  resetCheckout();
  const overlay = document.getElementById('checkout-overlay');
  if (!overlay) return;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  const overlay = document.getElementById('checkout-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;

function resetCheckout() {
  checkoutState.appliedPromo = null;
  checkoutState.subtotal = 0;
  checkoutState.shipping = 0;
  checkoutState.total = 0;
  checkoutState.discount = 0;
  checkoutState.shippingMethod = "standard";

  const savedUser = currentUser || JSON.parse(localStorage.getItem('MyEssantia_user') || 'null');

  document.getElementById('fullName').value = savedUser?.name || '';
  document.getElementById('email').value = savedUser?.email || '';
  document.getElementById('mobileInput').value = '';
  document.getElementById('altPhone').value = '';
  document.getElementById('addressLine').value = '';
  document.getElementById('landmark').value = '';
  document.getElementById('city').value = '';
  document.getElementById('pincode').value = '';
  document.getElementById('state').value = '';
  document.getElementById('promoCode').value = '';

  document.getElementById('detailsMessage').innerHTML = '';
  document.getElementById('shippingMessage').innerHTML = '';
  document.getElementById('promoMessage').innerHTML = '';
  document.getElementById('paymentMessage').innerHTML = '';

  document.getElementById('detailsCard').classList.remove('hidden');
  document.getElementById('shippingPaymentCard').classList.add('hidden');

  const standardInput = document.querySelector('input[name="shippingMethod"][value="standard"]');
  if (standardInput) {
    standardInput.checked = true;
  }

  renderCheckoutCart();
  updateShippingSelectionUI();
  updateCheckoutTotals();
  setCheckoutStep(1);
  initCheckoutAutocomplete();
}

function renderCheckoutCart() {
  const container = document.getElementById('checkoutCartItemsContainer');
  const badge = document.getElementById('checkoutItemsBadge');
  if (!container || !badge) return;

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = `${itemCount} product${itemCount > 1 ? 's' : ''}`;

  if (!cart.length) {
    container.innerHTML = `<div class="checkout-alert info"><i class="fas fa-bag-shopping"></i> Your cart is empty.</div>`;
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="checkout-cart-item">
      <div class="checkout-thumb" style="background-image:url('${item.primaryImg || 'https://via.placeholder.com/200'}')"></div>
      <div>
        <div class="checkout-item-name">${item.title}</div>
        <div class="checkout-item-sub">Qty ${item.quantity}</div>
      </div>
      <div class="checkout-item-price">${checkoutFormatPrice(item.price * item.quantity)}</div>
    </div>
  `).join('');
}

function getShippingCharge() {
  if (checkoutState.shippingMethod === 'standard') {
    return checkoutState.subtotal > 999 ? 0 : shippingOptions.standard.fee;
  }
  return shippingOptions.express.fee;
}

function updateShippingSelectionUI() {
  document.querySelectorAll('.shipping-option-card').forEach(card => {
    const value = card.getAttribute('data-shipping-card');
    card.classList.toggle('active', value === checkoutState.shippingMethod);
  });

  const standardShippingPrice = document.getElementById('standardShippingPrice');
  if (standardShippingPrice) {
    standardShippingPrice.textContent = checkoutState.subtotal > 999 ? 'FREE' : checkoutFormatPrice(shippingOptions.standard.fee);
  }
}

function updateCheckoutTotals() {
  checkoutState.subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  checkoutState.discount = 0;

  if (checkoutState.appliedPromo && checkoutPromos[checkoutState.appliedPromo.code]) {
    const promo = checkoutPromos[checkoutState.appliedPromo.code];
    if (promo.type === 'percent') {
      checkoutState.discount = checkoutState.subtotal * promo.value / 100;
    } else {
      checkoutState.discount = Math.min(promo.value, checkoutState.subtotal);
    }
  }

  checkoutState.shipping = getShippingCharge();
  checkoutState.total = Math.max(0, checkoutState.subtotal - checkoutState.discount + checkoutState.shipping);

  document.getElementById('subtotal').textContent = checkoutFormatPrice(checkoutState.subtotal);
  document.getElementById('shippingAmount').textContent = checkoutState.shipping === 0 ? 'FREE' : checkoutFormatPrice(checkoutState.shipping);
  document.getElementById('totalAmount').textContent = checkoutFormatPrice(checkoutState.total);

  const discountRow = document.getElementById('discountRow');
  if (checkoutState.discount > 0) {
    discountRow.classList.remove('hidden');
    document.getElementById('discountAmount').textContent = '-' + checkoutFormatPrice(checkoutState.discount);
  } else {
    discountRow.classList.add('hidden');
  }

  const freeShippingNote = document.getElementById('freeShippingNote');
  if (checkoutState.shippingMethod === 'standard' && checkoutState.shipping === 0 && checkoutState.subtotal > 999) {
    freeShippingNote.classList.remove('hidden');
  } else {
    freeShippingNote.classList.add('hidden');
  }

  updateShippingSelectionUI();
}

function setCheckoutStep(step) {
  const config = {
    1: { s1: 'In Progress', s2: 'Pending', p: '48%', active: ['stepAddress'], completed: [] },
    2: { s1: 'Done', s2: 'In Progress', p: '100%', active: ['stepShippingPayment'], completed: ['stepAddress'] }
  };

  const state = config[step];

  ['stepAddress', 'stepShippingPayment'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (state.active.includes(id)) el.classList.add('active');
    if (state.completed.includes(id)) el.classList.add('completed');
  });

  document.getElementById('stepStatus1').textContent = state.s1;
  document.getElementById('stepStatus2').textContent = state.s2;
  document.getElementById('progressFill').style.width = state.p;
}

function validateCheckoutDetails() {
  const name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const mobile = document.getElementById('mobileInput').value.trim();
  const altPhone = document.getElementById('altPhone').value.trim();
  const address = document.getElementById('addressLine').value.trim();
  const city = document.getElementById('city').value.trim();
  const pincode = document.getElementById('pincode').value.trim();
  const state = document.getElementById('state').value.trim();

  if (!name || !email || !mobile || !address || !city || !state || !/^\d{6}$/.test(pincode)) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (!/^\d{10}$/.test(mobile)) return false;
  if (altPhone && !/^\d{10}$/.test(altPhone)) return false;

  return true;
}

function showCheckoutShippingPaymentSection() {
  const msgDiv = document.getElementById('detailsMessage');

  if (!validateCheckoutDetails()) {
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Please fill all required delivery details correctly.</div>`;
    return;
  }

  sessionStorage.setItem('checkout_customer', JSON.stringify({
    name: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim(),
    address: document.getElementById('addressLine').value.trim(),
    landmark: document.getElementById('landmark').value.trim(),
    city: document.getElementById('city').value.trim(),
    pincode: document.getElementById('pincode').value.trim(),
    state: document.getElementById('state').value.trim(),
    mobile: document.getElementById('mobileInput').value.trim(),
    altPhone: document.getElementById('altPhone').value.trim(),
    shippingMethod: checkoutState.shippingMethod
  }));

  document.getElementById('detailsCard').classList.add('hidden');
  document.getElementById('shippingPaymentCard').classList.remove('hidden');
  setCheckoutStep(2);
  msgDiv.innerHTML = '';
}

function applyCheckoutPromo() {
  const code = document.getElementById('promoCode').value.trim().toUpperCase();
  const msgDiv = document.getElementById('promoMessage');

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
  document.getElementById('promoCode').value = '';
  msgDiv.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> ${checkoutPromos[code].msg}</div>`;
}

function payCheckoutNow() {
  const paymentMessage = document.getElementById('paymentMessage');

  if (!validateCheckoutDetails()) {
    paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Please complete valid delivery details first.</div>`;
    return;
  }

  const customer = JSON.parse(sessionStorage.getItem('checkout_customer') || '{}');
  customer.shippingMethod = checkoutState.shippingMethod;
  sessionStorage.setItem('checkout_customer', JSON.stringify(customer));

  paymentMessage.innerHTML = `<div class="checkout-alert info"><i class="fas fa-lock"></i> Opening Razorpay checkout...</div>`;

  const options = {
    key: "rzp_test_YourKeyHere",
    amount: Math.round(checkoutState.total * 100),
    currency: "INR",
    name: "MyEssantia",
    description: `${shippingOptions[checkoutState.shippingMethod].label} Payment`,
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

      setTimeout(() => {
        closeCheckout();
        alert(
          "Order Confirmed!\n\n" +
          "Order ID: " + orderId + "\n" +
          "Amount: " + checkoutFormatPrice(checkoutState.total) + "\n" +
          "Shipping: " + shippingOptions[checkoutState.shippingMethod].label + "\n" +
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
      shipping_method: shippingOptions[checkoutState.shippingMethod].label,
      address: `${customer.address || ""}, ${customer.landmark || ""}, ${customer.city || ""}, ${customer.state || ""} - ${customer.pincode || ""}`
    },
    theme: {
      color: "#0f766e"
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
  const parts = { city: '', state: '', pincode: '' };
  if (!place || !place.address_components) return parts;

  place.address_components.forEach(component => {
    const types = component.types || [];
    if (types.includes('postal_code')) parts.pincode = component.long_name;
    if (types.includes('administrative_area_level_1')) parts.state = component.long_name;
    if (types.includes('locality')) parts.city = component.long_name;
    if (!parts.city && types.includes('postal_town')) parts.city = component.long_name;
    if (!parts.city && types.includes('sublocality_level_1')) parts.city = component.long_name;
    if (!parts.city && types.includes('administrative_area_level_2')) parts.city = component.long_name;
  });

  return parts;
}

function fillCheckoutAddress(place) {
  if (!place) return;

  if (place.formatted_address) {
    document.getElementById('addressLine').value = place.formatted_address;
  }

  const data = extractCheckoutAddressData(place);
  if (data.city) document.getElementById('city').value = data.city;
  if (data.state) document.getElementById('state').value = data.state;
  if (data.pincode) document.getElementById('pincode').value = data.pincode;
}

function initCheckoutAutocomplete() {
  const input = document.getElementById('addressLine');
  if (!input || !window.google || !google.maps || !google.maps.places) return;

  checkoutState.autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['address'],
    componentRestrictions: { country: 'in' },
    fields: ['formatted_address', 'address_components', 'geometry', 'name']
  });

  checkoutState.autocomplete.addListener('place_changed', function() {
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

  const script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places&callback=initCheckoutGooglePlaces';
  script.async = true;
  script.defer = true;
  script.dataset.checkoutGoogle = 'true';
  document.body.appendChild(script);
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded');

  loadCommonModals().then(() => {
    setupCartButtonListener();
    updateCartCount();
    console.log('Initialization complete');
  });
});

window.addEventListener('load', function() {
  console.log('Window Loaded');

  if (!document.getElementById('cart-modal')) {
    loadCommonModals();
  }

  console.log('Current cart on load:', cart);
});
