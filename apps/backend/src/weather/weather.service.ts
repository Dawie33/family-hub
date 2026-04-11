import { Injectable, Logger } from '@nestjs/common'
import { CurrentWeather } from './weather.interface'
import { WEATHER_DESCRIPTIONS } from './weather.constants'

interface WeatherCacheEntry {
  data: CurrentWeather
  cachedAt: number
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name)
  private readonly CACHE_TTL_MS = 30 * 60 * 1000
  private readonly API_URL =
    'https://api.open-meteo.com/v1/forecast?latitude=44.6533&longitude=-0.6167&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Europe/Paris'

  private weatherCache: WeatherCacheEntry | null = null

  private isCacheValid(): boolean {
    if (!this.weatherCache) return false
    return Date.now() - this.weatherCache.cachedAt < this.CACHE_TTL_MS
  }

  async getCurrentWeather(): Promise<CurrentWeather> {
    if (this.isCacheValid()) {
      this.logger.debug('Returning cached weather data (in-memory)')
      return this.weatherCache!.data
    }

    try {
      const response = await fetch(this.API_URL)
      if (!response.ok) {
        this.logger.error(`Open-Meteo API error: ${response.status}`)
        throw new Error(`Open-Meteo API error: ${response.status}`)
      }

      const data = await response.json()
      const current = data.current

      const weather: CurrentWeather = {
        temperature: Math.round(current.temperature_2m),
        apparentTemperature: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        weatherCode: current.weather_code,
        description: WEATHER_DESCRIPTIONS[current.weather_code] || 'Inconnu',
      }

      this.weatherCache = { data: weather, cachedAt: Date.now() }
      this.logger.log(`Weather fetched: ${weather.temperature}°C, ${weather.description}`)
      return weather
    } catch (error) {
      if (this.weatherCache) {
        this.logger.warn('API failed, returning stale cache')
        return this.weatherCache.data
      }
      this.logger.error('Failed to fetch weather:', error)
      throw error
    }
  }
}
