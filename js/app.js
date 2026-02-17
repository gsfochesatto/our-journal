/**
 * Main Application Logic
 * Handles global app state, routing, and shared utilities
 */

// App state
const AppState = {
    currentUser: null,
    isOnline: navigator.onLine,
    lastSync: null
};

/**
 * Initialize the app
 */
function initApp() {
    // Check online status
    window.addEventListener('online', () => {
        AppState.isOnline = true;
        showNotification('Back online!', 'success');
    });
    
    window.addEventListener('offline', () => {
        AppState.isOnline = false;
        showNotification('You\'re offline. Changes will be saved locally.', 'warning');
    });
    
    // Initialize smooth scrolling
    initSmoothScroll();
    
    // Add page transition effect
    initPageTransitions();
    
    console.log('✨ Couples Journal initialized');
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Initialize page transition animations
 */
function initPageTransitions() {
    // Add fade-in class to body on load
    document.body.classList.add('fade-in');
    
    // Handle link clicks with transitions
    document.querySelectorAll('a[href^="day.html"], a[href^="index.html"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Don't intercept if it's the same page
            if (href === window.location.pathname.split('/').pop()) {
                return;
            }
            
            e.preventDefault();
            
            // Fade out
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.3s ease';
            
            // Navigate after fade
            setTimeout(() => {
                window.location.href = href;
            }, 300);
        });
    });
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existing = document.querySelector('.app-notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `app-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: var(--font-body);
        font-size: 0.9rem;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}

/**
 * Debounce function for performance
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for scroll events
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return "Just now";
}

/**
 * Get random romantic quote for empty states
 */
function getRandomQuote() {
    const quotes = [
        "Every love story is beautiful, but ours is my favorite.",
        "I saw that you were perfect, and so I loved you.",
        "You are my sun, my moon, and all my stars.",
        "In all the world, there is no heart for me like yours.",
        "I love you not because of who you are, but because of who I am when I am with you.",
        "To the world you may be one person, but to one person you are the world.",
        "The best thing to hold onto in life is each other.",
        "I would rather spend one lifetime with you, than face all the ages of this world alone."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Check if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Animate elements on scroll
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, {
        threshold: 0.1
    });
    
    animatedElements.forEach(el => observer.observe(el));
}

/**
 * Handle keyboard shortcuts
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (window.saveEntry) {
                window.saveEntry();
            }
        }
        
        // Escape to go back
        if (e.key === 'Escape') {
            if (window.goBack) {
                window.goBack();
            }
        }
    });
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initKeyboardShortcuts();
    initScrollAnimations();
});

// Export utilities
window.App = {
    state: AppState,
    showNotification,
    debounce,
    throttle,
    timeAgo,
    getRandomQuote,
    isInViewport
};
