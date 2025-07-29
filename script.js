document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loadingOverlay = document.getElementById('loading-overlay');
    const locationElement = document.getElementById('location');
    const currentTimeElement = document.getElementById('current-time');
    const currentTempElement = document.getElementById('current-temp');
    const feelsLikeElement = document.getElementById('feels-like');
    const weatherIconElement = document.getElementById('weather-icon');
    const weatherDescElement = document.getElementById('weather-desc');
    const highTempElement = document.getElementById('high-temp');
    const lowTempElement = document.getElementById('low-temp');
    const windSpeedElement = document.getElementById('wind-speed');
    const humidityElement = document.getElementById('humidity');
    const airQualityElement = document.getElementById('air-quality');
    const uvIndexElement = document.getElementById('uv-index');
    const visibilityElement = document.getElementById('visibility');
    const precipitationElement = document.getElementById('precipitation');
    const moonPhaseElement = document.getElementById('moon-phase');
    const hourlySlider = document.getElementById('hourly-slider');
    const forecastCards = document.getElementById('forecast-cards');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const locationBtn = document.getElementById('location-btn');
    const searchSuggestions = document.getElementById('search-suggestions');
    const themeToggle = document.getElementById('theme-toggle');
    const weatherBg = document.getElementById('weather-bg');

    // Default Location (Chirkunda-Nirsa)
    const DEFAULT_LOCATION = { lat: 23.75, lon: 86.86 };

    // Weather APIs
    const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
    const WEATHER_API_URL = 'https://api.weatherapi.com/v1/forecast.json?key=YOUR_API_KEY&q='; // Fallback
    const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

    // Initialize App
    initApp();

    function initApp() {
        // Load saved theme or detect system preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }

        // Event Listeners
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('input', handleSearchSuggestions);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        locationBtn.addEventListener('click', getUserLocation);
        themeToggle.addEventListener('click', toggleTheme);

        // Update time every minute
        updateTime();
        setInterval(updateTime, 60000);

        // Load weather for default location
        loadWeatherData(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
    }

    // Time & Date
    function updateTime() {
        const now = new Date();
        currentTimeElement.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    // Theme Toggle
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        }
    }

    // Search Location
    function handleSearch() {
        const query = searchInput.value.trim();
        if (query) {
            fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`)
                .then(response => response.json())
                .then(data => {
                    if (data.results && data.results.length > 0) {
                        const location = data.results[0];
                        loadWeatherData(location.latitude, location.longitude, location.name);
                        searchInput.value = '';
                        searchSuggestions.style.display = 'none';
                    } else {
                        showError('Location not found');
                    }
                })
                .catch(error => {
                    showError('Error fetching location');
                    console.error(error);
                });
        }
    }

    // Search Suggestions
    function handleSearchSuggestions() {
        const query = searchInput.value.trim();
        if (query.length > 2) {
            fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`)
                .then(response => response.json())
                .then(data => {
                    if (data.results && data.results.length > 0) {
                        searchSuggestions.innerHTML = '';
                        data.results.forEach(result => {
                            const suggestion = document.createElement('div');
                            suggestion.textContent = `${result.name}, ${result.country}`;
                            suggestion.addEventListener('click', () => {
                                searchInput.value = `${result.name}, ${result.country}`;
                                searchSuggestions.style.display = 'none';
                                handleSearch();
                            });
                            searchSuggestions.appendChild(suggestion);
                        });
                        searchSuggestions.style.display = 'block';
                    } else {
                        searchSuggestions.style.display = 'none';
                    }
                })
                .catch(error => {
                    console.error(error);
                    searchSuggestions.style.display = 'none';
                });
        } else {
            searchSuggestions.style.display = 'none';
        }
    }

    // Geolocation
    function getUserLocation() {
        showLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    loadWeatherData(position.coords.latitude, position.coords.longitude);
                },
                error => {
                    showError('Unable to get your location');
                    console.error(error);
                    loadWeatherData(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
                }
            );
        } else {
            showError('Geolocation not supported');
            loadWeatherData(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
        }
    }

    // Load Weather Data
    function loadWeatherData(lat, lon, locationName = null) {
        showLoading(true);

        // Open-Meteo API Call
        const params = {
            latitude: lat,
            longitude: lon,
            current_weather: true,
            hourly: 'temperature_2m,weathercode,relativehumidity_2m,windspeed_10m',
            daily: 'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum',
            timezone: 'auto',
            forecast_days: 5
        };

        const queryString = new URLSearchParams(params).toString();
        const apiUrl = `${OPEN_METEO_URL}?${queryString}`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                updateWeatherUI(data, locationName);
                showLoading(false);
            })
            .catch(error => {
                console.error('Open-Meteo error:', error);
                // Fallback to WeatherAPI if Open-Meteo fails
                fallbackToWeatherAPI(lat, lon, locationName);
            });
    }

    // Fallback API
    function fallbackToWeatherAPI(lat, lon, locationName) {
        fetch(`${WEATHER_API_URL}${lat},${lon}&days=5&aqi=yes`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showError('Weather data unavailable');
                    return;
                }
                updateWeatherUI(formatWeatherAPIData(data), locationName);
                showLoading(false);
            })
            .catch(error => {
                showError('Failed to load weather data');
                console.error(error);
                showLoading(false);
            });
    }

    // Update UI with Weather Data
    function updateWeatherUI(data, locationName = null) {
        // Location
        locationElement.textContent = locationName || `${data.latitude.toFixed(2)}, ${data.longitude.toFixed(2)}`;

        // Current Weather
        const current = data.current_weather;
        currentTempElement.textContent = `${Math.round(current.temperature)}°`;
        
        // Feels Like (approximation)
        const feelsLike = Math.round(current.temperature + (current.windspeed / 5));
        feelsLikeElement.textContent = `Feels like ${feelsLike}°`;

        // Weather Icon & Description
        const weatherCode = current.weathercode;
        const weatherInfo = getWeatherInfo(weatherCode);
        weatherIconElement.innerHTML = `<i class="fas ${weatherInfo.icon}"></i>`;
        weatherDescElement.textContent = weatherInfo.description;

        // High/Low Temps
        const today = data.daily;
        highTempElement.textContent = `H: ${Math.round(today.temperature_2m_max[0])}°`;
        lowTempElement.textContent = `L: ${Math.round(today.temperature_2m_min[0])}°`;

        // Wind & Humidity
        windSpeedElement.textContent = `${Math.round(current.windspeed)} km/h`;
        humidityElement.textContent = `${data.hourly.relativehumidity_2m[0]}%`;

        // Air Quality (fallback to static value)
        airQualityElement.textContent = '50 AQI'; // Would be dynamic in WeatherAPI fallback

        // UV Index
        uvIndexElement.textContent = today.uv_index_max[0].toFixed(1);

        // Visibility (fallback)
        visibilityElement.textContent = '10 km';

        // Precipitation
        precipitationElement.textContent = `${today.precipitation_sum[0]} mm`;

        // Moon Phase (simplified)
        const moonPhase = getMoonPhase(new Date());
        moonPhaseElement.textContent = moonPhase;

        // Hourly Forecast
        updateHourlyForecast(data.hourly);

        // 5-Day Forecast
        updateDailyForecast(data.daily);

        // Update Background based on Weather
        updateWeatherBackground(weatherCode);

        // Save to localStorage for offline use
        localStorage.setItem('lastWeatherData', JSON.stringify(data));
        if (locationName) localStorage.setItem('lastLocation', locationName);
    }

    // Hourly Forecast
    function updateHourlyForecast(hourlyData) {
        hourlySlider.innerHTML = '';
        const now = new Date();
        const currentHour = now.getHours();

        for (let i = 0; i < 12; i++) {
            const hourIndex = currentHour + i;
            if (hourIndex >= hourlyData.time.length) break;

            const hourTime = new Date(hourlyData.time[hourIndex]);
            const hourTemp = Math.round(hourlyData.temperature_2m[hourIndex]);
            const weatherCode = hourlyData.weathercode[hourIndex];
            const weatherInfo = getWeatherInfo(weatherCode);

            const hourCard = document.createElement('div');
            hourCard.className = 'hour-card';
            hourCard.innerHTML = `
                <div class="hour-time">${formatHour(hourTime)}</div>
                <div class="hour-icon"><i class="fas ${weatherInfo.icon}"></i></div>
                <div class="hour-temp">${hourTemp}°</div>
            `;
            hourlySlider.appendChild(hourCard);
        }
    }

    // Daily Forecast
    function updateDailyForecast(dailyData) {
        forecastCards.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const dayDate = new Date(dailyData.time[i]);
            const dayName = i === 0 ? 'Today' : dayDate.toLocaleDateString('en-US', { weekday: 'short' });
            const highTemp = Math.round(dailyData.temperature_2m_max[i]);
            const lowTemp = Math.round(dailyData.temperature_2m_min[i]);
            const weatherCode = dailyData.weathercode[i];
            const weatherInfo = getWeatherInfo(weatherCode);

            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            dayCard.innerHTML = `
                <div class="day-name">${dayName}</div>
                <div class="day-weather">
                    <div class="day-icon"><i class="fas ${weatherInfo.icon}"></i></div>
                </div>
                <div class="day-temp">
                    <div class="day-high">${highTemp}°</div>
                    <div class="day-low">${lowTemp}°</div>
                </div>
            `;
            forecastCards.appendChild(dayCard);
        }
    }

    // Weather Background
    function updateWeatherBackground(weatherCode) {
        let bgImage = '';
        
        if (weatherCode === 0) bgImage = 'clear';
        else if ([1, 2, 3].includes(weatherCode)) bgImage = 'cloudy';
        else if ([51, 53, 55, 61, 63, 65].includes(weatherCode)) bgImage = 'rain';
        else if ([71, 73, 75, 77].includes(weatherCode)) bgImage = 'snow';
        else if ([80, 81, 82].includes(weatherCode)) bgImage = 'showers';
        else if ([95, 96, 99].includes(weatherCode)) bgImage = 'thunderstorm';
        else bgImage = 'default';

        weatherBg.style.backgroundImage = `url('assets/bg/${bgImage}.jpg')`;
    }

    // Helper Functions
    function getWeatherInfo(weatherCode) {
        const weatherMap = {
            0: { icon: 'fa-sun', description: 'Clear sky' },
            1: { icon: 'fa-cloud-sun', description: 'Mainly clear' },
            2: { icon: 'fa-cloud', description: 'Partly cloudy' },
            3: { icon: 'fa-cloud', description: 'Overcast' },
            45: { icon: 'fa-smog', description: 'Fog' },
            48: { icon: 'fa-smog', description: 'Freezing fog' },
            51: { icon: 'fa-cloud-rain', description: 'Light drizzle' },
            53: { icon: 'fa-cloud-rain', description: 'Moderate drizzle' },
            55: { icon: 'fa-cloud-rain', description: 'Dense drizzle' },
            61: { icon: 'fa-cloud-rain', description: 'Slight rain' },
            63: { icon: 'fa-cloud-rain', description: 'Moderate rain' },
            65: { icon: 'fa-cloud-showers-heavy', description: 'Heavy rain' },
            71: { icon: 'fa-snowflake', description: 'Slight snow' },
            73: { icon: 'fa-snowflake', description: 'Moderate snow' },
            75: { icon: 'fa-snowflake', description: 'Heavy snow' },
            80: { icon: 'fa-cloud-showers-heavy', description: 'Rain showers' },
            81: { icon: 'fa-cloud-showers-heavy', description: 'Heavy showers' },
            82: { icon: 'fa-cloud-showers-heavy', description: 'Violent showers' },
            95: { icon: 'fa-bolt', description: 'Thunderstorm' },
            96: { icon: 'fa-bolt', description: 'Thunderstorm with hail' },
            99: { icon: 'fa-bolt', description: 'Heavy thunderstorm' }
        };
        return weatherMap[weatherCode] || { icon: 'fa-question', description: 'Unknown' };
    }

    function formatHour(date) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(/ AM| PM/, '');
    }

    function getMoonPhase(date) {
        const phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        
        // Simplified calculation
        const c = (year % 100) * 0.25;
        const e = (month + 1) * 0.6;
        const phaseIndex = Math.floor((day + c + e) % 8);
        return phases[phaseIndex];
    }

    function showLoading(show) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    function showError(message) {
        alert(message); // Replace with a prettier error UI
    }

    // Load cached data if offline
    if (!navigator.onLine) {
        const lastWeatherData = localStorage.getItem('lastWeatherData');
        const lastLocation = localStorage.getItem('lastLocation');
        
        if (lastWeatherData) {
            updateWeatherUI(JSON.parse(lastWeatherData), lastLocation);
            showError('Offline mode: Showing last fetched data');
        } else {
            showError('No internet connection and no cached data');
        }
    }
});
