/**
 * Firebase Firestore Storage Layer
 * Replaces Google Sheets with Firestore for real-time data sync
 */

// Collection name in Firestore
const ENTRIES_COLLECTION = 'entries';

// Password for Firestore access (matches security rules)
const ACCESS_PASSWORD = '010426';

// Default colors
const DEFAULT_COLORS = {
  stefano: '#d4a5a5',
  yesim: '#a8c0a8'
};

/**
 * Format date as YYYY-MM-DD
 * Handles both Date objects and date strings consistently
 * CRITICAL FIX: Properly handles YYYY-MM-DD strings to avoid timezone shifting
 */
function formatDate(date) {
  // If it's already a YYYY-MM-DD string, return it as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.log(`[DATE-FIX] formatDate: input is already YYYY-MM-DD: ${date}`);
    return date;
  }
  
  // Parse as Date object
  const d = new Date(date);
  // Use local date components to avoid timezone shifts
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const result = `${year}-${month}-${day}`;
  console.log(`[DATE-FIX] formatDate: input=${date}, output=${result}`);
  return result;
}

/**
 * Parse a YYYY-MM-DD date string safely without timezone issues
 * Returns the exact date that was stored
 */
function parseDateString(dateString) {
  if (typeof dateString !== 'string') return new Date(dateString);
  
  // If it's already YYYY-MM-DD, parse it manually to avoid timezone issues
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // Months are 0-indexed
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  return new Date(dateString);
}

/**
 * Format date from parts (year, month, day)
 */
function formatDateFromParts(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Parse date string to Date object - TIMEZONE SAFE VERSION
 * Parses "YYYY-MM-DD" strings without timezone shifting
 */
function parseDate(dateString) {
  if (typeof dateString !== 'string') return new Date(dateString);
  
  // Parse YYYY-MM-DD format manually to avoid timezone issues
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // Months are 0-indexed in JS
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  return new Date(dateString);
}

/**
 * Parse YYYY-MM-DD string into {year, month, day} object
 * Useful for comparing dates without creating Date objects
 */
function parseDateParts(dateString) {
  if (typeof dateString !== 'string') return null;
  
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10) - 1, // 0-indexed
      day: parseInt(match[3], 10)
    };
  }
  return null;
}

/**
 * Get all entries from Firestore
 * Uses real-time listener for auto-sync
 */
async function getAllEntries() {
  console.log('[FIREBASE] Fetching all entries...');
  
  try {
    const snapshot = await window.firebaseDb
      .collection(ENTRIES_COLLECTION)
      .get();
    
    const entries = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      entries[doc.id] = {
        date: doc.id,
        person1: {
          color: data.person1?.color || DEFAULT_COLORS.stefano,
          entry: data.person1?.entry || ''
        },
        person2: {
          color: data.person2?.color || DEFAULT_COLORS.yesim,
          entry: data.person2?.entry || ''
        }
      };
    });
    
    console.log('[FIREBASE] Fetched entries:', Object.keys(entries).length);
    
    // Cache in localStorage for offline access
    localStorage.setItem('journal_entries', JSON.stringify(entries));
    
    return entries;
  } catch (error) {
    console.error('[FIREBASE] Error fetching entries:', error);
    // Fallback to cached data
    return getLocalEntries();
  }
}

/**
 * Get a specific entry by date
 */
