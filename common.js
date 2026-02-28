// ========== COMMON JAVASCRIPT FOR MYESSANTIA ==========

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
let cart = JSON.parse(localStorage.getItem('MyEssantia_cart')) || [];
let currentUser = null;
let products = JSON.parse(localStorage.getItem('MyEssantia_products')) || [];

// Sample products if none exist
if (products.length === 0) {
  products = [
    {
      id: 1,
      title: "Premium Leather Wallet",
      category: "Accessories",
      price: 2499,
      rating: 4.5,
      stock: 25,
      showOnHome: true,
      showOnAccessories: true,
      images: [
        "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=1887&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1606503825008-909a67e63c3d?q=80&w=1887&auto=format&fit=crop"
      ],
      primaryImg: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=1887&auto=format&fit=crop",
      secondaryImg: "https://images.unsplash.com/photo-1606503825008-909a67e63c3d?q=80&w=1887&auto=format&fit=crop"
    },
    {
      id: 2,
      title: "Minimalist Watch",
      category: "Watches",
      price: 3999,
      rating: 4.8,
      stock: 12,
      showOnHome: true,
      showOnAccessories: true,
      images: [
        "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=1888&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=1888&auto=format&fit=crop"
      ],
      primaryImg: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=1888&auto=format&fit=crop",
      secondaryImg: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=1888&auto=format&fit=crop"
    },
    {
      id: 3,
      title: "Wireless Earbuds",
      category: "Electronics",
      price: 5999,
      rating: 4.3,
      stock: 8,
      showOnHome: true,
      showOnAccessories: false,
      images: [
        "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?q=80&w=1770&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1606220838315-056192d5e927?q=80&w=1770&auto=format&fit=crop"
      ],
      primaryImg: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?q=80&w=1770&auto=format&fit=crop",
      secondaryImg: "https://images.unsplash.com/photo-1606220838315-056192d5e927?q=80&w=1770&auto=format&fit=crop"
    },
    {
      id: 4,
      title: "Sunglasses",
      category: "Accessories",
      price: 1999,
      rating: 4.6,
      stock: 30,
      showOnHome: true,
      showOnAccessories: true,
      images: [
        "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1780&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1577803645770-f5b7f4c09bf3?q=80&w=1780&auto=format&fit=crop"
      ],
      primaryImg: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1780&auto=format&fit=crop",
      secondaryImg: "https://images.unsplash.com/photo-1577803645770-f5b7f4c09bf3?q=80&w=1780&auto=format&fit=crop"
    },
    {
      id: 5,
      title: "Canvas Tote Bag",
      category: "Accessories",
      price: 1799,
      rating: 4.4,
      stock: 15,
      showOnHome: false,
      showOnAccessories: true,
      images: [
        "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1887&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1591561954557-26941169b8a7?q=80&w=1887&auto=format&fit=crop"
      ],
      primaryImg: "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1887&auto=format&fit=crop",
      secondaryImg: "https://images.unsplash.com/photo-1591561954557-26941169b8a7?q=80&w=1887&auto=format&fit=crop"
    },
    {
      id: 6,
      title: "Brass Keychain",
      category: "Accessories",
      price: 499,
      rating: 4.2,
      stock: 45,
      showOnHome: false,
      showOnAccessories: true,
      images: [
        "https://images.unsplash.com/photo-1600791574155-6b2c31fc07dd?q=80&w=1887&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1578269174936-2709b6aeb913?q=80&w=1887&auto=format&fit=crop"
      ],
      primaryImg: "https://images.unsplash.com/photo-1600791574155-6b2c31fc07dd?q=80&w=1887&auto=format&fit=crop",
      secondaryImg: "https://images.unsplash.com/photo-1578269174936-2709b6aeb913?q=80&w=1887&auto=format&fit=crop"
    },
    {
      id: 7,
      title: "Silk Scarf",
      category: "Accessories",
      price: 1299,
      rating: 4.7,
      stock: 10,
      showOnHome: false,
      showOnAccessories: true,
      images: [
        "https://images.unsplash.com/photo-1584036553516-bf932ce5a0e6?q=80&w=1932&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1602810320073-1230c46df89d?q=80&w=1887&auto=format&fit=crop"
      ],
      primaryImg: "https://images.unsplash.com/photo-1584036553516-bf932ce5a0e6?q=80&w=1932&auto=format&fit=crop",
      secondaryImg: "https://images.unsplash.com/photo-1602810320073-1230c46df89d?q=80&w=1887&auto=format&fit=crop"
    },
    {
      id: 8,
      title: "Leather Gloves",
      category: "Accessories",
      price: 2199,
      rating: 4.5,
      stock: 7,
      showOnHome: false,
      showOnAccessories: true,
      images: [
        "https://images.unsplash.com/photo-1604909052743-94e838986d24?q=80&w=1888&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1516476853904-1d209bf2cf68?q=80&w=1887&auto=format&fit=crop"
      ],
      primaryImg: "https://images.unsplash.com/photo-1604909052743-94e838986d24?q=80&w=1888&auto=format&fit=crop",
      secondaryImg: "https://images.unsplash.com/photo-1516476853904-1d209bf2cf68?q=80&w=1887&auto=format&fit=crop"
    }
  ];
  localStorage.setItem('MyEssantia_products', JSON.stringify(products));
}

