/**
 * Daily Entry Page - Stefano & Yeşim's Journal (Single Input Mode)
 * Handles color picking and journal entry with user toggle
 */

let currentDate = null;
let colorWheel = null;
let currentEntry = null;
let currentUser = 'stefano'; // 'stefano' or 'yesim'
let unsubscribeListener = null; // For real-time updates

// User configuration
const USERS = {
    stefano: {
        name: 'Stefano',
        greeting: 'Hi Stefano!',
        defaultColor: '#d4a5a5',
        avatar: 'S',
        personNum: 1
    },
    yesim: {
        name: 'Yeşim',
        greeting: 'Hi Yeşim!',
        defaultColor: '#a8c0a8',
        avatar: 'Y',
        personNum: 2
    }
};

/**
 * Initialize entry page
 */
async function initEntryPage() {
    // Get date from URL
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    
    if (dateParam) {
        currentDate = dateParam;
    } else {
        // Default to today
        currentDate = window.SheetsAPI.formatDate(new Date());
    }
    
    // Update date title
    updateDateTitle();
    
    // Load entry data first (to get saved colors)
    await loadEntry();
    
    // Initialize color wheel (must happen before populating input)
    initColorWheel();
    
    // Now populate input with data (color wheel exists now)
    populateInputForCurrentUser();
    
    // Update UI for current user
    updateUIForCurrentUser();
    
    // Set up real-time listener for auto-sync
    setupRealtimeListener();
}

/**
 * Update the date title display
 * Uses timezone-safe date parsing
 */
function updateDateTitle() {
    const dateTitle = document.getElementById('dateTitle');
    if (dateTitle) {
        // Parse the date string safely without timezone issues
        const parts = window.SheetsAPI.parseDateParts(currentDate);
        let date;
        if (parts) {
            date = new Date(parts.year, parts.month, parts.day);
        } else {
            date = new Date(currentDate + 'T00:00:00');
        }
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateTitle.textContent = date.toLocaleDateString('en-US', options);
    }
}

/**
 * Load entry data from storage
 */