async function getEntry(date) {
  const formattedDate = formatDate(date);
  console.log(`[FIREBASE] Fetching entry for: ${formattedDate}`);
  
  try {
    const doc = await window.firebaseDb
      .collection(ENTRIES_COLLECTION)
      .doc(formattedDate)
      .get();
    
    if (doc.exists) {
      const data = doc.data();
      return {
        date: formattedDate,
        person1: {
          color: data.person1?.color || DEFAULT_COLORS.stefano,
          entry: data.person1?.entry || ''
        },
        person2: {
          color: data.person2?.color || DEFAULT_COLORS.yesim,
          entry: data.person2?.entry || ''
        }
      };
    } else {
      // Return empty entry
      return {
        date: formattedDate,
        person1: { color: DEFAULT_COLORS.stefano, entry: '' },
        person2: { color: DEFAULT_COLORS.yesim, entry: '' }
      };
    }
  } catch (error) {
    console.error('[FIREBASE] Error fetching entry:', error);
    // Fallback to local storage
    const entries = getLocalEntries();
    return entries[formattedDate] || {
      date: formattedDate,
      person1: { color: DEFAULT_COLORS.stefano, entry: '' },
      person2: { color: DEFAULT_COLORS.yesim, entry: '' }
    };
  }
}

/**
 * Save an entry to Firestore
 * Merges with existing data to preserve other user's entries
 * @param {string} date - Entry date
 * @param {Object} person1Data - {color, entry}
 * @param {Object} person2Data - {color, entry}
 * @param {string} savingUser - 'stefano' or 'yesim'
 */
