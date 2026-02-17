/**
 * Password Authentication System
 * Simple client-side password protection for Stefano & Yeşim's Journal
 */

const AUTH_CONFIG = {
    PASSWORD_HASH: 'd189207d8c301d34c4591d10088848f04790f62753b8795670c2ec42e2b388ad',
    STORAGE_KEY: 'journal_authenticated'
};

/**
 * Initialize password protection
 */
function initPasswordProtection() {
    // Check if already authenticated
    if (isAuthenticated()) {
        return;
    }
    
    // Create password overlay
    createPasswordOverlay();
    
    // Show overlay
    const overlay = document.getElementById('passwordOverlay');
    if (overlay) {
        overlay.classList.add('active');
        
        // Focus on input
        setTimeout(() => {
            const input = document.getElementById('passwordInput');
            if (input) input.focus();
        }, 100);
    }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    try {
        return sessionStorage.getItem(AUTH_CONFIG.STORAGE_KEY) === 'true';
    } catch (e) {
        return false;
    }
}

/**
 * Create password overlay HTML
 */
function createPasswordOverlay() {
    // Check if overlay already exists
    if (document.getElementById('passwordOverlay')) {
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'passwordOverlay';
    overlay.className = 'password-overlay';
    
    overlay.innerHTML = `
        <div class="password-container">
            <div class="password-icon">🔒</div>
            <h2 class="password-title">Stefano & Yeşim's Journal</h2>
            <p class="password-subtitle">Enter the password to continue</p>
            <div class="password-input-wrapper">
                <input 
                    type="password" 
                    id="passwordInput" 
                    class="password-input" 
                    placeholder="••••"
                    autocomplete="off"
                >
            </div>
            <div class="password-error" id="passwordError"></div>
            <button class="password-btn" id="passwordBtn" onclick="checkPassword()">
                Unlock Journal
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    const input = document.getElementById('passwordInput');
    const btn = document.getElementById('passwordBtn');
    
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
        
        input.addEventListener('input', () => {
            const error = document.getElementById('passwordError');
            if (error) error.textContent = '';
        });
    }
}

/**
 * Hash password using SHA-256
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hex encoded SHA-256 hash
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check entered password
 */
async function checkPassword() {
    const input = document.getElementById('passwordInput');
    const error = document.getElementById('passwordError');
    
    if (!input) return;
    
    const enteredPassword = input.value.trim();
    
    // Hash the entered password and compare
    const enteredHash = await hashPassword(enteredPassword);
    
    if (enteredHash === AUTH_CONFIG.PASSWORD_HASH) {
        // Success - store authentication
        sessionStorage.setItem(AUTH_CONFIG.STORAGE_KEY, 'true');
        
        // Hide overlay with animation
        const overlay = document.getElementById('passwordOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
        
        // Show welcome notification
        if (window.App && window.App.showNotification) {
            window.App.showNotification('Welcome back! 💕', 'success');
        }
    } else {
        // Error
        if (error) {
            error.textContent = 'Incorrect password. Please try again.';
        }
        
        // Shake animation
        const container = document.querySelector('.password-container');
        if (container) {
            container.style.animation = 'shake 0.5s ease';
            setTimeout(() => {
                container.style.animation = '';
            }, 500);
        }
        
        // Clear input
        input.value = '';
        input.focus();
    }
}

/**
 * Logout (clear authentication)
 */
function logout() {
    sessionStorage.removeItem(AUTH_CONFIG.STORAGE_KEY);
    window.location.reload();
}

// Add shake animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPasswordProtection();
});

// Export for use in other scripts
window.Auth = {
    isAuthenticated,
    logout,
    checkPassword
};