// ========== FIREBASE AUTH STATE OBSERVER ==========
auth.onAuthStateChanged((user) => {
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
    updateProfileIcon();
    if (document.getElementById('profile-content')) {
      renderProfileContent();
    }
  } else {
    currentUser = null;
    localStorage.removeItem('MyEssantia_user');
    updateProfileIcon();
    if (document.getElementById('profile-content')) {
      renderProfileContent();
    }
  }
});

// ========== UTILITY FUNCTIONS ==========
function formatPrice(price) {
  return price.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
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

// ========== FALLBACK COMPONENTS ==========
function getFallbackHeader() {
  return `
    <header style="padding: 1rem; background: #fff; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="logo" style="font-family: 'Playfair Display', serif; font-size: 1.8rem;">
          My<span style="color: #d4af37;">Essantia</span>
        </div>
        <div class="header-icons">
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

    setTimeout(() => {
      if (typeof initializeApp === 'function') {
        initializeApp();
      }
      setupEventListeners();
    }, 50);
  } catch (error) {
    console.error('Error loading components:', error);
    document.getElementById('header').innerHTML = getFallbackHeader();
    document.getElementById('footer').innerHTML = getFallbackFooter();
    setTimeout(() => {
      if (typeof initializeApp === 'function') {
        initializeApp();
      }
      setupEventListeners();
    }, 50);
  }
}

// ========== EVENT LISTENERS SETUP ==========
function setupEventListeners() {
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      navMenu.classList.toggle('show');
    });
  }

  const cartIcon = document.getElementById('cart-icon');
  if (cartIcon) {
    cartIcon.addEventListener('click', function(e) {
      e.preventDefault();
      openCart();
    });
  }

  const profileIcon = document.getElementById('profile-icon');
  if (profileIcon) {
    profileIcon.addEventListener('click', function(e) {
      e.preventDefault();
      openProfile();
    });
  }

  const closeCart = document.getElementById('close-cart');
  if (closeCart) {
    closeCart.addEventListener('click', function() {
      closeModal('cart-modal');
    });
  }

  const closeProfile = document.getElementById('close-profile');
  if (closeProfile) {
    closeProfile.addEventListener('click', function() {
      closeModal('profile-modal');
    });
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
      if (!currentUser) {
        alert('Please login to checkout');
        closeModal('cart-modal');
        openProfile();
        return;
      }
      if (cart.length === 0) {
        alert('Your cart is empty!');
      } else {
        alert('Proceeding to checkout...');
      }
    });
  }

  window.addEventListener('click', function(e) {
    const cartModal = document.getElementById('cart-modal');
    const profileModal = document.getElementById('profile-modal');
    
    if (e.target === cartModal) {
      closeModal('cart-modal');
    }
    if (e.target === profileModal) {
      closeModal('profile-modal');
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal('cart-modal');
      closeModal('profile-modal');
    }
  });

  document.addEventListener('click', function(e) {
    if (navMenu && navMenu.classList.contains('show')) {
      if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
        navMenu.classList.remove('show');
      }
    }
  });
}

// ========== MODAL FUNCTIONS ==========
function openCart() {
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) {
    renderCartItems();
    cartModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function openProfile() {
  const profileModal = document.getElementById('profile-modal');
  if (profileModal) {
    renderProfileContent();
    profileModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// ========== CART FUNCTIONS ==========
window.addToCart = function(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

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

  saveCart();
  updateCartCount();
  
  const btn = event?.target?.closest('button');
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> added';
    btn.style.background = '#4CAF50';
    btn.style.color = 'white';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 1500);
  } else {
    alert(`${product.title} added to cart!`);
  }
};

window.buyNow = function(productId) {
  addToCart(productId);
  openCart();
};

window.updateQuantity = function(productId, change) {
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

  saveCart();
  updateCartCount();
  renderCartItems();
};

window.removeFromCart = function(productId) {
  cart = cart.filter
