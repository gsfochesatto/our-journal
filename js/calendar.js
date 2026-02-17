/**
 * Calendar View - Stefano & Yeşim's Journal
 * GitHub-style contribution calendar with color-coded entries
 */

let currentDate = new Date();
let entriesCache = {};
let unsubscribeCalendarListener = null;

/**
 * Initialize calendar
 */
function initCalendar() {
    loadMonth(currentDate.getFullYear(), currentDate.getMonth());
    setupNavigation();
    loadRecentEntries();
    setupCalendarRealtimeListener();
}

/**
 * Setup month navigation
 */
function setupNavigation() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            loadMonth(currentDate.getFullYear(), currentDate.getMonth());
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            loadMonth(currentDate.getFullYear(), currentDate.getMonth());
        });
    }
}

/**
 * Load and display a specific month
 */
async function loadMonth(year, month) {
    showLoading(true);
    
    try {
        // Update month title
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthTitle = document.getElementById('currentMonth');
        if (monthTitle) {
            monthTitle.textContent = `${monthNames[month]} ${year}`;
        }
        
        // Get entries for this month
        entriesCache = await window.SheetsAPI.getMonthEntries(year, month);
        
        // Generate calendar grid
        generateCalendarGrid(year, month);
        
    } catch (error) {
        console.error('Error loading month:', error);
    } finally {
        showLoading(false);
    }
}

/**
 * Generate the calendar day grid
 */
function generateCalendarGrid(year, month) {
    const container = document.getElementById('calendarGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get starting day (0 = Sunday, but we want Monday = 0)
    let startingDay = firstDay.getDay() - 1;
    if (startingDay < 0) startingDay = 6;
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        container.appendChild(emptyCell);
    }
    
    // Add day cells
    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
        // Create date string directly to avoid timezone issues
        const dateKey = window.SheetsAPI.formatDateFromParts(year, month, day);
        const entry = entriesCache[dateKey];
        
        // Debug logging (only first and last few days)
        if (day <= 2 || day >= daysInMonth - 1) {
            console.log(`[CALENDAR] Day ${day}: dateKey=${dateKey}, hasEntry=${!!entry}`);
        }
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.setAttribute('data-date', dateKey);
        
        // Check if today using timezone-safe comparison
        const todayKey = window.SheetsAPI.formatDateFromParts(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );
        if (dateKey === todayKey) {
            dayCell.classList.add('today');
        }
        
        // Create color split container
        const colorsDiv = document.createElement('div');
        colorsDiv.className = 'day-colors';
        
        // Stefano's color (left half) - only show if entry exists with actual data
        const stefanoColor = document.createElement('div');
        stefanoColor.className = 'day-color stefano-color';
        if (entry?.person1?.color && entry.person1.color !== '#d4a5a5') {
            stefanoColor.style.setProperty('--stefano-color', entry.person1.color);
            stefanoColor.style.backgroundColor = entry.person1.color;
        } else {
            stefanoColor.style.backgroundColor = 'transparent';
        }
        colorsDiv.appendChild(stefanoColor);

        // Yeşim's color (right half) - only show if entry exists with actual data
        const yesimColor = document.createElement('div');
        yesimColor.className = 'day-color yesim-color';
        if (entry?.person2?.color && entry.person2.color !== '#a8c0a8') {
            yesimColor.style.setProperty('--yesim-color', entry.person2.color);
            yesimColor.style.backgroundColor = entry.person2.color;
        } else {
            yesimColor.style.backgroundColor = 'transparent';
        }
        colorsDiv.appendChild(yesimColor);
        
        dayCell.appendChild(colorsDiv);
        
        // Day number
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);
        
        // Entry indicator (if has text entry)
        if (entry && (entry.person1.entry || entry.person2.entry)) {
            dayCell.classList.add('has-entry');
        }
        
        // Click handler
        dayCell.addEventListener('click', () => {
            navigateToDay(dateKey);
        });
        
        container.appendChild(dayCell);
    }
    
    // Fill remaining grid cells to complete the week
    const totalCells = startingDay + daysInMonth;
    const remainingCells = 7 - (totalCells % 7);
    
    if (remainingCells < 7) {
        for (let i = 0; i < remainingCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            container.appendChild(emptyCell);
        }
    }
}

/**
 * Load and display recent entries
 */
