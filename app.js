// Application state
let appState = {
    event: {
        venue: "Sepang International Circuit",
        hashtag: "#MalaysianGP",
        totalLaps: 20,
        currentLap: 3,
        flag: "no-light"
    },
    riders: [],
    ui: {
        expandSlug: false,
        showTower: false,  // Start with tower hidden
        showStrip: false,   // Start with timing strip hidden
        showWeather: false  // Start with weather hidden
    },
    weather: {
        icon: "sunny.svg",
        conditions: "Clear",
        temperature: "24°C",
        windDirection: "NW",
        windSpeed: "15 km/h"
    }
};

// DOM elements
const elements = {
    bug: document.getElementById('bug'),
    tower: document.getElementById('tower'),
    timingStrip: document.getElementById('timingStrip'),
    weather: document.getElementById('weather'),
    controlBar: document.getElementById('controlBar'),
    bugPanel: document.querySelector('.bug-panel'),
    bugLogo: document.querySelector('.bug-logo'),
    bugSlug: document.getElementById('bugSlug'),
    hashtagLine: document.getElementById('hashtagLine'),
    flagNotification: document.getElementById('flagNotification'),
    hashtag: document.getElementById('hashtag'),
    currentLap: document.getElementById('currentLap'),
    totalLaps: document.getElementById('totalLaps'),
    progressBar: document.getElementById('progressBar'),
    riderRows: document.getElementById('riderRows'),
    stripRows: document.getElementById('stripRows'),
    weatherIcon: document.getElementById('weatherIcon'),
    weatherConditions: document.getElementById('weatherConditions'),
    temperature: document.getElementById('temperature'),
    windDirection: document.getElementById('windDirection'),
    windSpeed: document.getElementById('windSpeed'),
    currentLapInput: document.getElementById('currentLapInput'),
    totalLapsInput: document.getElementById('totalLapsInput'),
    flagNoLight: document.getElementById('flagNoLight'),
    flagGreen: document.getElementById('flagGreen'),
    flagYellow: document.getElementById('flagYellow'),
    flagRed: document.getElementById('flagRed'),
    expandSlug: document.getElementById('expandSlug'),
    showTower: document.getElementById('showTower'),
    showStrip: document.getElementById('showStrip'),
    showWeather: document.getElementById('showWeather')
};

// Animation timing
let mouseTimer;
let revealAnimationInProgress = false;

// Flag notification timers
let flagNotificationTimer;
let currentFlagState = null;

// Initialize application
async function init() {
    await loadSampleData();
    loadStateFromStorage();
    setupEventListeners();
    
    // Initialize flag notification based on current state
    handleFlagNotification(appState.event.flag);
    
    updateUI();  // Make sure this runs after data is loaded
    renderRiders();
    renderStripRiders();
    
    console.log('Motorsport Broadcast Graphics Overlay initialized');
    console.log('Event:', appState.event.venue, appState.event.hashtag);
    console.log('Keyboard shortcuts: B (bug), T (tower), S (strip), W (weather), G/Y/R (flags), [/] (laps)');
}

// Load sample data from JSON
async function loadSampleData() {
    try {
        const response = await fetch('assets/sample-data.json');
        const data = await response.json();
        
        if (data.event) {
            appState.event = { ...appState.event, ...data.event };
        }
        
        if (data.riders) {
            appState.riders = data.riders;
        }
    } catch (error) {
        console.warn('Could not load sample data, using defaults:', error);
        // Use fallback data if file doesn't exist
        appState.riders = generateFallbackRiders();
    }
}

