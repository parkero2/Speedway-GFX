# Weather API Integration

The weather component now supports automatic weather data fetching using your IP location and the OpenWeatherMap API.

## Setup Instructions

1. **Get a Free OpenWeatherMap API Key:**
   - Go to https://openweathermap.org/api
   - Sign up for a free account
   - Get your API key from the dashboard
   - Free tier includes 1,000 calls/day (more than enough)

2. **Configure the Weather Component:**
   - Open the control panel (move mouse to top-right)
   - Enter your OpenWeatherMap API key in the "OpenWeatherMap API Key" field
   - Check the "Auto Weather (IP-based)" checkbox
   - The weather will automatically update every 10 minutes

3. **Manual Refresh:**
   - Click "Refresh Weather" to manually update weather data
   - Useful for testing or getting immediate updates

## How It Works

1. **IP Location Detection:** Uses ipapi.co (free, no API key required) to get your location from your IP address
2. **Weather Data:** Uses OpenWeatherMap API to get current weather for your detected location
3. **Icon Mapping:** Automatically maps weather conditions to your existing weather icons
4. **Error Handling:** Shows "ERR" in all fields if APIs fail

## Status Indicators

- **"Auto weather: ON"** (green) - Weather is updating automatically
- **"Auto weather: OFF"** (gray) - Auto weather is disabled
- **"Need API key"** (red) - Auto weather is enabled but no API key provided
- **"Fetching location..."** - Currently getting your location
- **"Fetching weather..."** - Currently getting weather data
- **"Error: [message]"** - Something went wrong

## Fallback Behavior

- If APIs fail, weather displays "ERR" in all fields
- You can still manually set weather data by disabling auto weather
- Weather icons fallback to clear/sunny if mapping fails

## Free API Limits

- **ipapi.co:** 1,000 requests/day (used once per weather update)
- **OpenWeatherMap:** 1,000 calls/day (weather updates every 10 minutes = ~144 calls/day)

Both APIs provide generous free tiers that should be sufficient for broadcast use.