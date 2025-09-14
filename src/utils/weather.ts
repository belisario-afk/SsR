// Simple weather utility powered by Open-Meteo (no API key needed)
export type CurrentWeather = {
  temperature: number; // °C
  windspeed: number; // km/h
  weathercode: number;
  time: string;
};

export type WeatherData = {
  lat: number;
  lon: number;
  current: CurrentWeather | null;
  error?: string;
};

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export function wmoToDescription(code: number): string {
  // Minimal mapping (expand as needed)
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return map[code] ?? `Code ${code}`;
}

export function wmoToEmoji(code: number): string {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather error ${res.status}`);
  const data = await res.json();
  if (!data?.current_weather) throw new Error('No current weather');
  return {
    temperature: Number(data.current_weather.temperature),
    windspeed: Number(data.current_weather.windspeed),
    weathercode: Number(data.current_weather.weathercode),
    time: String(data.current_weather.time)
  };
}

export async function getCoords(): Promise<{ lat: number; lon: number } | null> {
  if (!('geolocation' in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        resolve({ lat, lon });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}