async function loadEntry() {
    showLoading(true);
    console.log(`[CRUD] Loading entry for date: ${currentDate}`);
    
    try {
        console.log(`[CRUD] Fetching from Firebase...`);
        currentEntry = await window.SheetsAPI.getEntry(currentDate);
        console.log(`[CRUD] Loaded entry:`, currentEntry);
        
        // Ensure currentEntry has proper structure
        if (!currentEntry.person1) {
            console.log(`[CRUD] Initializing person1 defaults`);
            currentEntry.person1 = { color: USERS.stefano.defaultColor, entry: '' };
        }
        if (!currentEntry.person2) {
            console.log(`[CRUD] Initializing person2 defaults`);
            currentEntry.person2 = { color: USERS.yesim.defaultColor, entry: '' };
        }
        
        console.log(`[CRUD] Populating form for current user: ${currentUser}`);
        populateInputForCurrentUser();
        
        // Update other user's preview
        updateOtherUserPreview();
        
        // Update color wheel if initialized
        if (colorWheel) {
            updateColorWheelForCurrentUser();
        }
        
        console.log(`[CRUD] Entry loaded successfully`);
        
    } catch (error) {
        console.error('[CRUD] Error loading entry:', error);
        showStatus('Error loading entry', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Set up real-time listener for auto-sync
 * When other user saves, update the preview automatically
 */
function setupRealtimeListener() {
    // Clean up existing listener if any
    if (unsubscribeListener) {
        unsubscribeListener();
    }
    
    // Set up new listener
    console.log(`[FIREBASE] Setting up real-time listener for: ${currentDate}`);
    unsubscribeListener = window.SheetsAPI.listenToEntry(currentDate, (updatedEntry) => {
        console.log(`[FIREBASE] Real-time update received:`, updatedEntry);
        
        // Update current entry with new data
        currentEntry = updatedEntry;
        
        // Update other user's preview (they might have saved)
        updateOtherUserPreview();
        
        // Show subtle sync indicator
        showSyncIndicator();
    });
}

/**
 * Show sync indicator when data updates from other user
 */
function showSyncIndicator() {
    // Create indicator if it doesn't exist
    let indicator = document.getElementById('syncIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'syncIndicator';
        indicator.className = 'sync-indicator';
        indicator.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Synced</span>
        `;
        document.body.appendChild(indicator);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .sync-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #22c55e;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.3s ease;
                z-index: 1000;
            }
            .sync-indicator.active {
                opacity: 1;
                transform: translateY(0);
            }
            .sync-indicator svg {
                width: 16px;
                height: 16px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show indicator
    indicator.classList.add('active');
    
    // Hide after 2 seconds
    setTimeout(() => {
        indicator.classList.remove('active');
    }, 2000);
}

/**
 * Switch between users
 */
function switchUser(user) {
    if (user === currentUser) return;
    
    // Save current user's data before switching
    saveCurrentUserDataToMemory();
    
    // Switch user
    currentUser = user;
    
    // Update UI
    updateUIForCurrentUser();
    
    // Populate input with new user's data
    populateInputForCurrentUser();
    
    // Update color wheel
    updateColorWheelForCurrentUser();
    
    // Update other user's preview
    updateOtherUserPreview();
}

/**
 * Save current user's data to memory (before switching)
 */
function saveCurrentUserDataToMemory() {
    if (!currentEntry) return;
    
    const userConfig = USERS[currentUser];
    const journalEntry = document.getElementById('journalEntry');
    
    if (journalEntry) {
        currentEntry[`person${userConfig.personNum}`].entry = journalEntry.value;
    }
    
    if (colorWheel) {
        currentEntry[`person${userConfig.personNum}`].color = colorWheel.getColor();
    }
}

/**
 * Update UI elements for current user
 */
function updateUIForCurrentUser() {
    const userConfig = USERS[currentUser];
    const otherUser = currentUser === 'stefano' ? 'yesim' : 'stefano';
    
    // Update toggle buttons
    const stefanoBtn = document.getElementById('toggleStefano');
    const yesimBtn = document.getElementById('toggleYesim');
    
    if (stefanoBtn && yesimBtn) {
        if (currentUser === 'stefano') {
            stefanoBtn.classList.add('active');
            yesimBtn.classList.remove('active');
        } else {
            stefanoBtn.classList.remove('active');
            yesimBtn.classList.add('active');
        }
    }
    
    // Update avatar
    const avatar = document.getElementById('currentAvatar');
    if (avatar) {
        avatar.textContent = userConfig.avatar;
        avatar.style.background = userConfig.defaultColor;
    }
    
    // Update greeting
    const greeting = document.getElementById('currentGreeting');
    if (greeting) {
        greeting.textContent = userConfig.greeting;
    }
    
    // Update save button text
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.textContent = `Save ${userConfig.name}'s Entry`;
    }
}

/**
 * Populate input fields for current user
 */
function populateInputForCurrentUser() {
    const userConfig = USERS[currentUser];
    const personData = currentEntry[`person${userConfig.personNum}`];
    
    // Populate journal entry
    const journalEntry = document.getElementById('journalEntry');
    if (journalEntry) {
        // Only show text if there's an entry, otherwise empty
        journalEntry.value = personData.entry || '';
    }
    
    // Update color wheel
    if (colorWheel) {
        const color = personData.color || userConfig.defaultColor;
        colorWheel.setColor(color);
        updateColorPreview(color);
    }
}

/**
 * Update color wheel for current user
 */
function updateColorWheelForCurrentUser() {
    if (!colorWheel) return;
    
    const userConfig = USERS[currentUser];
    const personData = currentEntry[`person${userConfig.personNum}`];
    const color = personData.color || userConfig.defaultColor;
    
    colorWheel.setColor(color);
    updateColorPreview(color);
}

/**
 * Initialize color wheel
 */
function initColorWheel() {
    const wheelContainer = document.getElementById('colorWheel');
    if (wheelContainer && window.ColorWheel) {
        colorWheel = new ColorWheel('colorWheel', (color) => {
            updateColorPreview(color);
        });
        
        // Set initial color for current user
        const userConfig = USERS[currentUser];
        const personData = currentEntry[`person${userConfig.personNum}`];
        const initialColor = personData.color || userConfig.defaultColor;
        colorWheel.setColor(initialColor);
        
        // Update color preview
        updateColorPreview(initialColor);
    }
}

/**
 * Update color preview display
 */
function updateColorPreview(color) {
    const previewCircle = document.getElementById('previewCircle');
    const colorValue = document.getElementById('colorValue');
    
    if (previewCircle) {
        previewCircle.style.backgroundColor = color;
    }
    
    if (colorValue) {
        colorValue.textContent = color;
    }
}

/**
 * Update preview of other user's entry
 */
function updateOtherUserPreview() {
    const otherUser = currentUser === 'stefano' ? 'yesim' : 'stefano';
    const otherConfig = USERS[otherUser];
    const otherPersonData = currentEntry[`person${otherConfig.personNum}`];
    
    const previewContainer = document.getElementById('otherEntryPreview');
    const contentContainer = document.getElementById('otherEntryContent');
    
    if (!previewContainer || !contentContainer) return;
    
    // Check if other user has any data
    const hasEntry = otherPersonData.entry || otherPersonData.color !== otherConfig.defaultColor;
    
    if (!hasEntry) {
        previewContainer.style.display = 'none';
        return;
    }
    
    previewContainer.style.display = 'block';
    
    const color = otherPersonData.color || otherConfig.defaultColor;
    const text = otherPersonData.entry || 'No text entry yet';
    const previewText = text.length > 100 ? text.substring(0, 100) + '...' : text;
    
    contentContainer.innerHTML = `
        <div class="other-entry-header">
            <div class="other-entry-avatar" style="background: ${color}">${otherConfig.avatar}</div>
            <span class="other-entry-name">${otherConfig.name}'s Entry</span>
        </div>
        <div class="other-entry-text">${previewText}</div>
    `;
}

/**
 * Save entry (manual)
 */
async function saveEntry() {
    const saveBtn = document.getElementById('saveBtn');
    
    if (saveBtn) {
        saveBtn.disabled = true;
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
    }
    
    try {
        await saveEntryData();
        
        showSuccessModal();
        showStatus('Entry saved!', 'success');
        
        // Update other user's preview
        updateOtherUserPreview();
        
        if (saveBtn) {
            saveBtn.textContent = `Save ${USERS[currentUser].name}'s Entry`;
            saveBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Error saving entry:', error);
        showStatus('Error saving entry', 'error');
        
        if (saveBtn) {
            saveBtn.textContent = `Save ${USERS[currentUser].name}'s Entry`;
            saveBtn.disabled = false;
        }
    }
}

/**
 * Save entry data to storage
 * Fetches existing data first to merge with current user's changes
 */
async function saveEntryData() {
    console.log(`[CRUD] Starting save for ${currentUser} on date: ${currentDate}`);
    
    const userConfig = USERS[currentUser];
    
    // Get current user's data from the form
    const journalEntry = document.getElementById('journalEntry');
    const currentText = journalEntry ? journalEntry.value : '';
    const currentColor = colorWheel ? colorWheel.getColor() : userConfig.defaultColor;
    
    console.log(`[CRUD] Current form data - text: "${currentText}", color: ${currentColor}`);
    
    // Fetch the CURRENT entry from server to get latest data (including other user's entry)
    console.log(`[CRUD] Fetching existing entry from server...`);
    let existingEntry;
    try {
        existingEntry = await window.SheetsAPI.getEntry(currentDate);
        console.log(`[CRUD] Existing entry from server:`, existingEntry);
    } catch (error) {
        console.error('[CRUD] Error fetching existing entry:', error);
        // Fallback to memory if fetch fails
        existingEntry = currentEntry;
        console.log(`[CRUD] Falling back to memory:`, existingEntry);
    }
    
    // Prepare merged data - preserve other user's data, update current user's data
    let person1Data, person2Data;
    
    if (currentUser === 'stefano') {
        console.log(`[CRUD] Preparing data for Stefano (person1)`);
        // Stefano is saving - update person1, preserve person2 from server
        person1Data = {
            color: currentColor,
            entry: currentText
        };
        person2Data = {
            color: existingEntry.person2.color || USERS.yesim.defaultColor,
            entry: existingEntry.person2.entry || ''
        };
    } else {
        console.log(`[CRUD] Preparing data for Yeşim (person2)`);
        // Yeşim is saving - preserve person1 from server, update person2
        person1Data = {
            color: existingEntry.person1.color || USERS.stefano.defaultColor,
            entry: existingEntry.person1.entry || ''
        };
        person2Data = {
            color: currentColor,
            entry: currentText
        };
    }
    
    console.log(`[CRUD] Saving to server:`, { person1Data, person2Data, savingUser: currentUser });
    const result = await window.SheetsAPI.saveEntry(currentDate, person1Data, person2Data, currentUser);
    console.log(`[CRUD] Server response:`, result);
    
    if (!result.success) {
        console.error(`[CRUD] Save failed:`, result.error);
        throw new Error(result.error || 'Failed to save');
    }
    
    // Update current entry with merged data
    currentEntry = {
        date: currentDate,
        person1: person1Data,
        person2: person2Data
    };
    
    console.log(`[CRUD] Save completed successfully`);
    return result;
}

/**
 * Show success modal
 */
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('active');
        
        setTimeout(() => {
            modal.classList.remove('active');
        }, 1500);
    }
}

/**
 * Show delete confirmation modal
 */
function confirmDelete() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Cancel delete operation
 */
function cancelDelete() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Delete the current user's entry
 */
async function deleteEntry() {
    console.log(`[CRUD] Starting delete for ${currentUser} on date: ${currentDate}`);
    
    const modal = document.getElementById('deleteModal');
    const deleteBtn = document.querySelector('.btn-confirm-delete');

    if (deleteBtn) {
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;
    }

    try {
        const userConfig = USERS[currentUser];
        const otherUser = currentUser === 'stefano' ? 'yesim' : 'stefano';
        const otherConfig = USERS[otherUser];
        const otherPersonData = currentEntry[`person${otherConfig.personNum}`];

        console.log(`[CRUD] Other user data:`, otherPersonData);

        // Clear current user's data
        let person1Data, person2Data;

        if (currentUser === 'stefano') {
            console.log(`[CRUD] Deleting Stefano's data (person1)`);
            person1Data = { color: userConfig.defaultColor, entry: '' };
            person2Data = {
                color: otherPersonData.color || otherConfig.defaultColor,
                entry: otherPersonData.entry || ''
            };
        } else {
            console.log(`[CRUD] Deleting Yeşim's data (person2)`);
            person1Data = {
                color: otherPersonData.color || otherConfig.defaultColor,
                entry: otherPersonData.entry || ''
            };
            person2Data = { color: userConfig.defaultColor, entry: '' };
        }

        // Check if both people have no meaningful data (no text AND default color)
        const person1HasData = person1Data.entry || person1Data.color !== USERS.stefano.defaultColor;
        const person2HasData = person2Data.entry || person2Data.color !== USERS.yesim.defaultColor;

        console.log(`[CRUD] After delete - person1 has data: ${person1HasData}, person2 has data: ${person2HasData}`);

        let result;
        if (!person1HasData && !person2HasData) {
            console.log(`[CRUD] Both users have no data - deleting entire row`);
            result = await window.SheetsAPI.deleteEntry(currentDate);
        } else {
            console.log(`[CRUD] One user still has data - saving with defaults`);
            result = await window.SheetsAPI.saveEntry(currentDate, person1Data, person2Data, currentUser);
        }

        console.log(`[CRUD] Server response:`, result);

        if (result.success) {
            console.log(`[CRUD] Delete successful`);
            
            // Clear the form
            const journalEntry = document.getElementById('journalEntry');
            if (journalEntry) journalEntry.value = '';

            // Reset color
            if (colorWheel) colorWheel.setColor(userConfig.defaultColor);

            // Update current entry
            currentEntry = {
                date: currentDate,
                person1: person1Data,
                person2: person2Data
            };

            showStatus('Entry deleted successfully', 'success');

            // Close modal
            if (modal) {
                modal.classList.remove('active');
            }

            // Update preview
            updateOtherUserPreview();
        } else {
            console.error(`[CRUD] Delete failed:`, result.error);
            throw new Error(result.error || 'Failed to delete');
        }
    } catch (error) {
        console.error('Error deleting entry:', error);
        showStatus('Error deleting entry', 'error');

        if (modal) {
            modal.classList.remove('active');
        }
    } finally {
        if (deleteBtn) {
            deleteBtn.textContent = 'Delete';
            deleteBtn.disabled = false;
        }
    }
}

/**
 * Show status message
 */
function showStatus(message, type) {
    const status = document.getElementById('saveStatus');
    if (status) {
        status.textContent = message;
        status.className = 'save-status ' + type;
        
        setTimeout(() => {
            status.textContent = '';
            status.className = 'save-status';
        }, 3000);
    }
}

/**
 * Navigate back to calendar
 */
function goBack() {
    window.location.href = 'index.html';
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
    if (document.getElementById('journalEntry')) {
        initEntryPage();
    }
});

// Export functions for inline HTML handlers
window.saveEntry = saveEntry;
window.goBack = goBack;
window.confirmDelete = confirmDelete;
window.cancelDelete = cancelDelete;
window.deleteEntry = deleteEntry;
window.switchUser = switchUser;
window.goToToday = () => {
    const today = window.SheetsAPI.formatDate(new Date());
    window.location.href = `day.html?date=${today}`;
};
