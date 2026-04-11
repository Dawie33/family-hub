import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { GoogleCalendarService } from './google-calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  private get useGoogle() {
    return this.googleCalendarService.isConfigured
  }

  @Post()
  create(@Body() dto: CreateEventDto) {
    if (this.useGoogle) return this.googleCalendarService.createEvent(dto)
    return this.eventsService.create(dto)
  }

  @Get()
  findAll(@Query('period') period?: string) {
    if (this.useGoogle) {
      switch (period) {
        case 'today': return this.googleCalendarService.getEventsToday()
        case 'week': return this.googleCalendarService.getEventsThisWeek()
        default: return this.googleCalendarService.getEventsByRange(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        )
      }
    }
    switch (period) {
      case 'today': return this.eventsService.findToday()
      case 'week': return this.eventsService.findThisWeek()
      case 'upcoming': return this.eventsService.findUpcoming()
      default: return this.eventsService.findAll()
    }
  }

  @Get('search')
  search(@Query('q') query: string) {
    if (this.useGoogle) return this.googleCalendarService.searchEvents(query)
    return this.eventsService.search(query)
  }

  @Get('range')
  findByRange(@Query('start') start: string, @Query('end') end: string) {
    if (this.useGoogle) return this.googleCalendarService.getEventsByRange(new Date(start), new Date(end))
    return this.eventsService.findByDateRange(new Date(start), new Date(end))
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    if (this.useGoogle) return this.googleCalendarService.updateEvent(id, dto)
    return this.eventsService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    if (this.useGoogle) return this.googleCalendarService.deleteEvent(id)
    return this.eventsService.remove(id)
  }
}