// Generate fallback rider data
function generateFallbackRiders() {
    const riders = [
        { pos: 1, first: "E", last: "ERR", num: 1, teamColor: "#ff0000" },
        { pos: 2, first: "E", last: "ERR", num: 2, teamColor: "#ff0000" },
        { pos: 3, first: "E", last: "ERR", num: 3, teamColor: "#ff0000" },
        { pos: 4, first: "E", last: "ERR", num: 4, teamColor: "#ff0000" },
        { pos: 5, first: "E", last: "ERR", num: 5, teamColor: "#ff0000" },
        { pos: 6, first: "E", last: "ERR", num: 6, teamColor: "#ff0000" },
        { pos: 7, first: "E", last: "ERR", num: 7, teamColor: "#ff0000" },
        { pos: 8, first: "E", last: "ERR", num: 8, teamColor: "#ff0000" },
        { pos: 9, first: "E", last: "ERR", num: 9, teamColor: "#ff0000" },
        { pos: 10, first: "E", last: "ERR", num: 10, teamColor: "#ff0000" },
        { pos: 11, first: "E", last: "ERR", num: 11, teamColor: "#ff0000" },
        { pos: 12, first: "E", last: "ERR", num: 12, teamColor: "#ff0000" },
        { pos: 13, first: "E", last: "ERR", num: 13, teamColor: "#ff0000" },
        { pos: 14, first: "E", last: "ERR", num: 14, teamColor: "#ff0000" },
        { pos: 15, first: "E", last: "ERR", num: 15, teamColor: "#ff0000" },
        { pos: 16, first: "E", last: "ERR", num: 16, teamColor: "#ff0000" },
        { pos: 17, first: "E", last: "ERR", num: 17, teamColor: "#ff0000" },
        { pos: 18, first: "E", last: "ERR", num: 18, teamColor: "#ff0000" },
        { pos: 19, first: "E", last: "ERR", num: 19, teamColor: "#ff0000" },
        { pos: 20, first: "E", last: "ERR", num: 20, teamColor: "#ff0000" },
        { pos: 21, first: "E", last: "ERR", num: 21, teamColor: "#ff0000" },
        { pos: 22, first: "E", last: "ERR", num: 22, teamColor: "#ff0000" }
    ];
    return riders;
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyPress);
    
    // Mouse movement for control panel
    document.addEventListener('mousemove', showControlPanel);
    
    // Control panel inputs
    elements.currentLapInput.addEventListener('input', updateCurrentLap);
    elements.totalLapsInput.addEventListener('input', updateTotalLaps);
    
    // Flag buttons
    elements.flagNoLight.addEventListener('click', () => setFlag('no-light'));
    elements.flagGreen.addEventListener('click', () => setFlag('green'));
    elements.flagYellow.addEventListener('click', () => setFlag('yellow'));
    elements.flagRed.addEventListener('click', () => setFlag('red'));
    
    // Toggle controls
    elements.expandSlug.addEventListener('change', toggleBugSlug);
    elements.showTower.addEventListener('change', toggleTower);
    elements.showStrip.addEventListener('change', toggleStrip);
    elements.showWeather.addEventListener('change', toggleWeather);
}

// Handle keyboard shortcuts
function handleKeyPress(event) {
    const key = event.key.toLowerCase();
    
    switch (key) {
        case 'b':
            toggleBugSlug();
            break;
        case 't':
            toggleTower();
            break;
        case 's':
            toggleStrip();
            break;
        case 'w':
            toggleWeather();
            break;
        case 'n':
            setFlag('no-light');
            break;
        case 'g':
            setFlag('green');
            break;
        case 'y':
            setFlag('yellow');
            break;
        case 'r':
            setFlag('red');
            break;
        case '[':
            setLap(Math.max(1, appState.event.currentLap - 1), appState.event.totalLaps);
            break;
        case ']':
            setLap(Math.min(appState.event.totalLaps, appState.event.currentLap + 1), appState.event.totalLaps);
            break;
    }
}

// Show control panel on mouse movement
function showControlPanel() {
    elements.controlBar.classList.add('show');
    
    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => {
        elements.controlBar.classList.remove('show');
    }, 3000);
}