async function saveEntry(date, person1Data, person2Data, savingUser) {
  const formattedDate = formatDate(date);
  console.log(`[FIREBASE] Saving entry for: ${formattedDate}, user: ${savingUser}`);
  
  try {
    // First, fetch existing entry to merge
    let existingEntry;
    try {
      existingEntry = await getEntry(formattedDate);
    } catch (e) {
      console.warn('[FIREBASE] Could not fetch existing entry, using defaults');
      existingEntry = null;
    }
    
    // Prepare merged data
    let finalPerson1Data, finalPerson2Data;
    
    if (savingUser === 'stefano') {
      // Stefano is saving - update person1, keep existing person2
      finalPerson1Data = person1Data;
      finalPerson2Data = existingEntry ? existingEntry.person2 : person2Data;
    } else {
      // Yeşim is saving - keep existing person1, update person2
      finalPerson1Data = existingEntry ? existingEntry.person1 : person1Data;
      finalPerson2Data = person2Data;
    }
    
    // Prepare document data
    const docData = {
      date: formattedDate,
      person1: {
        color: finalPerson1Data.color,
        entry: finalPerson1Data.entry,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      person2: {
        color: finalPerson2Data.color,
        entry: finalPerson2Data.entry,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Set with merge to update only provided fields
    await window.firebaseDb
      .collection(ENTRIES_COLLECTION)
      .doc(formattedDate)
      .set(docData, { merge: true });
    
    console.log('[FIREBASE] Entry saved successfully');
    
    // Update local cache
    const entries = getLocalEntries();
    entries[formattedDate] = {
      date: formattedDate,
      person1: finalPerson1Data,
      person2: finalPerson2Data
    };
    localStorage.setItem('journal_entries', JSON.stringify(entries));
    
    return { success: true, data: docData };
  } catch (error) {
    console.error('[FIREBASE] Error saving entry:', error);
    // Fallback to local storage
    return saveLocalEntry({
      date: formattedDate,
      person1Color: person1Data.color,
      person1Entry: person1Data.entry,
      person2Color: person2Data.color,
      person2Entry: person2Data.entry
    });
  }
}

/**
 * Delete an entry
 */
async function deleteEntry(date) {
  const formattedDate = formatDate(date);
  console.log(`[FIREBASE] Deleting entry for: ${formattedDate}`);
  
  try {
    await window.firebaseDb
      .collection(ENTRIES_COLLECTION)
      .doc(formattedDate)
      .delete();
    
    console.log('[FIREBASE] Entry deleted successfully');
    
    // Update local cache
    const entries = getLocalEntries();
    delete entries[formattedDate];
    localStorage.setItem('journal_entries', JSON.stringify(entries));
    
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error deleting entry:', error);
    // Fallback to local storage
    return deleteLocalEntry(formattedDate);
  }
}

/**
 * Get entries for a specific month - TIMEZONE SAFE
 */
async function getMonthEntries(year, month) {
  console.log(`[FIREBASE] Fetching entries for: ${year}-${month + 1}`);
  
  try {
    // Get all entries and filter (Firestore doesn't support range queries well on document IDs)
    const allEntries = await getAllEntries();
    const monthEntries = {};
    
    Object.keys(allEntries).forEach(dateKey => {
      // Use timezone-safe parsing
      const parts = parseDateParts(dateKey);
      if (parts && parts.year === year && parts.month === month) {
        monthEntries[dateKey] = allEntries[dateKey];
        console.log(`[FIREBASE] Including entry: ${dateKey}`);
      }
    });
    
    console.log(`[FIREBASE] Found ${Object.keys(monthEntries).length} entries for month`);
    return monthEntries;
  } catch (error) {
    console.error('[FIREBASE] Error fetching month entries:', error);
    return {};
  }
}

/**
 * Listen to real-time updates for a specific date
 * For auto-sync when other user updates
 */
function listenToEntry(date, callback) {
  const formattedDate = formatDate(date);
  console.log(`[FIREBASE] Starting listener for: ${formattedDate}`);
  
  return window.firebaseDb
    .collection(ENTRIES_COLLECTION)
    .doc(formattedDate)
    .onSnapshot(doc => {
      let entry;
      
      if (doc.exists) {
        const data = doc.data();
        entry = {
          date: formattedDate,
          person1: {
            color: data.person1?.color || DEFAULT_COLORS.stefano,
            entry: data.person1?.entry || ''
          },
          person2: {
            color: data.person2?.color || DEFAULT_COLORS.yesim,
            entry: data.person2?.entry || ''
          }
        };
      } else {
        // Document doesn't exist yet - return empty entry
        entry = {
          date: formattedDate,
          person1: { color: DEFAULT_COLORS.stefano, entry: '' },
          person2: { color: DEFAULT_COLORS.yesim, entry: '' }
        };
      }
      
      console.log(`[FIREBASE] Real-time update received for: ${formattedDate}`);
      callback(entry);
    }, error => {
      console.error('[FIREBASE] Listener error:', error);
    });
}

/**
 * Listen to all entries for calendar updates
 */
function listenToAllEntries(callback) {
  console.log('[FIREBASE] Starting listener for all entries');
  
  return window.firebaseDb
    .collection(ENTRIES_COLLECTION)
    .onSnapshot(snapshot => {
      const entries = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        entries[doc.id] = {
          date: doc.id,
          person1: {
            color: data.person1?.color || DEFAULT_COLORS.stefano,
            entry: data.person1?.entry || ''
          },
          person2: {
            color: data.person2?.color || DEFAULT_COLORS.yesim,
            entry: data.person2?.entry || ''
          }
        };
      });
      
      console.log('[FIREBASE] Real-time update for all entries:', Object.keys(entries).length);
      callback(entries);
    }, error => {
      console.error('[FIREBASE] Listener error:', error);
    });
}

/**
 * Check if Firestore is configured and available
 */
function isConfigured() {
  return !!window.firebaseDb;
}

/**
 * Show configuration warning
 */
function showConfigWarning() {
  console.warn('Firebase not configured. Using local storage fallback.');
  return false;
}

/**
 * LOCAL STORAGE FALLBACK
 * These functions work when Firebase is not available
 */

function getLocalEntries() {
  try {
    const stored = localStorage.getItem('journal_entries');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('[LOCAL] Error reading from localStorage:', error);
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
    console.error('[LOCAL] Error saving to localStorage:', error);
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
    console.error('[LOCAL] Error deleting from localStorage:', error);
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

// Export functions for use in other scripts
window.SheetsAPI = {
  getAllEntries,
  getEntry,
  saveEntry,
  deleteEntry,
  getMonthEntries,
  listenToEntry,
  listenToAllEntries,
  formatDate,
  formatDateFromParts,
  parseDate,
  parseDateParts,
  isConfigured,
  CONFIG: {}
};

console.log('[FIREBASE] Storage layer initialized');
