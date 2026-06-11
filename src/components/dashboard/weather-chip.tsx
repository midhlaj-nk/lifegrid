"use client";

import { useEffect, useState } from "react";

interface Weather {
  temp: number;
  code: number;
  fetchedAt: number;
}

const CACHE_KEY = "weather-v1";
const TTL = 30 * 60 * 1000;

const CODE_MAP: { codes: number[]; icon: string; label: string }[] = [
  { codes: [0], icon: "☀️", label: "Clear" },
  { codes: [1, 2], icon: "🌤️", label: "Partly cloudy" },
  { codes: [3], icon: "☁️", label: "Cloudy" },
  { codes: [45, 48], icon: "🌫️", label: "Foggy" },
  { codes: [51, 53, 55, 56, 57], icon: "🌦️", label: "Drizzle" },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], icon: "🌧️", label: "Rain" },
  { codes: [71, 73, 75, 77, 85, 86], icon: "❄️", label: "Snow" },
  { codes: [95, 96, 99], icon: "⛈️", label: "Thunderstorm" },
];

function describe(code: number) {
  return (
    CODE_MAP.find((m) => m.codes.includes(code)) ?? {
      icon: "🌡️",
      label: "Weather",
    }
  );
}

export function WeatherChip() {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.fetchedAt < TTL) {
        setWeather(cached);
        return;
      }
    } catch {
      // refetch
    }
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          );
          const data = await res.json();
          const w: Weather = {
            temp: Math.round(data.current?.temperature_2m ?? 0),
            code: data.current?.weather_code ?? 0,
            fetchedAt: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(w));
          setWeather(w);
        } catch {
          // silent — weather is decoration
        }
      },
      () => {},
      { timeout: 8000, maximumAge: TTL }
    );
  }, []);

  if (!weather) return null;
  const d = describe(weather.code);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm">
      <span>{d.icon}</span>
      <span className="font-semibold tabular-nums">{weather.temp}°C</span>
      <span className="text-muted-foreground">{d.label}</span>
    </span>
  );
}