// Update UI based on state
function updateUI() {
    // Update text content
    // Flag notification is handled by handleFlagNotification() function
    elements.hashtag.textContent = appState.event.hashtag;
    elements.currentLap.textContent = appState.event.currentLap;
    elements.totalLaps.textContent = appState.event.totalLaps;
    
    // Update form inputs
    elements.currentLapInput.value = appState.event.currentLap;
    elements.totalLapsInput.value = appState.event.totalLaps;
    
    // Update progress bar
    const progress = (appState.event.currentLap / appState.event.totalLaps) * 100;
    elements.progressBar.style.width = `${progress}%`;
    elements.progressBar.className = `progress-bar ${appState.event.flag}`;
    
    // Update flag buttons
    document.querySelectorAll('.flag-btn').forEach(btn => btn.classList.remove('active'));
    if (appState.event.flag === 'no-light') {
        elements.flagNoLight.classList.add('active');
    } else {
        elements[`flag${appState.event.flag.charAt(0).toUpperCase() + appState.event.flag.slice(1)}`].classList.add('active');
    }
    
    // Update UI toggles
    elements.expandSlug.checked = appState.ui.expandSlug;
    elements.showTower.checked = appState.ui.showTower;
    elements.showStrip.checked = appState.ui.showStrip;
    elements.showWeather.checked = appState.ui.showWeather;
    
    // Update weather data
    elements.weatherIcon.src = `assets/weather_icons/${appState.weather.icon}`;
    elements.weatherConditions.textContent = appState.weather.conditions;
    elements.temperature.textContent = appState.weather.temperature;
    elements.windDirection.textContent = appState.weather.windDirection;
    elements.windSpeed.textContent = appState.weather.windSpeed;
    
    // Apply visibility states - bug is always visible, hashtag is always visible
    // Flag notifications take priority over manual expansion
    const flagRequiresExpansion = ['green', 'yellow', 'red'].includes(appState.event.flag);
    if (!flagRequiresExpansion) {
        // Only apply manual expansion if no flag notification is active
        elements.bug.classList.toggle('expanded', appState.ui.expandSlug);
    }
    elements.bug.classList.toggle('tower-open', appState.ui.showTower);
    elements.bug.classList.toggle('weather-open', appState.ui.showWeather);
    elements.tower.classList.toggle('show', appState.ui.showTower);
    elements.timingStrip.classList.toggle('show', appState.ui.showStrip);
    elements.weather.classList.toggle('show', appState.ui.showWeather);
}

// Render rider rows
function renderRiders() {
    elements.riderRows.innerHTML = '';
    
    // Limit to maximum 17 riders
    const maxRiders = 17;
    const ridersToShow = appState.riders.slice(0, maxRiders);
    
    ridersToShow.forEach((rider, index) => {
        const row = createRiderRow(rider, index);
        elements.riderRows.appendChild(row);
    });
    
    // Add empty rows to maintain consistent height if less than 17 riders
    const emptyRowsNeeded = maxRiders - ridersToShow.length;
    for (let i = 0; i < emptyRowsNeeded; i++) {
        const emptyRow = document.createElement('div');
        emptyRow.className = 'rider-row empty-row';
        emptyRow.style.height = `${44}px`; // var(--row-h)
        elements.riderRows.appendChild(emptyRow);
    }
    
    // Trigger reveal animation if tower is visible
    if (appState.ui.showTower && !revealAnimationInProgress) {
        animateRowReveal();
    }
}

// Render timing strip riders (horizontal)
function renderStripRiders() {
    elements.stripRows.innerHTML = '';
    
    // Limit to maximum 15 riders for horizontal layout
    const maxRiders = 15;
    const ridersToShow = appState.riders.slice(0, maxRiders);
    
    ridersToShow.forEach((rider, index) => {
        const stripItem = createStripRiderItem(rider, index);
        elements.stripRows.appendChild(stripItem);
    });
    
    // Trigger reveal animation if strip is visible
    if (appState.ui.showStrip && !revealAnimationInProgress) {
        animateStripReveal();
    }
}

