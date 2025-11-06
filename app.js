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
        showWeather: false,  // Start with weather hidden
        autoWeather: false   // Start with auto weather disabled
    },
    weather: {
        icon: "sunny.svg",
        conditions: "Clear",
        temperature: "24°C",
        windDirection: "NW",
        windSpeed: "15 km/h",
        isError: false
    },
    weatherApi: {
        apiKey: "b3d099c80c975b69d647e14b7e9475d3",
        lastUpdate: null,
        location: null,
        latitude: null,
        longitude: null
    },
    lastTimingDataRaw: null // Store raw timing data to detect changes
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
    flagFinish: document.getElementById('flagFinish'),
    expandSlug: document.getElementById('expandSlug'),
    showTower: document.getElementById('showTower'),
    showStrip: document.getElementById('showStrip'),
    showWeather: document.getElementById('showWeather'),
    loadTimingData: document.getElementById('loadTimingData'),
    pauseRefresh: document.getElementById('pauseRefresh'),
    resumeRefresh: document.getElementById('resumeRefresh'),
    timingStatus: document.getElementById('timingStatus'),
    autoWeather: document.getElementById('autoWeather'),
    refreshWeather: document.getElementById('refreshWeather'),
    weatherStatus: document.getElementById('weatherStatus'),
    useMyLocation: document.getElementById('useMyLocation'),
    latitude: document.getElementById('latitude'),
    longitude: document.getElementById('longitude')
};

// Animation timing
let mouseTimer;
let revealAnimationInProgress = false;

// Flag notification timers
let flagNotificationTimer;
let currentFlagState = null;

// Timing refresh
let timingRefreshInterval;

// Weather refresh
let weatherRefreshInterval;

// Initialize application
async function init() {
    await loadSampleData();
    
    // Try to load live timing data first, fallback to sample data if not available
    const timingData = await loadTimingData();
    if (!timingData) {
        console.log('Live timing data not available, using sample data');
    }
    
    loadStateFromStorage();
    setupEventListeners();
    
    // Don't initialize flag notification - flags only show when H is pressed
    
    updateUI();  // Make sure this runs after data is loaded
    renderRiders();
    renderStripRiders();
    
    // Start auto-refresh of timing data if available
    if (timingData) {
        startTimingRefresh(1000); // Refresh every 1 second
    } else {
        // Initialize timing status even if no data loaded
        updateTimingStatus();
    }
    
    // Start weather refresh if auto weather is enabled
    if (appState.ui.autoWeather) {
        startWeatherRefresh();
    }
    
    console.log('Motorsport Broadcast Graphics Overlay initialized');
    console.log('Event:', appState.event.venue, appState.event.hashtag);
    console.log('Keyboard shortcuts: B (bug), T (tower), S (strip), W (weather), G/Y/R/F (flags), [/] (laps)');
    console.log('Weather API: Auto weather is', appState.ui.autoWeather ? 'ON' : 'OFF');
    console.log('Timing shortcuts: L (load timing data), P (pause refresh), Q (resume refresh), D (debug data)');
    console.log('Weather shortcuts: M (manual weather refresh), A (toggle auto weather)');
    console.log('Location: Use "Use My Location" button or enter coordinates manually');
    console.log('Flag shortcuts: G (green), Y (yellow), R (red), N (no-light), F (read from timing data), H (show for 2s then hide)');
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

// Enhanced timing data loading with error handling and status updates
async function loadTimingData() {
    try {
        const response = await fetch('timing_data.txt?' + Date.now()); // Cache busting
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        
        // Check if data has actually changed before parsing
        if (text === appState.lastTimingDataRaw) {
            // Data hasn't changed, no need to update UI
            return null;
        }
        
        const timingData = parseTimingData(text);
        
        // Store raw data for comparison
        appState.lastTimingDataRaw = text;
        
        // Update app state with timing data
        const hasChanges = updateStateFromTimingData(timingData);
        
        // Only update UI if there were actual changes
        if (hasChanges) {
            updateUI();
            
            // Don't trigger full reveal animations on data updates
            // Just update the content without animations
            updateRidersContent();
            updateStripContent();
            
            console.log(`Timing data updated at ${new Date().toLocaleTimeString()}`);
        }
        
        return timingData;
    } catch (error) {
        console.warn('Could not load timing data:', error.message);
        
        // Show error status briefly
        if (elements.timingStatus) {
            const originalText = elements.timingStatus.textContent;
            elements.timingStatus.textContent = 'ERROR: No timing data';
            elements.timingStatus.className = 'timing-status error';
            
            setTimeout(() => {
                updateTimingStatus();
            }, 3000);
        }
        
        return null;
    }
}

// Parse timing data text file format
function parseTimingData(text) {
    const lines = text.trim().split('\n');
    const data = {};
    
    // Parse each line in key=value format
    lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value !== undefined) {
            // Trim whitespace and handle empty values
            const trimmedValue = value.trim();
            data[key.trim()] = trimmedValue === '' ? '' : trimmedValue;
        }
    });
    
    // Extract race information
    const raceInfo = {
        totalLaps: parseInt(data.laps) || 9999,
        flag: data.flag || '',  // Keep empty string to properly map to no-light
        flagImage: data.flagimg || 'none.png'
    };
    
    // Extract positions data
    const positions = [];
    let posIndex = 1;
    
    while (data[`pos${posIndex}fname`] !== undefined) {
        const pos = {
            position: posIndex,
            firstName: data[`pos${posIndex}fname`] || '',
            lastName: data[`pos${posIndex}lname`] || '',
            number: data[`pos${posIndex}num`] || '',
            time: data[`pos${posIndex}time`] || '00.000',
            laps: parseInt(data[`pos${posIndex}laps`]) || 0,
            bestLap: parseInt(data[`pos${posIndex}blap`]) || 0,
            bestTime: data[`pos${posIndex}btime`] || '00.000',
            timeDiff: data[`pos${posIndex}diff`] || '',
            speed: parseInt(data[`pos${posIndex}speed`]) || 0,
            bestSpeed: parseInt(data[`pos${posIndex}bspeed`]) || 0,
            nationality: data[`pos${posIndex}nationality`] || '',
            additional: data[`pos${posIndex}additional`] || ''
        };
        positions.push(pos);
        posIndex++;
    }
    
    // Extract leader information
    const leader = {
        firstName: data.leaderfname || '',
        lastName: data.leaderlname || '',
        number: data.leadernum || '',
        bestLap: parseInt(data.leaderblap) || 0,
        bestTime: data.leaderbtime || '00.000',
        speed: parseInt(data.leaderspeed) || 0,
        bestSpeed: parseInt(data.leaderbspeed) || 0
    };
    
    // Extract fastest lap information
    const fastest = {
        firstName: data.fastestfname || '',
        lastName: data.fastestlname || '',
        number: data.fastestnum || '',
        bestLap: parseInt(data.fastestblap) || 0,
        bestTime: data.fastestbtime || '00.000',
        speed: parseInt(data.fastestspeed) || 0
    };
    
    return {
        race: raceInfo,
        positions,
        leader,
        fastest
    };
}

