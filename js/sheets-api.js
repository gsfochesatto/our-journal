/**
 * Google Sheets API Integration
 * Simple wrapper for reading/writing journal entries
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet with columns: Date | Person1_Color | Person1_Entry | Person2_Color | Person2_Entry
 * 2. Share the sheet with "Anyone with the link can view"
 * 3. Deploy as web app via Apps Script (see README)
 * 4. Update SHEET_URL below with your deployed web app URL
 */

const CONFIG = {
  SHEET_URL:
    "https://corsproxy.io/?https://script.google.com/macros/s/AKfycbxh_3iPK5sn-Z_E6qUChY_5MgZCDFHs--_TYNtW1v99_4uUpIPJXDBhPxWRh4LLl0zU/exec",
  COLUMNS: {
    DATE: 0,
    PERSON1_COLOR: 1,
    PERSON1_ENTRY: 2,
    PERSON2_COLOR: 3,
    PERSON2_ENTRY: 4,
  },
};

/**
 * Format date as YYYY-MM-DD
 * Uses local time to avoid timezone offset issues
 */
function formatDate(date) {
    const d = new Date(date);
    // Use UTC methods to avoid timezone issues
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date as YYYY-MM-DD from date components
 * This version takes year, month, day directly to avoid any timezone issues
 */
function formatDateFromParts(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
}

/**
 * Parse date string to Date object
 */
function parseDate(dateString) {
    return new Date(dateString);
}

/**
 * Check if Google Sheets is configured
 */
function isConfigured() {
    return CONFIG.SHEET_URL && !CONFIG.SHEET_URL.includes('YOUR_GOOGLE');
}

/**
 * Show configuration warning
 */
function showConfigWarning() {
    console.warn('Google Sheets not configured. Using local storage fallback.');
    return false;
}

/**
 * Get all entries from Google Sheets
 */
async function getAllEntries() {
    if (!isConfigured()) {
        return getLocalEntries();
    }
    
    try {
        showLoading(true);
        const response = await fetch(`${CONFIG.SHEET_URL}?action=getAll`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Transform data into usable format
        // Merge rows with the same date instead of overwriting
        const entries = {};
        data.forEach(row => {
            // Format date consistently as YYYY-MM-DD string
            let date = row[CONFIG.COLUMNS.DATE];
            if (date) {
                // Handle Date objects from Google Sheets
                if (date instanceof Date) {
                    date = formatDate(date);
                } else if (typeof date === 'string' && date.includes('T')) {
                    // Handle ISO date strings
                    date = date.split('T')[0];
                }
                
                // If entry already exists for this date, merge the data
                if (entries[date]) {
                    // Merge person1 data (use non-empty values)
                    const person1Color = row[CONFIG.COLUMNS.PERSON1_COLOR];
                    const person1Entry = row[CONFIG.COLUMNS.PERSON1_ENTRY];
                    if (person1Color && person1Color !== '#d4a5a5') {
                        entries[date].person1.color = person1Color;
                    }
                    if (person1Entry && person1Entry.trim() !== '') {
                        entries[date].person1.entry = person1Entry;
                    }
                    
                    // Merge person2 data (use non-empty values)
                    const person2Color = row[CONFIG.COLUMNS.PERSON2_COLOR];
                    const person2Entry = row[CONFIG.COLUMNS.PERSON2_ENTRY];
                    if (person2Color && person2Color !== '#a8c0a8') {
                        entries[date].person2.color = person2Color;
                    }
                    if (person2Entry && person2Entry.trim() !== '') {
                        entries[date].person2.entry = person2Entry;
                    }
                } else {
                    // Create new entry
                    entries[date] = {
                        date: date,
                        person1: {
                            color: row[CONFIG.COLUMNS.PERSON1_COLOR] || '#d4a5a5',
                            entry: row[CONFIG.COLUMNS.PERSON1_ENTRY] || ''
                        },
                        person2: {
                            color: row[CONFIG.COLUMNS.PERSON2_COLOR] || '#a8c0a8',
                            entry: row[CONFIG.COLUMNS.PERSON2_ENTRY] || ''
                        }
                    };
                }
            }
        });
        
        // Also cache in localStorage
        localStorage.setItem('journal_entries', JSON.stringify(entries));
        
        return entries;
    } catch (error) {
        console.error('Error fetching entries:', error);
        // Fallback to local storage
        return getLocalEntries();
    } finally {
        showLoading(false);
    }
}

/**
 * Get a specific entry by date
 */
async function getEntry(date) {
    const formattedDate = formatDate(date);
    const allEntries = await getAllEntries();
    return allEntries[formattedDate] || {
        date: formattedDate,
        person1: { color: '#d4a5a5', entry: '' },
        person2: { color: '#a8c0a8', entry: '' }
    };
}

/**
 * Save an entry to Google Sheets
 * @param {string} savingUser - 'stefano' or 'yesim' to identify which user is saving
 */
async function saveEntry(date, person1Data, person2Data, savingUser) {
    const formattedDate = formatDate(date);
    
    const entryData = {
        date: formattedDate,
        person1Color: person1Data.color,
        person1Entry: person1Data.entry,
        person2Color: person2Data.color,
        person2Entry: person2Data.entry,
        savingUser: savingUser || 'stefano' // Explicitly tell backend which user is saving
    };
    
    if (!isConfigured()) {
        return saveLocalEntry(entryData);
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(CONFIG.SHEET_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'save',
                data: entryData
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Update local cache
        const entries = await getLocalEntries();
        entries[formattedDate] = {
            date: formattedDate,
            person1: person1Data,
            person2: person2Data
        };
        localStorage.setItem('journal_entries', JSON.stringify(entries));
        
        return { success: true, data: result };
    } catch (error) {
        console.error('Error saving entry:', error);
        // Fallback to local storage
        return saveLocalEntry(entryData);
    } finally {
        showLoading(false);
    }
}

/**
 * Delete an entry
 */
async function deleteEntry(date) {
    const formattedDate = formatDate(date);
    
    if (!isConfigured()) {
        return deleteLocalEntry(formattedDate);
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(CONFIG.SHEET_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'delete',
                date: formattedDate
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Update local cache
        const entries = await getLocalEntries();
        delete entries[formattedDate];
        localStorage.setItem('journal_entries', JSON.stringify(entries));
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting entry:', error);
        return deleteLocalEntry(formattedDate);
    } finally {
        showLoading(false);
    }
}

/**
 * LOCAL STORAGE FALLBACK
 * These functions work when Google Sheets is not configured
 */

function getLocalEntries() {
    try {
        const stored = localStorage.getItem('journal_entries');
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return {};
    }
}

function saveLocalEntry(entryData) {
    try {
        const entries = getLocalEntries();
        entries[entryData.date] = {
            date: entryData.date,
            person1: {
                color: entryData.person1Color,
                entry: entryData.person1Entry
            },
            person2: {
                color: entryData.person2Color,
                entry: entryData.person2Entry
            }
        };
        localStorage.setItem('journal_entries', JSON.stringify(entries));
        return { success: true, local: true };
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return { success: false, error: error.message };
    }
}

function deleteLocalEntry(date) {
    try {
        const entries = getLocalEntries();
        delete entries[date];
        localStorage.setItem('journal_entries', JSON.stringify(entries));
        return { success: true, local: true };
    } catch (error) {
        console.error('Error deleting from localStorage:', error);
        return { success: false, error: error.message };
    }
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

/**
 * Get entries for a specific month/year
 */
async function getMonthEntries(year, month) {
    const allEntries = await getAllEntries();
    const monthEntries = {};
    
    Object.keys(allEntries).forEach(dateKey => {
        const entryDate = new Date(dateKey);
        if (entryDate.getFullYear() === year && entryDate.getMonth() === month) {
            monthEntries[dateKey] = allEntries[dateKey];
        }
    });
    
    return monthEntries;
}

// Export functions for use in other scripts
window.SheetsAPI = {
    getAllEntries,
    getEntry,
    saveEntry,
    deleteEntry,
    getMonthEntries,
    formatDate,
    formatDateFromParts,
    parseDate,
    isConfigured,
    CONFIG
};