// Create individual timing strip rider item
function createStripRiderItem(rider, index) {
    const item = document.createElement('div');
    item.className = 'strip-rider';
    item.dataset.riderId = rider.num;
    
    // Truncate last name to 3 characters maximum
    const truncatedLastName = rider.last.substring(0, 3).toUpperCase();
    
    // Set CSS custom property for team color animation
    item.style.setProperty('--team-color', rider.teamColor);
    
    item.innerHTML = `
        <div class="position">${rider.pos}</div>
        <div class="rider-name">
            <span class="first-name">${rider.first}</span>
            <span class="last-name">${truncatedLastName}</span>
        </div>
        <div class="rider-number" style="background-color: ${rider.teamColor}">${rider.num}</div>
    `;
    
    return item;
}

// Create individual rider row
function createRiderRow(rider, index) {
    const row = document.createElement('div');
    row.className = 'rider-row';
    row.dataset.riderId = rider.num;
    
    // Truncate last name to 3 characters maximum
    const truncatedLastName = rider.last.substring(0, 3).toUpperCase();
    
    row.innerHTML = `
        <div class="position">${rider.pos}</div>
        <div class="rider-name">
            <span class="first-name">${rider.first}</span>
            <span class="last-name">${truncatedLastName}</span>
        </div>
        <div class="rider-number" style="background-color: ${rider.teamColor}">${rider.num}</div>
    `;
    
    return row;
}

// Animate row reveal with team colors - Rebuilt from scratch
function animateRowReveal() {
    if (revealAnimationInProgress) return;
    revealAnimationInProgress = true;
    
    const rows = elements.riderRows.querySelectorAll('.rider-row:not(.empty-row)');
    
    rows.forEach((row, index) => {
        const riderId = row.dataset.riderId;
        const rider = appState.riders.find(r => r.num == riderId);
        
        if (rider) {
            setTimeout(() => {
                // Set the team color for the ::before pseudo-element
                row.style.setProperty('--team-color', rider.teamColor);
                
                // Start the reveal animation
                row.classList.add('revealed');
                
                // Trigger the swipe animation
                requestAnimationFrame(() => {
                    row.classList.add('animate');
                });
                
                // Mark animation complete after last row
                if (index === rows.length - 1) {
                    setTimeout(() => {
                        revealAnimationInProgress = false;
                    }, 500);
                }
            }, index * 60);
        }
    });
}

// Animate timing strip reveal with team colors
function animateStripReveal() {
    if (revealAnimationInProgress) return;
    revealAnimationInProgress = true;
    
    const stripItems = elements.stripRows.querySelectorAll('.strip-rider');
    
    stripItems.forEach((item, index) => {
        const riderId = item.dataset.riderId;
        const rider = appState.riders.find(r => r.num == riderId);
        
        if (rider) {
            setTimeout(() => {
                // Set the team color for the ::before pseudo-element
                item.style.setProperty('--team-color', rider.teamColor);
                
                // Start the reveal animation
                item.classList.add('revealed');
                
                // Trigger the swipe animation
                requestAnimationFrame(() => {
                    item.classList.add('animate');
                });
                
                // Mark animation complete after last item
                if (index === stripItems.length - 1) {
                    setTimeout(() => {
                        revealAnimationInProgress = false;
                    }, 500);
                }
            }, index * 60);
        }
    });
}

// Update current lap
function updateCurrentLap() {
    const value = parseInt(elements.currentLapInput.value) || 1;
    setLap(value, appState.event.totalLaps);
}

// Update total laps
function updateTotalLaps() {
    const value = parseInt(elements.totalLapsInput.value) || 1;
    setLap(appState.event.currentLap, value);
}

// Set lap values
function setLap(current, total) {
    appState.event.currentLap = Math.max(1, Math.min(total, current));
    appState.event.totalLaps = Math.max(1, total);
    
    updateUI();
    saveStateToStorage();
}

// Set flag state
function setFlag(color) {
    if (['no-light', 'green', 'yellow', 'red'].includes(color)) {
        appState.event.flag = color;
        handleFlagNotification(color);
        updateUI();
        saveStateToStorage();
    }
}