// Update application state from timing data
function updateStateFromTimingData(timingData) {
    if (!timingData) return false;
    
    let hasChanges = false;
    
    // Update race information - calculate total laps as laps + pos1laps
    if (timingData.positions.length > 0) {
        const leaderLaps = timingData.positions[0].laps; // pos1laps
        const baseLaps = timingData.race.totalLaps; // laps field
        
        // Calculate total as laps + pos1laps
        const newTotalLaps = baseLaps + leaderLaps;
        
        if (newTotalLaps !== appState.event.totalLaps) {
            appState.event.totalLaps = newTotalLaps;
            hasChanges = true;
        }
        
        // Update current lap from leader's lap count (pos1laps)
        if (leaderLaps > 0 && leaderLaps !== appState.event.currentLap) {
            appState.event.currentLap = leaderLaps;
            hasChanges = true;
        }
    }
    
    // Update flag status
    const flagMapping = {
        'Green': 'green',
        'Yellow': 'yellow',
        'Red': 'red',
        'Finish': 'finish',
        'green': 'green',
        'yellow': 'yellow', 
        'red': 'red',
        'finish': 'finish',
        '': 'no-light',
        undefined: 'no-light',
        null: 'no-light'
    };
    
    const newFlag = flagMapping[timingData.race.flag] || 'no-light';
    if (newFlag !== appState.event.flag) {
        appState.event.flag = newFlag;
        // Don't automatically show flag notification - only show when H is pressed
        hasChanges = true;
    }
    
    // Convert timing positions to rider format
    const newRiders = timingData.positions.map(pos => {
        const fullName = `${pos.firstName} ${pos.lastName}`.trim();
        
        return {
            pos: pos.position,
            first: pos.firstName || 'N/A',
            last: pos.lastName || '',
            num: pos.number || pos.position.toString(),
            time: pos.time !== '00.000' ? pos.time : '--:--',
            gap: pos.timeDiff || (pos.position === 1 ? 'LEADER' : '--'),
            bestLap: pos.bestTime !== '00.000' ? pos.bestTime : '--:--',
            speed: pos.speed > 0 ? `${pos.speed} km/h` : '--',
            nationality: pos.nationality || '',
            teamColor: getTeamColor(pos.position), // Generate color based on position
            additional: pos.additional || ''
        };
    });
    
    // Check if rider data has changed
    if (!ridersAreEqual(appState.riders, newRiders)) {
        // Check if this is a position reorder (for animation)
        const isReorder = appState.riders.length === newRiders.length && 
                         appState.riders.every(oldRider => 
                             newRiders.some(newRider => newRider.num === oldRider.num));
        
        if (isReorder && (appState.ui.showTower || appState.ui.showStrip)) {
            // Use reorder animation for position changes
            updateRiders(newRiders);
        } else {
            // Simple update without animation
            appState.riders = newRiders;
        }
        hasChanges = true;
    }
    
    // Store leader and fastest lap info for potential display
    appState.leader = timingData.leader;
    appState.fastest = timingData.fastest;
    
    return hasChanges;
}

// Helper function to compare rider arrays for changes
function ridersAreEqual(riders1, riders2) {
    if (riders1.length !== riders2.length) {
        return false;
    }
    
    for (let i = 0; i < riders1.length; i++) {
        const r1 = riders1[i];
        const r2 = riders2[i];
        
        // Compare key fields that would trigger a visual update
        if (r1.pos !== r2.pos ||
            r1.first !== r2.first ||
            r1.last !== r2.last ||
            r1.num !== r2.num ||
            r1.time !== r2.time ||
            r1.gap !== r2.gap ||
            r1.bestLap !== r2.bestLap ||
            r1.speed !== r2.speed) {
            return false;
        }
    }
    
    return true;
}

// Generate team colors for positions (all white for now since we don't have team color data)
function getTeamColor(position) {
    // Return white for all riders since we don't have team color information
    return '#ffffff';
}

// Auto-refresh timing data at intervals
function startTimingDataRefresh(intervalMs = 1000) {
    setInterval(async () => {
        await loadTimingData();
    }, intervalMs);
}

// Stop timing data refresh
function startTimingRefresh(intervalMs = 1000) {
    if (timingRefreshInterval) {
        clearInterval(timingRefreshInterval);
    }
    
    timingRefreshInterval = setInterval(async () => {
        await loadTimingData();
    }, intervalMs);
    
    updateTimingStatus();
    console.log(`Timing data refresh started (${intervalMs}ms interval)`);
}

function stopTimingRefresh() {
    if (timingRefreshInterval) {
        clearInterval(timingRefreshInterval);
        timingRefreshInterval = null;
        updateTimingStatus();
        console.log('Timing data refresh stopped');
    }
}

