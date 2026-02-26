// Auth Modal Functionality
import { 
  auth, 
  googleProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged 
} from './firebase-config.js';

// State management
let currentUser = null;

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateUIForAuthState(user);
});

// Update UI based on authentication state
function updateUIForAuthState(user) {
  const profileIcon = document.querySelector('.header-icons a[href="#"][aria-label="Profile"]');
  if (!profileIcon) return;
  
  if (user) {
    // User is logged in
    profileIcon.innerHTML = '<i class="fa-solid fa-user-check"></i>';
    profileIcon.setAttribute('data-user', 'logged-in');
    profileIcon.setAttribute('title', user.email || 'Profile');
  } else {
    // User is logged out
    profileIcon.innerHTML = '<i class="fa-regular fa-user"></i>';
    profileIcon.removeAttribute('data-user');
    profileIcon.setAttribute('title', 'Login / Signup');
  }
}

// Show auth modal
export function showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  }
}

// Hide auth modal
export function hideAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = ''; // Restore scrolling
  }
}

// Switch between login and signup tabs
export function switchAuthTab(tabId) {
  // Update tab active states
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  
  // Update form visibility
  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.remove('active');
  });
  document.getElementById(`${tabId}Form`).classList.add('active');
}

// Email/Password Login
export async function loginWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    showMessage('Login successful!', 'success');
    setTimeout(hideAuthModal, 1500);
    return userCredential.user;
  } catch (error) {
    showMessage(error.message, 'error');
    throw error;
  }
}

// Email/Password Signup
export async function signupWithEmail(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    showMessage('Account created successfully!', 'success');
    setTimeout(hideAuthModal, 1500);
    return userCredential.user;
  } catch (error) {
    showMessage(error.message, 'error');
    throw error;
  }
}

// Google Sign In
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    showMessage('Google sign in successful!', 'success');
    setTimeout(hideAuthModal, 1500);
    return result.user;
  } catch (error) {
    showMessage(error.message, 'error');
    throw error;
  }
}

// Logout
export async function logout() {
  try {
    await signOut(auth);
    showMessage('Logged out successfully', 'success');
    hideUserMenu();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// Show message in modal
function showMessage(text, type) {
  const messageEl = document.getElementById('authMessage');
  if (messageEl) {
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
    messageEl.style.display = 'block';
    
    // Hide message after 3 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }
}

// Show user menu
export function showUserMenu() {
  const userMenu = document.getElementById('userMenu');
  if (userMenu) {
    userMenu.classList.add('show');
  }
}

// Hide user menu
export function hideUserMenu() {
  const userMenu = document.getElementById('userMenu');
  if (userMenu) {
    userMenu.classList.remove('show');
  }
}

// Initialize auth modal functionality
export function initAuthModal() {
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('authModal');
    if (e.target === modal) {
      hideAuthModal();
    }
  });
  
  // Close modal with Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAuthModal();
    }
  });
  
  // Handle profile icon click
  const profileIcon = document.querySelector('.header-icons a[href="#"][aria-label="Profile"]');
  if (profileIcon) {
    profileIcon.addEventListener('click', (e) => {
      e.preventDefault();
      
      if (currentUser) {
        // User is logged in - show user menu
        showUserMenu();
      } else {
        // User is not logged in - show login modal
        showAuthModal();
      }
    });
  }
  
  // Handle clicks outside user menu to close it
  document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('userMenu');
    const profileIcon = document.querySelector('.header-icons a[href="#"][aria-label="Profile"]');
    
    if (userMenu && !userMenu.contains(e.target) && !profileIcon?.contains(e.target)) {
      hideUserMenu();
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuthModal);