// Handle flag notification display logic
function handleFlagNotification(flag) {
    // Clear any existing timer
    if (flagNotificationTimer) {
        clearTimeout(flagNotificationTimer);
        flagNotificationTimer = null;
    }
    
    // Remove any existing flag classes from the bug-slug container
    elements.bugSlug.classList.remove('green', 'yellow', 'red');
    
    // Remove flag-active class from panel and logo
    elements.bugPanel.classList.remove('flag-active');
    elements.bugLogo.classList.remove('flag-active');
    
    switch (flag) {
        case 'green':
            // Green flag: expand for 2 seconds then retract
            elements.flagNotification.textContent = 'GREEN FLAG';
            elements.bugSlug.classList.add('green');
            elements.bug.classList.add('expanded');
            elements.bugPanel.classList.add('flag-active');
            elements.bugLogo.classList.add('flag-active');
            
            flagNotificationTimer = setTimeout(() => {
                elements.bug.classList.remove('expanded');
                elements.bugSlug.classList.remove('green');
                elements.bugPanel.classList.remove('flag-active');
                elements.bugLogo.classList.remove('flag-active');
            }, 2000);
            break;
            
        case 'yellow':
            // Yellow flag: expand and stay out until cleared
            elements.flagNotification.textContent = 'YELLOW FLAG';
            elements.bugSlug.classList.add('yellow');
            elements.bug.classList.add('expanded');
            elements.bugPanel.classList.add('flag-active');
            elements.bugLogo.classList.add('flag-active');
            // No timer - stays expanded until flag changes
            break;
            
        case 'red':
            // Red flag: expand and flash
            elements.flagNotification.textContent = 'RED FLAG';
            elements.bugSlug.classList.add('red');
            elements.bug.classList.add('expanded');
            elements.bugPanel.classList.add('flag-active');
            elements.bugLogo.classList.add('flag-active');
            // No timer - stays expanded until flag changes
            break;
            
        case 'no-light':
            // No light: retract immediately
            elements.bug.classList.remove('expanded');
            elements.flagNotification.textContent = '';
            break;
    }
    
    currentFlagState = flag;
}

// Toggle bug slug expansion
function toggleBugSlug() {
    appState.ui.expandSlug = !appState.ui.expandSlug;
    elements.expandSlug.checked = appState.ui.expandSlug;
    updateUI();
    saveStateToStorage();
}

// Reset tower animation state
function resetTowerAnimationState() {
    revealAnimationInProgress = false;
    const rows = elements.riderRows.querySelectorAll('.rider-row');
    rows.forEach(row => {
        row.classList.remove('revealed', 'animate', 'moving');
        row.style.transform = '';
        row.style.setProperty('--team-color', '');
    });
}

// Reset timing strip animation state
function resetStripAnimationState() {
    revealAnimationInProgress = false;
    const stripItems = elements.stripRows.querySelectorAll('.strip-rider');
    stripItems.forEach(item => {
        item.classList.remove('revealed', 'animate', 'moving');
        item.style.transform = '';
        item.style.setProperty('--team-color', '');
    });
}

// Toggle tower visibility
function toggleTower() {
    appState.ui.showTower = !appState.ui.showTower;
    elements.showTower.checked = appState.ui.showTower;
    updateUI();
    saveStateToStorage();
    
    if (appState.ui.showTower) {
        // Reset animation state and trigger reveal animation when tower opens
        resetTowerAnimationState();
        setTimeout(() => {
            renderRiders();
        }, 250);
    } else {
        // Reset animation state when tower closes
        resetTowerAnimationState();
    }
}

// Toggle timing strip visibility
function toggleStrip() {
    appState.ui.showStrip = !appState.ui.showStrip;
    elements.showStrip.checked = appState.ui.showStrip;
    updateUI();
    saveStateToStorage();
    
    if (appState.ui.showStrip) {
        // Reset animation state and trigger reveal animation when strip opens
        resetStripAnimationState();
        setTimeout(() => {
            renderStripRiders();
        }, 250);
    } else {
        // Reset animation state when strip closes
        resetStripAnimationState();
    }
}