// Weather API Functions
// Get user location using browser geolocation API or manual coordinates
async function getUserLocation() {
    try {
        // First check if we have manual coordinates
        if (appState.weatherApi.latitude && appState.weatherApi.longitude) {
            console.log('🌍 Using manual coordinates:', appState.weatherApi.latitude, appState.weatherApi.longitude);
            return {
                latitude: appState.weatherApi.latitude,
                longitude: appState.weatherApi.longitude,
                source: 'manual'
            };
        }
        
        // Try browser geolocation if available
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by this browser');
        }
        
        console.log('🌍 Requesting browser location...');
        
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('🌍 Browser location obtained:', position.coords.latitude, position.coords.longitude);
                    resolve(position);
                },
                (error) => {
                    console.log('🌍 Browser location failed:', error.message);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
        
        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'browser'
        };
    } catch (error) {
        console.error('🌍 Location detection failed:', error.message);
        throw new Error('Location unavailable. Please set coordinates manually.');
    }
}

// Request browser location and save to manual coordinates
async function requestBrowserLocation() {
    try {
        updateWeatherStatus('Getting your location...');
        
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by this browser');
        }
        
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000 // 1 minute
                }
            );
        });
        
        // Save coordinates to state and UI
        appState.weatherApi.latitude = position.coords.latitude;
        appState.weatherApi.longitude = position.coords.longitude;
        
        elements.latitude.value = position.coords.latitude.toFixed(4);
        elements.longitude.value = position.coords.longitude.toFixed(4);
        
        updateWeatherStatus('Location detected!');
        saveStateToStorage();
        
        console.log('✅ Browser location saved:', position.coords.latitude, position.coords.longitude);
        
        // If auto weather is enabled, refresh weather data
        if (appState.ui.autoWeather) {
            setTimeout(() => updateWeatherFromAPI(), 1000);
        }
        
    } catch (error) {
        console.error('❌ Browser location request failed:', error.message);
        
        let errorMsg = 'Location request failed';
        if (error.code === 1) {
            errorMsg = 'Location access denied';
        } else if (error.code === 2) {
            errorMsg = 'Location unavailable';
        } else if (error.code === 3) {
            errorMsg = 'Location request timeout';
        }
        
        updateWeatherStatus(errorMsg);
        
        // Clear the status after 3 seconds
        setTimeout(() => updateWeatherStatus(), 3000);
    }
}

