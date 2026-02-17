/**
 * Simple Canvas Color Wheel - Robust Implementation
 * Uses HTML5 Canvas for reliable color picking
 */

class ColorWheel {
    constructor(containerId, onChangeCallback) {
        this.container = document.getElementById(containerId);
        this.onChange = onChangeCallback;
        this.currentColor = '#d4a5a5';
        this.isDragging = false;
        this.size = 200;
        this.center = this.size / 2;
        this.radius = this.size / 2 - 5;
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('[ColorWheel] Container not found:', this.container);
            return;
        }
        
        // Clear container
        this.container.innerHTML = '';
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            border-radius: 50%;
            cursor: crosshair;
            display: block;
        `;
        
        this.ctx = this.canvas.getContext('2d');
        
        // Draw the color wheel
        this.drawWheel();
        
        // Create selector
        this.createSelector();
        
        // Add event listeners
        this.addEventListeners();
        
        // Add to container
        this.container.appendChild(this.canvas);
        this.container.appendChild(this.selector);
        
        // Set initial position
        this.setColor(this.currentColor);
        
        console.log('[ColorWheel] Initialized successfully');
    }
    
    drawWheel() {
        const ctx = this.ctx;
        const centerX = this.center;
        const centerY = this.center;
        const radius = this.radius;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.size, this.size);
        
        // Draw hue wheel (conic gradient simulation)
        for (let angle = 0; angle < 360; angle++) {
            const startAngle = (angle * Math.PI) / 180;
            const endAngle = ((angle + 1) * Math.PI) / 180;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
            ctx.fill();
        }
        
        // Add saturation gradient (white center to transparent edge)
        const satGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        satGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        satGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = satGradient;
        ctx.fill();
        
        // Add lightness gradient (subtle darkening at edges)
        const lightGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius);
        lightGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = lightGradient;
        ctx.fill();
    }
    
    createSelector() {
        this.selector = document.createElement('div');
        this.selector.className = 'color-wheel-selector';
        this.selector.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 100;
            transition: transform 0.1s ease;
        `;
    }
    
    addEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            console.log('[ColorWheel] mousedown on canvas');
            this.handleStart(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleMove(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.handleEnd();
        });
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            console.log('[ColorWheel] touchstart on canvas');
            this.handleStart(e);
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                this.handleMove(e);
            }
        }, { passive: false });
        
        document.addEventListener('touchend', () => {
            this.handleEnd();
        });
    }
    
    handleStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isDragging = true;
        console.log('[ColorWheel] Drag started');
        
        this.updateFromEvent(e);
    }
    
    handleMove(e) {
        e.preventDefault();
        this.updateFromEvent(e);
    }
    
    handleEnd() {
        this.isDragging = false;
        console.log('[ColorWheel] Drag ended');
    }
    
    updateFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Calculate position relative to center
        const x = clientX - rect.left - this.center;
        const y = clientY - rect.top - this.center;
        
        // Calculate distance from center
        const distance = Math.sqrt(x * x + y * y);
        
        // Clamp to wheel radius
        const clampedDistance = Math.min(distance, this.radius);
        
        // Calculate angle (hue) - starting from right (0 degrees)
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = (angle + 360) % 360;
        
        // Calculate saturation (0 at center, 100 at edge)
        const saturation = (clampedDistance / this.radius) * 100;
        
        // Convert to hex
        const color = this.hslToHex(angle, saturation, 50);
        this.currentColor = color;
        
        console.log('[ColorWheel] Color selected:', color, 'hue:', angle, 'sat:', saturation);
        
        // Update selector position
        let selectorX, selectorY;
        if (distance > 0) {
            selectorX = this.center + (x / distance) * clampedDistance;
            selectorY = this.center + (y / distance) * clampedDistance;
        } else {
            selectorX = this.center;
            selectorY = this.center;
        }
        
        // Convert canvas coordinates to CSS percentages for positioning
        const percentX = (selectorX / this.size) * 100;
        const percentY = (selectorY / this.size) * 100;
        
        this.selector.style.left = `${percentX}%`;
        this.selector.style.top = `${percentY}%`;
        this.selector.style.backgroundColor = color;
        
        // Trigger callback
        if (this.onChange) {
            this.onChange(color);
        }
    }
    
    // HSL to Hex conversion
    hslToHex(h, s, l) {
        h = h % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        l = Math.max(0, Math.min(100, l)) / 100;
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        
        let r, g, b;
        
        if (h < 60) {
            r = c; g = x; b = 0;
        } else if (h < 120) {
            r = x; g = c; b = 0;
        } else if (h < 180) {
            r = 0; g = c; b = x;
        } else if (h < 240) {
            r = 0; g = x; b = c;
        } else if (h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        const toHex = (n) => {
            const hex = Math.round((n + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    
    // Hex to HSL conversion
    hexToHsl(hex) {
        hex = hex.replace('#', '');
        
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }
    
    setColor(hex) {
        const hsl = this.hexToHsl(hex);
        
        // Calculate selector position from hue and saturation
        const angle = (hsl.h / 360) * 2 * Math.PI;
        const distance = (hsl.s / 100) * this.radius;
        
        const x = this.center + Math.cos(angle) * distance;
        const y = this.center + Math.sin(angle) * distance;
        
        // Convert to percentages
        const percentX = (x / this.size) * 100;
        const percentY = (y / this.size) * 100;
        
        this.selector.style.left = `${percentX}%`;
        this.selector.style.top = `${percentY}%`;
        this.selector.style.backgroundColor = hex;
        
        this.currentColor = hex;
        
        // Trigger callback
        if (this.onChange) {
            this.onChange(hex);
        }
    }
    
    getColor() {
        return this.currentColor;
    }
}

// Export for use
window.ColorWheel = ColorWheel;