// Toggle weather visibility
function toggleWeather() {
    appState.ui.showWeather = !appState.ui.showWeather;
    elements.showWeather.checked = appState.ui.showWeather;
    updateUI();
    saveStateToStorage();
}

// Toggle hashtag visibility
function toggleHashtag() {
    // Hashtag is always visible now - remove this function
}

// Update riders data and animate reorder
function updateRiders(newRiders) {
    const oldPositions = new Map();
    
    // Store current positions
    appState.riders.forEach(rider => {
        oldPositions.set(rider.num, rider.pos);
    });
    
    // Update data
    appState.riders = newRiders;
    
    // Animate reorder using FLIP technique
    animateReorder(oldPositions);
    
    saveStateToStorage();
}

// Animate rider reordering
function animateReorder(oldPositions) {
    const rows = elements.riderRows.querySelectorAll('.rider-row');
    const rowHeight = 44; // --row-h from CSS
    
    // First: Record current positions
    const firstPositions = new Map();
    rows.forEach(row => {
        const riderId = row.dataset.riderId;
        const rect = row.getBoundingClientRect();
        firstPositions.set(riderId, rect.top);
    });
    
    // Last: Update DOM
    renderRiders();
    renderStripRiders();
    
    // Invert: Calculate differences and apply transforms
    const newRows = elements.riderRows.querySelectorAll('.rider-row');
    newRows.forEach(row => {
        const riderId = row.dataset.riderId;
        const firstTop = firstPositions.get(riderId);
        const lastTop = row.getBoundingClientRect().top;
        const deltaY = firstTop - lastTop;
        
        if (deltaY !== 0) {
            row.style.transform = `translateY(${deltaY}px)`;
            row.classList.add('moving');
        }
    });
    
    // Play: Animate to final positions
    requestAnimationFrame(() => {
        newRows.forEach(row => {
            row.style.transform = '';
        });
        
        // Clean up after animation
        setTimeout(() => {
            newRows.forEach(row => {
                row.classList.remove('moving');
            });
        }, 300);
    });
}

// Save state to localStorage
function saveStateToStorage() {
    try {
        localStorage.setItem('motorsportOverlayState', JSON.stringify({
            event: appState.event,
            ui: appState.ui
        }));
    } catch (error) {
        console.warn('Could not save state to localStorage:', error);
    }
}

// Load state from localStorage
function loadStateFromStorage() {
    try {
        const saved = localStorage.getItem('motorsportOverlayState');
        if (saved) {
            const parsedState = JSON.parse(saved);
            // Only load UI state and lap info, preserve venue/hashtag from JSON
            // Don't load flag state to always start with default/JSON flag
            if (parsedState.event) {
                appState.event.currentLap = parsedState.event.currentLap || appState.event.currentLap;
                appState.event.totalLaps = parsedState.event.totalLaps || appState.event.totalLaps;
                // appState.event.flag = parsedState.event.flag || appState.event.flag; // Commented out to use default
                // Don't override venue/hashtag from localStorage
            }
            if (parsedState.ui) {
                appState.ui = { ...appState.ui, ...parsedState.ui };
            }
        }
    } catch (error) {
        console.warn('Could not load state from localStorage:', error);
    }
}

// Simulate live timing changes (for demo purposes)
function simulateRiderChange() {
    if (appState.riders.length < 2) return;
    
    // Randomly swap two riders
    const newRiders = [...appState.riders];
    const idx1 = Math.floor(Math.random() * Math.min(5, newRiders.length));
    const idx2 = Math.floor(Math.random() * Math.min(5, newRiders.length));
    
    if (idx1 !== idx2) {
        [newRiders[idx1].pos, newRiders[idx2].pos] = [newRiders[idx2].pos, newRiders[idx1].pos];
        newRiders.sort((a, b) => a.pos - b.pos);
        updateRiders(newRiders);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export functions for console access (development)
window.motorsportOverlay = {
    setFlag,
    setLap,
    updateRiders,
    toggleBugSlug,
    toggleTower,
    simulateRiderChange,
    getState: () => appState
};