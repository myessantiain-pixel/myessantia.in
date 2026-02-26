// Enhanced Auth Modal Functionality
import { 
  auth, 
  googleProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from './firebase-config.js';

// State management
let currentUser = null;
let isLoading = false;

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateUIForAuthState(user);
  updateUserMenuContent(user);
});

// Update UI based on authentication state
function updateUIForAuthState(user) {
  const profileIcon = document.querySelector('.header-icons a[aria-label="Profile"]');
  if (!profileIcon) return;
  
  if (user) {
    // User is logged in
    profileIcon.innerHTML = '<i class="fa-solid fa-user-check" style="color: #d4af37;"></i>';
    profileIcon.setAttribute('data-user', 'logged-in');
    profileIcon.setAttribute('title', user.email || 'Profile');
  } else {
    // User is logged out
    profileIcon.innerHTML = '<i class="fa-regular fa-user"></i>';
    profileIcon.removeAttribute('data-user');
    profileIcon.setAttribute('title', 'Login / Signup');
  }
}

// Update user menu content
function updateUserMenuContent(user) {
  const userMenu = document.getElementById('userMenu');
  if (!userMenu) return;
  
  if (user) {
    const header = userMenu.querySelector('.user-menu-header') || document.createElement('div');
    header.className = 'user-menu-header';
    header.innerHTML = `
      <h4>${user.displayName || 'Welcome back!'}</h4>
      <p>${user.email}</p>
    `;
    
    if (!userMenu.querySelector('.user-menu-header')) {
      userMenu.insertBefore(header, userMenu.firstChild);
    }
  }
}

// Show auth modal with animation
export function showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Reset forms
    resetForms();
    
    // Focus first input
    setTimeout(() => {
      const firstInput = document.querySelector('.auth-form.active input');
      if (firstInput) firstInput.focus();
    }, 300);
  }
}

// Hide auth modal with animation
export function hideAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// Reset forms
function resetForms() {
  document.querySelectorAll('.auth-form input').forEach(input => {
    input.value = '';
    input.classList.remove('error');
  });
  
  const messageEl = document.getElementById('authMessage');
  if (messageEl) {
    messageEl.style.display = 'none';
    messageEl.textContent = '';
  }
  
  // Reset password strength
  const strengthBar = document.querySelector('.strength-bar');
  const strengthText = document.querySelector('.strength-text');
  if (strengthBar) {
    strengthBar.className = 'strength-bar';
    strengthBar.style.width = '0';
  }
  if (strengthText) strengthText.textContent = '';
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
  
  // Reset forms
  resetForms();
}

// Show loading state
function setLoading(loading) {
  isLoading = loading;
  const buttons = document.querySelectorAll('.auth-btn, .google-btn');
  buttons.forEach(btn => {
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
}

// Validate email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate password strength
function getPasswordStrength(password) {
  if (!password) return 0;
  
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/)) strength++;
  if (password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;
  
  return strength;
}

// Update password strength indicator
export function updatePasswordStrength(password) {
  const strength = getPasswordStrength(password);
  const strengthBar = document.querySelector('.strength-bar');
  const strengthText = document.querySelector('.strength-text');
  
  if (!strengthBar || !strengthText) return;
  
  if (strength === 0) {
    strengthBar.className = 'strength-bar';
    strengthBar.style.width = '0';
    strengthText.textContent = '';
  } else if (strength <= 2) {
    strengthBar.className = 'strength-bar weak';
    strengthBar.style.width = '33.33%';
    strengthText.textContent = 'Weak password';
    strengthText.style.color = '#e74c3c';
  } else if (strength <= 4) {
    strengthBar.className = 'strength-bar medium';
    strengthBar.style.width = '66.66%';
    strengthText.textContent = 'Medium password';
    strengthText.style.color = '#f39c12';
  } else {
    strengthBar.className = 'strength-bar strong';
    strengthBar.style.width = '100%';
    strengthText.textContent = 'Strong password';
    strengthText.style.color = '#27ae60';
  }
}

// Show message in modal
function showMessage(text, type) {
  const messageEl = document.getElementById('authMessage');
  if (messageEl) {
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 3000);
    }
  }
}

