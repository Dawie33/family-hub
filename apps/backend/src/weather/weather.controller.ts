import { Controller, Get } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { CurrentWeather } from './weather.interface'

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  async getCurrent(): Promise<CurrentWeather> {
    return this.weatherService.getCurrentWeather();
  }
}