async function loadRecentEntries() {
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) return;
    
    try {
        const allEntries = await window.SheetsAPI.getAllEntries();
        
        // Get entries with text, sorted by date (newest first) - TIMEZONE SAFE
        const entriesWithText = Object.values(allEntries)
            .filter(entry => entry.person1.entry || entry.person2.entry)
            .sort((a, b) => {
                // Parse dates safely without timezone issues
                const partsA = window.SheetsAPI.parseDateParts(a.date);
                const partsB = window.SheetsAPI.parseDateParts(b.date);
                if (!partsA || !partsB) return 0;
                
                // Compare year, month, day
                if (partsB.year !== partsA.year) return partsB.year - partsA.year;
                if (partsB.month !== partsA.month) return partsB.month - partsA.month;
                return partsB.day - partsA.day;
            })
            .slice(0, 5); // Show last 5 entries
        
        entriesList.innerHTML = '';
        
        if (entriesWithText.length === 0) {
            entriesList.innerHTML = `
                <div class="empty-entries">
                    <p>No entries yet. Start journaling today!</p>
                </div>
            `;
            return;
        }
        
        entriesWithText.forEach(entry => {
            const entryCard = createEntryCard(entry);
            entriesList.appendChild(entryCard);
        });
        
    } catch (error) {
        console.error('Error loading recent entries:', error);
        entriesList.innerHTML = `
            <div class="empty-entries">
                <p>Unable to load entries. Please try again.</p>
            </div>
        `;
    }
}

/**
 * Create an entry card for the list - shows both Stefano's and Yeşim's entries
 * Uses timezone-safe date parsing
 */
function createEntryCard(entry) {
    // Parse date safely without timezone issues
    const parts = window.SheetsAPI.parseDateParts(entry.date);
    let dayName, dayNumber;
    
    if (parts) {
        const date = new Date(parts.year, parts.month, parts.day);
        dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        dayNumber = parts.day;
    } else {
        // Fallback
        const date = new Date(entry.date);
        dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        dayNumber = date.getDate();
    }
    
    const card = document.createElement('div');
    card.className = 'entry-card-preview';
    card.addEventListener('click', () => navigateToDay(entry.date));
    
    // Build content showing both entries
    let entriesHtml = '';
    
    // Stefano's entry
    if (entry.person1.entry) {
        const stefanoText = entry.person1.entry.substring(0, 80) + (entry.person1.entry.length > 80 ? '...' : '');
        entriesHtml += `
            <div class="entry-preview-row">
                <div class="entry-preview-color" style="background: ${entry.person1.color || '#d4a5a5'}"></div>
                <div class="entry-preview-name">Stefano</div>
                <div class="entry-preview-text">${stefanoText}</div>
            </div>
        `;
    }
    
    // Yeşim's entry
    if (entry.person2.entry) {
        const yesimText = entry.person2.entry.substring(0, 80) + (entry.person2.entry.length > 80 ? '...' : '');
        entriesHtml += `
            <div class="entry-preview-row">
                <div class="entry-preview-color" style="background: ${entry.person2.color || '#a8c0a8'}"></div>
                <div class="entry-preview-name">Yeşim</div>
                <div class="entry-preview-text">${yesimText}</div>
            </div>
        `;
    }
    
    // If neither has text but has color
    if (!entry.person1.entry && !entry.person2.entry) {
        entriesHtml = `
            <div class="entry-preview-row">
                <div class="entry-preview-color" style="background: ${entry.person1.color || '#d4a5a5'}"></div>
                <div class="entry-preview-name">Stefano</div>
                <div class="entry-preview-text muted">Colors only, no text</div>
            </div>
            <div class="entry-preview-row">
                <div class="entry-preview-color" style="background: ${entry.person2.color || '#a8c0a8'}"></div>
                <div class="entry-preview-name">Yeşim</div>
                <div class="entry-preview-text muted">Colors only, no text</div>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="entry-date-block">
            <span class="entry-day-number">${dayNumber}</span>
            <span class="entry-day-name">${dayName}</span>
        </div>
        <div class="entry-preview-content">
            ${entriesHtml}
        </div>
    `;
    
    return card;
}

/**
 * Navigate to day entry page
 */
function navigateToDay(date) {
    window.location.href = `day.html?date=${date}`;
}

/**
 * Navigate to today's entry page
 */
function goToToday() {
    const today = window.SheetsAPI.formatDate(new Date());
    navigateToDay(today);
}

/**
 * Refresh calendar (call after saving an entry)
 */
async function refreshCalendar() {
    await loadMonth(currentDate.getFullYear(), currentDate.getMonth());
    await loadRecentEntries();
}

/**
 * Set up real-time listener for calendar auto-sync
 * Updates calendar when other user saves entries
 */
function setupCalendarRealtimeListener() {
    console.log('[FIREBASE] Setting up calendar real-time listener');
    
    if (unsubscribeCalendarListener) {
        unsubscribeCalendarListener();
    }
    
    unsubscribeCalendarListener = window.SheetsAPI.listenToAllEntries((updatedEntries) => {
        console.log(`[FIREBASE] Calendar received real-time update: ${Object.keys(updatedEntries).length} entries`);
        
        // Update cache
        entriesCache = updatedEntries;
        
        // Re-render current month
        generateCalendarGrid(currentDate.getFullYear(), currentDate.getMonth());
        
        // Also refresh recent entries
        loadRecentEntries();
    });
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('calendarGrid')) {
        initCalendar();
    }
});

// Export for use in other files
window.Calendar = {
    refresh: refreshCalendar,
    navigateToDay,
    goToToday
};