// Email/Password Login
export async function loginWithEmail(email, password) {
  if (!isValidEmail(email)) {
    showMessage('Please enter a valid email address', 'error');
    return;
  }
  
  if (!password) {
    showMessage('Please enter your password', 'error');
    return;
  }
  
  setLoading(true);
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    showMessage('Login successful! Redirecting...', 'success');
    
    setTimeout(() => {
      hideAuthModal();
      // Optional: Redirect or refresh
      if (window.location.pathname === '/login') {
        window.location.href = '/';
      }
    }, 1500);
    
    return userCredential.user;
  } catch (error) {
    let message = 'Login failed. Please try again.';
    if (error.code === 'auth/user-not-found') {
      message = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Incorrect password';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many failed attempts. Please try again later';
    }
    showMessage(message, 'error');
    throw error;
  } finally {
    setLoading(false);
  }
}

// Email/Password Signup
export async function signupWithEmail(email, password, confirmPassword, termsAccepted) {
  if (!isValidEmail(email)) {
    showMessage('Please enter a valid email address', 'error');
    return;
  }
  
  if (password.length < 8) {
    showMessage('Password must be at least 8 characters long', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showMessage('Passwords do not match', 'error');
    return;
  }
  
  if (!termsAccepted) {
    showMessage('Please accept the terms and conditions', 'error');
    return;
  }
  
  const strength = getPasswordStrength(password);
  if (strength < 3) {
    showMessage('Please choose a stronger password', 'error');
    return;
  }
  
  setLoading(true);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name (extract from email)
    await updateProfile(userCredential.user, {
      displayName: email.split('@')[0]
    });
    
    showMessage('Account created successfully! Welcome!', 'success');
    
    setTimeout(() => {
      hideAuthModal();
    }, 1500);
    
    return userCredential.user;
  } catch (error) {
    let message = 'Signup failed. Please try again.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'This email is already registered';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password is too weak';
    }
    showMessage(message, 'error');
    throw error;
  } finally {
    setLoading(false);
  }
}

// Google Sign In
export async function signInWithGoogle() {
  setLoading(true);
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    showMessage('Google sign in successful! Redirecting...', 'success');
    
    setTimeout(() => {
      hideAuthModal();
    }, 1500);
    
    return result.user;
  } catch (error) {
    let message = 'Google sign in failed. Please try again.';
    if (error.code === 'auth/popup-closed-by-user') {
      message = 'Sign in cancelled';
    } else if (error.code === 'auth/popup-blocked') {
      message = 'Pop-up blocked. Please allow pop-ups and try again';
    }
    showMessage(message, 'error');
    throw error;
  } finally {
    setLoading(false);
  }
}

// Password Reset
export async function resetPassword(email) {
  if (!isValidEmail(email)) {
    showMessage('Please enter a valid email address', 'error');
    return;
  }
  
  setLoading(true);
  
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage('Password reset email sent! Check your inbox.', 'success');
  } catch (error) {
    let message = 'Failed to send reset email. Please try again.';
    if (error.code === 'auth/user-not-found') {
      message = 'No account found with this email';
    }
    showMessage(message, 'error');
    throw error;
  } finally {
    setLoading(false);
  }
}

// Logout
export async function logout() {
  try {
    await signOut(auth);
    showMessage('Logged out successfully', 'success');
    hideUserMenu();
    
    // Update UI
    updateUIForAuthState(null);
    
    // Optional: Redirect to home
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  } catch (error) {
    showMessage('Failed to logout. Please try again.', 'error');
    throw error;
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
  const profileIcon = document.querySelector('.header-icons a[aria-label="Profile"]');
  if (profileIcon) {
    profileIcon.addEventListener('click', (e) => {
      e.preventDefault();
      
      if (currentUser) {
        // User is logged in - show user menu
        const rect = profileIcon.getBoundingClientRect();
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
          userMenu.style.top = `${rect.bottom + 10}px`;
          userMenu.style.right = `${window.innerWidth - rect.right}px`;
          showUserMenu();
        }
      } else {
        // User is not logged in - show login modal
        showAuthModal();
      }
    });
  }
  
  // Handle clicks outside user menu to close it
  document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('userMenu');
    const profileIcon = document.querySelector('.header-icons a[aria-label="Profile"]');
    
    if (userMenu && 
        !userMenu.contains(e.target) && 
        !profileIcon?.contains(e.target) &&
        userMenu.classList.contains('show')) {
      hideUserMenu();
    }
  });
  
  // Password strength checker
  const passwordInput = document.getElementById('signupPassword');
  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      updatePasswordStrength(e.target.value);
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuthModal);
