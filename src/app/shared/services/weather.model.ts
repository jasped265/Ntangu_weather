export interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  conditionIcon: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  uvIndex: number;
  visibility: number;
  pressure: number;
  aqi: number;
  aqiLabel: string;
  sunrise: string;
  sunset: string;
  high: number;
  low: number;
  lat: number;
  lon: number;
  timestamp: Date;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  icon: string;
}

export interface DailyForecast {
  day: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  precipChance: number;
}

export interface WeatherAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  city: string;
  timestamp: Date;
}

export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  isFavorite: boolean;
  plan: 'free' | 'premium' | 'pro';
  sensors: number;
  status: 'stable' | 'warning' | 'alert';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  plan: 'free' | 'premium' | 'pro';
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: Date;
}