async function fetchWeatherData(lat, lon, apiKey) {
    try {
        // Use wttr.in free weather service - no API key required
        const url = `https://wttr.in/${lat},${lon}?format=j1`;
        console.log('🌤️ Weather API URL:', url);
        
        const response = await fetch(url);
        console.log('🌤️ Weather API response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('🌤️ Weather API error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🌤️ Weather API response data:', data);
        
        const current = data.current_condition[0];
        const weather = data.current_condition[0];
        
        // Map weather condition to icon using wttr.in weather codes
        const iconName = mapWttrWeatherCodeToIcon(parseInt(current.weatherCode));
        
        // Format wind direction from degrees
        const windDirection = degreesToCompass(parseInt(current.winddirDegree || 0));
        
        const weatherResult = {
            icon: iconName,
            conditions: current.weatherDesc[0].value,
            temperature: `${current.temp_C}°C`,
            windDirection: windDirection,
            windSpeed: `${current.windspeedKmph} km/h`,
            location: `Lat: ${lat}, Lon: ${lon}`
        };
        
        console.log('🌤️ Formatted weather result:', weatherResult);
        return weatherResult;
    } catch (error) {
        console.error('🌤️ Weather API failed:', error.message);
        throw error;
    }
}

// Map wttr.in weather condition codes to local weather icons
function mapWttrWeatherCodeToIcon(weatherCode) {
    // wttr.in weather codes: https://github.com/chubin/wttr.in/blob/master/lib/constants.py
    
    // Clear
    if (weatherCode === 113) return 'sunny.svg';
    
    // Partly cloudy
    if (weatherCode === 116) return 'partly_cloudy.svg';
    
    // Cloudy
    if (weatherCode === 119) return 'cloudy.svg';
    if (weatherCode === 122) return 'mostly_cloudy.svg';
    
    // Mist / Fog
    if ([143, 248, 260].includes(weatherCode)) return 'mist.svg';
    
    // Rain
    if ([176, 263, 266, 293, 296].includes(weatherCode)) return 'drizzle.svg';
    if ([179, 182, 185, 281, 284, 311, 314, 317, 320].includes(weatherCode)) return 'scattered_showers.svg';
    if ([299, 302, 305, 308, 356, 359].includes(weatherCode)) return 'showers.svg';
    
    // Snow
    if ([179, 227, 323, 326, 329, 332, 335, 338, 350, 353].includes(weatherCode)) return 'flurries.svg';
    if ([230, 341, 344, 368, 371, 374, 377].includes(weatherCode)) return 'heavy_snow.svg';
    if ([362, 365].includes(weatherCode)) return 'snow_showers.svg';
    if ([392, 395].includes(weatherCode)) return 'blizzard.svg';
    
    // Sleet / Ice
    if ([182, 185, 281, 284, 311, 314, 317, 320, 350, 353].includes(weatherCode)) return 'sleet_hail.svg';
    
    // Thunderstorms
    if ([386, 389].includes(weatherCode)) return 'isolated_tstorms.svg';
    if ([392, 395].includes(weatherCode)) return 'strong_tstorms.svg';
    
    // Default fallback
    return 'clear.svg';
}

// Map OpenWeatherMap weather condition codes to local weather icons (kept for reference)
function mapWeatherConditionToIcon(conditionId, iconCode) {
    // OpenWeatherMap condition codes: https://openweathermap.org/weather-conditions
    
    // Thunderstorm
    if (conditionId >= 200 && conditionId < 300) {
        return conditionId >= 230 ? 'strong_tstorms.svg' : 'isolated_tstorms.svg';
    }
    
    // Drizzle
    if (conditionId >= 300 && conditionId < 400) {
        return 'drizzle.svg';
    }
    
    // Rain
    if (conditionId >= 500 && conditionId < 600) {
        if (conditionId === 511) return 'sleet_hail.svg'; // Freezing rain
        return conditionId >= 520 ? 'showers.svg' : 'scattered_showers.svg';
    }
    
    // Snow
    if (conditionId >= 600 && conditionId < 700) {
        if (conditionId === 611 || conditionId === 612 || conditionId === 613) return 'sleet_hail.svg';
        if (conditionId === 615 || conditionId === 616) return 'wintry_mix.svg';
        if (conditionId >= 620) return 'snow_showers.svg';
        return conditionId >= 602 ? 'heavy_snow.svg' : 'flurries.svg';
    }
    
    // Atmosphere
    if (conditionId >= 700 && conditionId < 800) {
        if (conditionId === 701 || conditionId === 741) return 'mist.svg';
        if (conditionId === 711) return 'smoke.svg';
        if (conditionId === 721 || conditionId === 731) return 'dust.svg';
        if (conditionId === 751 || conditionId === 761) return 'dust.svg';
        if (conditionId === 762) return 'dust.svg';
        if (conditionId === 771) return 'wind.svg';
        if (conditionId === 781) return 'tornado.svg';
        return 'fog.svg';
    }
    
    // Clear
    if (conditionId === 800) {
        // Use day/night detection from icon code
        return iconCode.includes('n') ? 'clear.svg' : 'sunny.svg';
    }
    
    // Clouds
    if (conditionId >= 801 && conditionId < 900) {
        const isNight = iconCode.includes('n');
        if (conditionId === 801) {
            return isNight ? 'partly_clear.svg' : 'mostly_sunny.svg';
        } else if (conditionId === 802) {
            return isNight ? 'mostly_cloudy_night.svg' : 'partly_cloudy.svg';
        } else {
            return isNight ? 'mostly_cloudy_night.svg' : 'mostly_cloudy.svg';
        }
    }
    
    // Default fallback
    return 'clear.svg';
}

// Convert wind degrees to compass direction
function degreesToCompass(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

async function updateWeatherFromAPI() {
    if (!appState.ui.autoWeather) {
        console.log('⚠️ Weather update skipped - autoWeather:', appState.ui.autoWeather);
        return;
    }
    
    try {
        console.log('🔄 Starting weather update...');
        updateWeatherStatus('Getting location...');
        
        // Get location (browser geolocation or manual coordinates)
        const location = await getUserLocation();
        appState.weatherApi.location = location;
        
        updateWeatherStatus('Fetching weather...');
        
        // Get weather data (wttr.in doesn't require API key)
        const weatherData = await fetchWeatherData(
            location.latitude,
            location.longitude,
            null // No API key needed for wttr.in
        );
        
        // Update app state
        appState.weather = {
            ...weatherData,
            isError: false
        };
        
        appState.weatherApi.lastUpdate = new Date();
        
        // Update UI
        updateWeatherDisplay();
        updateWeatherStatus(`Weather updated (${location.source})`);
        
        console.log('✅ Weather update successful using', location.source, 'location');
        
    } catch (error) {
        console.error('❌ Weather update failed:', error.message);
        setWeatherError();
        updateWeatherStatus(`Error: ${error.message}`);
    }
}

function setWeatherError() {
    console.log('🚨 Setting weather to error state');
    appState.weather = {
        icon: 'clear.svg',
        conditions: 'ERR',
        temperature: 'ERR',
        windDirection: 'ERR',
        windSpeed: 'ERR',
        isError: true
    };
    updateWeatherDisplay();
}

function updateWeatherDisplay() {
    elements.weatherIcon.src = `assets/weather_icons/${appState.weather.icon}`;
    elements.weatherConditions.textContent = appState.weather.conditions;
    elements.temperature.textContent = appState.weather.temperature;
    elements.windDirection.textContent = appState.weather.windDirection;
    elements.windSpeed.textContent = appState.weather.windSpeed;
}

function startWeatherRefresh() {
    if (weatherRefreshInterval) {
        clearInterval(weatherRefreshInterval);
    }
    
    if (appState.ui.autoWeather) {
        // Update immediately
        updateWeatherFromAPI();
        
        // Then update every 10 minutes (weather doesn't change frequently)
        weatherRefreshInterval = setInterval(() => {
            updateWeatherFromAPI();
        }, 10 * 60 * 1000);
        
        console.log('Weather refresh started (10 minute interval)');
    }
}

function stopWeatherRefresh() {
    if (weatherRefreshInterval) {
        clearInterval(weatherRefreshInterval);
        weatherRefreshInterval = null;
        console.log('Weather refresh stopped');
    }
}

function updateWeatherStatus(message = null) {
    if (!elements.weatherStatus) return;
    
    if (message) {
        elements.weatherStatus.textContent = message;
        elements.weatherStatus.className = 'timing-status';
        return;
    }
    
    if (appState.ui.autoWeather) {
        elements.weatherStatus.textContent = 'Auto weather: ON';
        elements.weatherStatus.className = 'timing-status on';
    } else {
        elements.weatherStatus.textContent = 'Auto weather: OFF';
        elements.weatherStatus.className = 'timing-status off';
    }
}

// Generate fallback rider data
function generateFallbackRiders() {
    const riders = [
        { pos: 1, first: "E", last: "ERR", num: 1, teamColor: "#ffffff" },
        { pos: 2, first: "E", last: "ERR", num: 2, teamColor: "#ffffff" },
        { pos: 3, first: "E", last: "ERR", num: 3, teamColor: "#ffffff" },
        { pos: 4, first: "E", last: "ERR", num: 4, teamColor: "#ffffff" },
        { pos: 5, first: "E", last: "ERR", num: 5, teamColor: "#ffffff" },
        { pos: 6, first: "E", last: "ERR", num: 6, teamColor: "#ffffff" },
        { pos: 7, first: "E", last: "ERR", num: 7, teamColor: "#ffffff" },
        { pos: 8, first: "E", last: "ERR", num: 8, teamColor: "#ffffff" },
        { pos: 9, first: "E", last: "ERR", num: 9, teamColor: "#ffffff" },
        { pos: 10, first: "E", last: "ERR", num: 10, teamColor: "#ffffff" },
        { pos: 11, first: "E", last: "ERR", num: 11, teamColor: "#ffffff" },
        { pos: 12, first: "E", last: "ERR", num: 12, teamColor: "#ffffff" },
        { pos: 13, first: "E", last: "ERR", num: 13, teamColor: "#ffffff" },
        { pos: 14, first: "E", last: "ERR", num: 14, teamColor: "#ffffff" },
        { pos: 15, first: "E", last: "ERR", num: 15, teamColor: "#ffffff" },
        { pos: 16, first: "E", last: "ERR", num: 16, teamColor: "#ffffff" },
        { pos: 17, first: "E", last: "ERR", num: 17, teamColor: "#ffffff" },
        { pos: 18, first: "E", last: "ERR", num: 18, teamColor: "#ffffff" },
        { pos: 19, first: "E", last: "ERR", num: 19, teamColor: "#ffffff" },
        { pos: 20, first: "E", last: "ERR", num: 20, teamColor: "#ffffff" },
        { pos: 21, first: "E", last: "ERR", num: 21, teamColor: "#ffffff" },
        { pos: 22, first: "E", last: "ERR", num: 22, teamColor: "#ffffff" }
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
    elements.flagFinish.addEventListener('click', () => setFlag('finish'));
    
    // Toggle controls
    elements.expandSlug.addEventListener('change', toggleBugSlug);
    elements.showTower.addEventListener('change', toggleTower);
    elements.showStrip.addEventListener('change', toggleStrip);
    elements.showWeather.addEventListener('change', toggleWeather);
    
    // Timing data controls
    elements.loadTimingData.addEventListener('click', () => {
        loadTimingData().then(() => {
            console.log('Timing data refreshed manually');
        });
    });
    elements.pauseRefresh.addEventListener('click', () => {
        stopTimingRefresh();
        updateTimingStatus();
    });
    elements.resumeRefresh.addEventListener('click', () => {
        startTimingRefresh(1000);
        updateTimingStatus();
    });
    
    // Weather API controls
    elements.autoWeather.addEventListener('change', toggleAutoWeather);
    elements.refreshWeather.addEventListener('click', () => {
        updateWeatherFromAPI().then(() => {
            console.log('Weather data refreshed manually');
        });
    });
    elements.useMyLocation.addEventListener('click', requestBrowserLocation);
    elements.latitude.addEventListener('input', saveManualCoordinates);
    elements.longitude.addEventListener('input', saveManualCoordinates);
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
        case 'c':
            setFlag('finish');
            break;
        case 'f':
            // Toggle flag view - show current flag state then hide after 2 seconds
            showFlagTemporarily();
            break;
        case 'h':
            // Show flag for 2 seconds then hide completely
            showFlagTemporarily();
            break;
        case '[':
            setLap(Math.max(1, appState.event.currentLap - 1), appState.event.totalLaps);
            break;
        case ']':
            setLap(Math.min(appState.event.totalLaps, appState.event.currentLap + 1), appState.event.totalLaps);
            break;
        case 'l':
            // Manually load timing data
            loadTimingData().then(() => {
                console.log('Timing data refreshed manually');
            });
            break;
        case 'p':
            // Pause timing data refresh
            stopTimingRefresh();
            break;
        case 'q':
            // Resume timing data refresh
            startTimingRefresh(1000);
            break;
        case 'd':
            // Debug timing data mapping
            debugTimingData();
            break;
        case 'd':
            // Show debug info
            debugTimingData();
            break;
        case 'm':
            // Manually refresh weather
            updateWeatherFromAPI().then(() => {
                console.log('Weather data refreshed manually');
            });
            break;
        case 'a':
            // Toggle auto weather
            toggleAutoWeather();
            console.log('Auto weather toggled:', appState.ui.autoWeather ? 'ON' : 'OFF');
            break;
    }
}

// Read flag from timing data file and apply it
async function readFlagFromTimingData() {
    try {
        const response = await fetch('timing_data.txt?' + Date.now()); // Cache busting
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        const timingData = parseTimingData(text);
        
        // Map timing data flag values to internal flag values
        const flagMapping = {
            'Green': 'green',
            'Yellow': 'yellow',
            'Red': 'red',
            'Finish': 'finish',
            '': 'no-light',
            'green': 'green',   // Handle lowercase too
            'yellow': 'yellow',
            'red': 'red',
            'finish': 'finish'
        };
        
        const flagFromFile = flagMapping[timingData.race.flag] || 'no-light';
        setFlag(flagFromFile);
        
        console.log(`Flag read from timing data: ${timingData.race.flag} → ${flagFromFile}`);
    } catch (error) {
        console.warn('Could not read flag from timing data:', error.message);
    }
}

// Show flag temporarily for 2 seconds then hide completely
function showFlagTemporarily() {
    // Show the current flag state (updated from timing data but not displayed)
    handleFlagNotification(appState.event.flag);
    
    // After 2 seconds, force hide the flag completely
    setTimeout(() => {
        handleFlagNotification('hidden');
    }, 2000);
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
    
    // Update lap display - show "- of -" when laps go above 100
    if (appState.event.currentLap > 100 || appState.event.totalLaps > 100) {
        elements.currentLap.textContent = '-';
        elements.totalLaps.textContent = '-';
    } else {
        elements.currentLap.textContent = appState.event.currentLap;
        elements.totalLaps.textContent = appState.event.totalLaps;
    }
    
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
    elements.autoWeather.checked = appState.ui.autoWeather;
    
    // Update coordinate inputs
    if (appState.weatherApi.latitude !== null) {
        elements.latitude.value = appState.weatherApi.latitude.toFixed(4);
    }
    if (appState.weatherApi.longitude !== null) {
        elements.longitude.value = appState.weatherApi.longitude.toFixed(4);
    }
    
    // Update weather data
    elements.weatherIcon.src = `assets/weather_icons/${appState.weather.icon}`;
    elements.weatherConditions.textContent = appState.weather.conditions;
    elements.temperature.textContent = appState.weather.temperature;
    elements.windDirection.textContent = appState.weather.windDirection;
    elements.windSpeed.textContent = appState.weather.windSpeed;
    
    // Update weather status
    updateWeatherStatus();
    
    // Apply visibility states - bug is always visible, hashtag is always visible
    // Flag notifications take priority over manual expansion
    const flagRequiresExpansion = ['green', 'yellow', 'red', 'finish'].includes(appState.event.flag);
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

// Update rider content without full re-render or animations
function updateRidersContent() {
    const existingRows = elements.riderRows.querySelectorAll('.rider-row:not(.empty-row)');
    const maxRiders = 17;
    const ridersToShow = appState.riders.slice(0, maxRiders);
    
    // Update existing rows
    existingRows.forEach((row, index) => {
        if (index < ridersToShow.length) {
            const rider = ridersToShow[index];
            updateRiderRowContent(row, rider);
        } else {
            // Remove extra rows
            row.remove();
        }
    });
    
    // Add new rows if needed
    for (let i = existingRows.length; i < ridersToShow.length; i++) {
        const rider = ridersToShow[i];
        const row = createRiderRow(rider, i);
        elements.riderRows.appendChild(row);
    }
    
    // Ensure we have enough empty rows
    const currentRows = elements.riderRows.querySelectorAll('.rider-row').length;
    const emptyRowsNeeded = maxRiders - ridersToShow.length;
    const existingEmptyRows = elements.riderRows.querySelectorAll('.empty-row').length;
    
    if (existingEmptyRows < emptyRowsNeeded) {
        for (let i = existingEmptyRows; i < emptyRowsNeeded; i++) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'rider-row empty-row';
            emptyRow.style.height = `${44}px`;
            elements.riderRows.appendChild(emptyRow);
        }
    }
}

// Update strip content without full re-render or animations
function updateStripContent() {
    const existingItems = elements.stripRows.querySelectorAll('.strip-rider');
    const maxRiders = 15;
    const ridersToShow = appState.riders.slice(0, maxRiders);
    
    // Update existing items
    existingItems.forEach((item, index) => {
        if (index < ridersToShow.length) {
            const rider = ridersToShow[index];
            updateStripItemContent(item, rider);
        } else {
            // Remove extra items
            item.remove();
        }
    });
    
    // Add new items if needed
    for (let i = existingItems.length; i < ridersToShow.length; i++) {
        const rider = ridersToShow[i];
        const item = createStripRiderItem(rider, i);
        elements.stripRows.appendChild(item);
    }
}

// Update individual rider row content
function updateRiderRowContent(row, rider) {
    // Format name as "O PAR" - first initial + space + first 3 chars of last name
    const formattedName = `${rider.first.charAt(0).toUpperCase()} ${rider.last.toUpperCase().substring(0, 3)}`;
    
    // Update content
    const position = row.querySelector('.position');
    const riderName = row.querySelector('.rider-name');
    const riderNumber = row.querySelector('.rider-number');
    
    if (position) position.textContent = rider.pos;
    if (riderName) riderName.textContent = formattedName;
    if (riderNumber) {
        riderNumber.textContent = rider.num;
        riderNumber.style.backgroundColor = rider.teamColor;
    }
    
    // Update data attributes and colors
    row.dataset.riderId = rider.num;
    row.style.setProperty('--team-color', rider.teamColor);
}

// Update individual strip item content
function updateStripItemContent(item, rider) {
    // Format name as "O PAR" - first initial + space + first 3 chars of last name
    const formattedName = `${rider.first.charAt(0).toUpperCase()} ${rider.last.toUpperCase().substring(0, 3)}`;
    
    // Update content
    const position = item.querySelector('.position');
    const riderName = item.querySelector('.rider-name');
    const riderNumber = item.querySelector('.rider-number');
    
    if (position) position.textContent = rider.pos;
    if (riderName) riderName.textContent = formattedName;
    if (riderNumber) {
        riderNumber.textContent = rider.num;
        riderNumber.style.backgroundColor = rider.teamColor;
    }
    
    // Update data attributes and colors
    item.dataset.riderId = rider.num;
    item.style.setProperty('--team-color', rider.teamColor);
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
    
    // Format name as "O PAR" - first initial + space + first 3 chars of last name
    const formattedName = `${rider.first.charAt(0).toUpperCase()} ${rider.last.toUpperCase().substring(0, 3)}`;
    
    // Set CSS custom property for team color animation
    item.style.setProperty('--team-color', rider.teamColor);
    
    item.innerHTML = `
        <div class="position">${rider.pos}</div>
        <div class="rider-name">${formattedName}</div>
        <div class="rider-number" style="background-color: ${rider.teamColor}">${rider.num}</div>
    `;
    
    return item;
}

// Create individual rider row
function createRiderRow(rider, index) {
    const row = document.createElement('div');
    row.className = 'rider-row';
    row.dataset.riderId = rider.num;
    
    // Format name as "O PAR" - first initial + space + first 3 chars of last name
    const formattedName = `${rider.first.charAt(0).toUpperCase()} ${rider.last.toUpperCase().substring(0, 3)}`;

    row.innerHTML = `
        <div class="position">${rider.pos}</div>
        <div class="rider-name">${formattedName}</div>
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
    if (['no-light', 'green', 'yellow', 'red', 'finish'].includes(color)) {
        appState.event.flag = color;
        // Show flag notification when flag is set
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
    elements.bugSlug.classList.remove('green', 'yellow', 'red', 'finish');
    
    // Remove flag-active class from panel and logo
    elements.bugPanel.classList.remove('flag-active');
    elements.bugLogo.classList.remove('flag-active');
    
    switch (flag) {
        case 'green':
            // Green flag: expand for 2 seconds then retract
            elements.bugSlug.style.display = 'block'; // Ensure flag slug is visible
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
            elements.bugSlug.style.display = 'block'; // Ensure flag slug is visible
            elements.flagNotification.textContent = 'YELLOW FLAG';
            elements.bugSlug.classList.add('yellow');
            elements.bug.classList.add('expanded');
            elements.bugPanel.classList.add('flag-active');
            elements.bugLogo.classList.add('flag-active');
            // No timer - stays expanded until flag changes
            break;
            
        case 'red':
            // Red flag: expand and flash
            elements.bugSlug.style.display = 'block'; // Ensure flag slug is visible
            elements.flagNotification.textContent = 'RED FLAG';
            elements.bugSlug.classList.add('red');
            elements.bug.classList.add('expanded');
            elements.bugPanel.classList.add('flag-active');
            elements.bugLogo.classList.add('flag-active');
            // No timer - stays expanded until flag changes
            break;
            
        case 'finish':
            // Finish flag: expand and show chequered flag
            elements.bugSlug.style.display = 'block'; // Ensure flag slug is visible
            elements.flagNotification.textContent = 'FINISHED';
            elements.bugSlug.classList.add('finish');
            elements.bug.classList.add('expanded');
            elements.bugPanel.classList.add('flag-active');
            elements.bugLogo.classList.add('flag-active');
            // No timer - stays expanded until flag changes
            break;
            
        case 'no-light':
            // No light: retract immediately but keep flag slug visible for future use
            elements.bugSlug.style.display = 'block'; // Ensure flag slug is visible
            elements.bug.classList.remove('expanded');
            elements.flagNotification.textContent = '';
            break;
            
        case 'hidden':
            // Completely hidden: remove all flag styling and background
            elements.bug.classList.remove('expanded');
            elements.flagNotification.textContent = '';
            elements.bugSlug.classList.remove('green', 'yellow', 'red', 'finish');
            elements.bugPanel.classList.remove('flag-active');
            elements.bugLogo.classList.remove('flag-active');
            // Also hide the flag background completely
            elements.bugSlug.style.display = 'none';
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

// Toggle auto weather
function toggleAutoWeather() {
    appState.ui.autoWeather = !appState.ui.autoWeather;
    elements.autoWeather.checked = appState.ui.autoWeather;
    
    if (appState.ui.autoWeather) {
        startWeatherRefresh();
    } else {
        stopWeatherRefresh();
    }
    
    updateWeatherStatus();
    saveStateToStorage();
}

// Save manual coordinates
function saveManualCoordinates() {
    const lat = parseFloat(elements.latitude.value);
    const lon = parseFloat(elements.longitude.value);
    
    if (!isNaN(lat) && !isNaN(lon)) {
        appState.weatherApi.latitude = lat;
        appState.weatherApi.longitude = lon;
        
        console.log('📍 Manual coordinates saved:', lat, lon);
        
        // If auto weather is enabled, refresh weather data
        if (appState.ui.autoWeather) {
            updateWeatherFromAPI();
        }
    } else {
        appState.weatherApi.latitude = null;
        appState.weatherApi.longitude = null;
    }
    
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

// Animate rider reordering with enhanced smoothness
function animateReorder(oldPositions) {
    const rows = elements.riderRows.querySelectorAll('.rider-row:not(.empty-row)');
    const stripItems = elements.stripRows.querySelectorAll('.strip-rider');
    
    // Animate tower rows
    if (appState.ui.showTower && rows.length > 0) {
        animateRowsReorder(rows, oldPositions);
    }
    
    // Animate strip items
    if (appState.ui.showStrip && stripItems.length > 0) {
        animateStripReorder(stripItems, oldPositions);
    }
}

// Animate tower rows reordering
function animateRowsReorder(rows, oldPositions) {
    // First: Record current positions before DOM update
    const firstPositions = new Map();
    rows.forEach(row => {
        const riderId = row.dataset.riderId;
        const rect = row.getBoundingClientRect();
        firstPositions.set(riderId, rect.top);
    });
    
    // Last: Update DOM content
    updateRidersContent();
    
    // Invert: Calculate differences and apply transforms
    const newRows = elements.riderRows.querySelectorAll('.rider-row:not(.empty-row)');
    newRows.forEach(row => {
        const riderId = row.dataset.riderId;
        const firstTop = firstPositions.get(riderId);
        
        if (firstTop !== undefined) {
            const lastTop = row.getBoundingClientRect().top;
            const deltaY = firstTop - lastTop;
            
            if (Math.abs(deltaY) > 1) { // Only animate if meaningful movement
                // Apply initial transform
                row.style.transform = `translateY(${deltaY}px)`;
                row.style.transition = 'none';
                row.classList.add('moving');
                
                // Add position change indicator
                const oldPos = oldPositions.get(riderId);
                const newPos = appState.riders.find(r => r.num == riderId)?.pos;
                
                if (oldPos && newPos && oldPos !== newPos) {
                    row.classList.add(oldPos > newPos ? 'moving-up' : 'moving-down');
                }
            }
        }
    });
    
    // Play: Animate to final positions
    requestAnimationFrame(() => {
        newRows.forEach(row => {
            if (row.classList.contains('moving')) {
                row.style.transition = 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1)';
                row.style.transform = 'translateY(0)';
            }
        });
        
        // Clean up after animation - remove movement classes after physical movement
        setTimeout(() => {
            newRows.forEach(row => {
                row.classList.remove('moving');
                row.style.transform = '';
                row.style.transition = '';
            });
        }, 850);
        
        // Keep glow effect for 1 second after movement completes
        setTimeout(() => {
            newRows.forEach(row => {
                row.classList.remove('moving-up', 'moving-down');
            });
        }, 1850);
    });
}

// Animate strip items reordering
function animateStripReorder(stripItems, oldPositions) {
    // First: Record current positions
    const firstPositions = new Map();
    stripItems.forEach(item => {
        const riderId = item.dataset.riderId;
        const rect = item.getBoundingClientRect();
        firstPositions.set(riderId, { left: rect.left, top: rect.top });
    });
    
    // Last: Update DOM content
    updateStripContent();
    
    // Invert: Calculate differences and apply transforms
    const newItems = elements.stripRows.querySelectorAll('.strip-rider');
    newItems.forEach(item => {
        const riderId = item.dataset.riderId;
        const firstPos = firstPositions.get(riderId);
        
        if (firstPos) {
            const lastRect = item.getBoundingClientRect();
            const deltaX = firstPos.left - lastRect.left;
            const deltaY = firstPos.top - lastRect.top;
            
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                // Apply initial transform
                item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                item.style.transition = 'none';
                item.classList.add('moving');
                
                // Add position change indicator
                const oldPos = oldPositions.get(riderId);
                const newPos = appState.riders.find(r => r.num == riderId)?.pos;
                
                if (oldPos && newPos && oldPos !== newPos) {
                    item.classList.add(oldPos > newPos ? 'moving-up' : 'moving-down');
                }
            }
        }
    });
    
    // Play: Animate to final positions
    requestAnimationFrame(() => {
        newItems.forEach(item => {
            if (item.classList.contains('moving')) {
                item.style.transition = 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.transform = 'translate(0, 0)';
            }
        });
        
        // Clean up after animation - remove movement classes after physical movement
        setTimeout(() => {
            newItems.forEach(item => {
                item.classList.remove('moving');
                item.style.transform = '';
                item.style.transition = '';
            });
        }, 850);
        
        // Keep glow effect for 1 second after movement completes
        setTimeout(() => {
            newItems.forEach(item => {
                item.classList.remove('moving-up', 'moving-down');
            });
        }, 1850);
    });
}

// Save state to localStorage
function saveStateToStorage() {
    try {
        localStorage.setItem('motorsportOverlayState', JSON.stringify({
            event: appState.event,
            ui: appState.ui,
            weatherApi: {
                apiKey: appState.weatherApi.apiKey,
                latitude: appState.weatherApi.latitude,
                longitude: appState.weatherApi.longitude
                // Don't save location or lastUpdate - these should be fresh each session
            }
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
            if (parsedState.weatherApi) {
                appState.weatherApi.apiKey = parsedState.weatherApi.apiKey || "";
                appState.weatherApi.latitude = parsedState.weatherApi.latitude || null;
                appState.weatherApi.longitude = parsedState.weatherApi.longitude || null;
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

// Update timing status indicator
function updateTimingStatus() {
    if (elements.timingStatus) {
        const status = timingRefreshInterval ? 'ON' : 'OFF';
        elements.timingStatus.textContent = `Auto-refresh: ${status}`;
        elements.timingStatus.className = `timing-status ${status.toLowerCase()}`;
    }
}

// Data mapping documentation and helper functions
/*
TIMING DATA FILE MAPPING:

Race Information:
- laps=9999              → appState.event.totalLaps
- flag=                  → appState.event.flag (green/yellow/red/no-light)
- flagimg=none.png       → Not currently used

Position Data (pos1, pos2, pos3, etc.):
- pos1fname=MattOld      → rider.first
- pos1lname=             → rider.last 
- pos1num=1TBC           → rider.num
- pos1time=00.000        → rider.time (race time or lap time)
- pos1laps=              → Not displayed (lap count)
- pos1blap=              → Not displayed (best lap number)
- pos1btime=00.000       → rider.bestLap (best lap time)
- pos1diff=              → rider.gap (time gap to leader)
- pos1speed=0            → rider.speed (current speed)
- pos1bspeed=0           → Not displayed (best speed)
- pos1nationality=       → rider.nationality
- pos1additional=        → rider.additional

Leader Information:
- leaderfname=MattOld    → appState.leader.firstName
- leaderlname=           → appState.leader.lastName
- leadernum=1TBC         → appState.leader.number
- leaderblap=            → appState.leader.bestLap
- leaderbtime=00.000     → appState.leader.bestTime
- leaderspeed=0          → appState.leader.speed
- leaderbspeed=0         → appState.leader.bestSpeed

Fastest Lap Information:
- fastestfname=MattOld   → appState.fastest.firstName
- fastestlname=          → appState.fastest.lastName
- fastestnum=1TBC        → appState.fastest.number
- fastestblap=           → appState.fastest.bestLap
- fastestbtime=00.000    → appState.fastest.bestTime
- fastestspeed=0         → appState.fastest.speed

DISPLAY ELEMENTS:

Tower Display:
- Position number
- Driver name (first + last)
- Car number
- Time/Gap to leader
- Best lap time

Strip Display:
- Same data as tower but horizontal layout

Flag Notification:
- Updates based on flag= field
- Shows GREEN FLAG, YELLOW FLAG, RED FLAG, or hidden for no-light

Current gaps in timing_data.txt:
- Most fields are empty or default (00.000, 0)
- Need actual race data to see full functionality
- TBC numbers suggest test/placeholder data
*/

// Enhanced debug function to show current data mapping
function debugTimingData() {
    console.group('🏁 Current Timing Data Mapping');
    
    console.log('📊 Race Info:');
    console.log(`  Total Laps: ${appState.event.totalLaps}`);
    console.log(`  Current Lap: ${appState.event.currentLap}`);
    console.log(`  Flag Status: ${appState.event.flag}`);
    
    console.log('\n🏃 Position Data:');
    appState.riders.slice(0, 5).forEach((rider, i) => {
        console.log(`  P${rider.pos}: ${rider.first} ${rider.last} (#${rider.num})`);
        console.log(`    Time: ${rider.time}, Gap: ${rider.gap}, Best: ${rider.bestLap}`);
    });
    
    if (appState.leader) {
        console.log('\n👑 Race Leader:');
        console.log(`  ${appState.leader.firstName} ${appState.leader.lastName} (#${appState.leader.number})`);
        console.log(`  Best Time: ${appState.leader.bestTime}`);
    }
    
    if (appState.fastest) {
        console.log('\n⚡ Fastest Lap:');
        console.log(`  ${appState.fastest.firstName} ${appState.fastest.lastName} (#${appState.fastest.number})`);
        console.log(`  Time: ${appState.fastest.bestTime}`);
    }
    
    console.groupEnd();
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