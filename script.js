(() => {
  "use strict";

  const API_URL = "https://api.open-meteo.com/v1/forecast?latitude=48.8989&longitude=2.0938&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day&timezone=Europe%2FParis&forecast_days=2";
  const CACHE_KEY = "saint-germain-en-laye-weather-cache-v1";

  const currentIcon = document.querySelector("#currentIcon");
  const temperature = document.querySelector("#temperature");
  const condition = document.querySelector("#condition");
  const details = document.querySelector("#details");
  const forecast = document.querySelector("#forecast");
  const refreshButton = document.querySelector("#refreshButton");

  function weatherLabel(code, isDay) {
    if (code === 0) return isDay ? "Ensoleillé" : "Nuit claire";
    if (code === 1) return "Peu nuageux";
    if (code === 2) return "Éclaircies";
    if (code === 3) return "Couvert";
    if ([45, 48].includes(code)) return "Brouillard";
    if ([51, 53, 55].includes(code)) return "Bruine";
    if ([56, 57].includes(code)) return "Bruine verglaçante";
    if ([61, 63, 65].includes(code)) return "Pluie";
    if ([66, 67].includes(code)) return "Pluie verglaçante";
    if ([71, 73, 75, 77].includes(code)) return "Neige";
    if ([80, 81, 82].includes(code)) return "Averses";
    if ([85, 86].includes(code)) return "Averses de neige";
    if ([95, 96, 99].includes(code)) return "Orage";
    return "Variable";
  }

  function weatherType(code, isDay) {
    if (code === 0) return isDay ? "clear" : "clear-night";
    if ([1, 2].includes(code)) return isDay ? "partly" : "partly-night";
    if (code === 3) return "cloudy";
    if ([45, 48].includes(code)) return "fog";
    if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
    if ([95, 96, 99].includes(code)) return "storm";
    return "cloudy";
  }

  function iconMarkup(type, large = false) {
    return `<div class="weather-icon${large ? " weather-icon-large" : ""}" data-weather="${type}" aria-hidden="true">
      <span class="icon-part icon-sun"></span><span class="icon-part icon-moon"></span>
      <span class="icon-part icon-cloud"></span>
      <span class="icon-part icon-rain icon-rain-one"></span><span class="icon-part icon-rain icon-rain-two"></span><span class="icon-part icon-rain icon-rain-three"></span>
      <span class="icon-part icon-snow icon-snow-one"></span><span class="icon-part icon-snow icon-snow-two"></span><span class="icon-part icon-snow icon-snow-three"></span>
      <span class="icon-part icon-lightning"></span>
      <span class="icon-part icon-fog icon-fog-one"></span><span class="icon-part icon-fog icon-fog-two"></span>
    </div>`;
  }

  function render(data, cached = false) {
    const current = data.current;
    const hourly = data.hourly;
    const isDay = current.is_day === 1;
    const type = weatherType(current.weather_code, isDay);

    currentIcon.dataset.weather = type;
    temperature.textContent = `${Math.round(current.temperature_2m)}°`;
    condition.textContent = weatherLabel(current.weather_code, isDay);
    details.textContent = `Ressenti ${Math.round(current.apparent_temperature)}° · Humidité ${current.relative_humidity_2m}%`;

    const start = Math.max(0, hourly.time.findIndex(time => time >= current.time));
    const hours = hourly.time.slice(start, start + 6);
    forecast.replaceChildren(...hours.map((time, offset) => {
      const index = start + offset;
      const item = document.createElement("article");
      item.className = "forecast-item";
      item.setAttribute("aria-label", `${time.slice(11, 13)} heures, ${weatherLabel(hourly.weather_code[index], hourly.is_day[index] === 1)}, ${Math.round(hourly.temperature_2m[index])} degrés`);
      item.innerHTML = `<p class="forecast-time">${time.slice(11, 13)} h</p>${iconMarkup(weatherType(hourly.weather_code[index], hourly.is_day[index] === 1))}<p class="forecast-temperature">${Math.round(hourly.temperature_2m[index])}°</p>`;
      return item;
    }));

    document.title = `${Math.round(current.temperature_2m)}° · Saint-Germain-en-Laye`;
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); }
    catch { return null; }
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }
    catch { /* Le widget reste fonctionnel si Notion bloque le stockage. */ }
  }

  async function fetchWeather() {
    refreshButton.disabled = true;
    condition.textContent = "Actualisation";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(API_URL, { signal: controller.signal });
      if (!response.ok) throw new Error("Weather request failed");
      const data = await response.json();
      writeCache(data);
      render(data);
    } catch {
      const cached = readCache();
      if (cached) render(cached, true);
      else {
        condition.textContent = "Météo indisponible";
        details.textContent = "Touchez la température pour réessayer";
      }
    } finally {
      window.clearTimeout(timeout);
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener("click", fetchWeather);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") fetchWeather();
  });

  fetchWeather();
  window.setInterval(fetchWeather, 15 * 60 * 1000);
})();
