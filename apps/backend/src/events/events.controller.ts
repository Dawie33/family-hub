import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto)
  }

  @Get()
  findAll(@Query('period') period?: string) {
    switch (period) {
      case 'today': return this.eventsService.findToday()
      case 'week': return this.eventsService.findThisWeek()
      case 'upcoming': return this.eventsService.findUpcoming()
      default: return this.eventsService.findAll()
    }
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.eventsService.search(query)
  }

  @Get('range')
  findByRange(@Query('start') start: string, @Query('end') end: string) {
    return this.eventsService.findByDateRange(new Date(start), new Date(end))
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id)
  }
}
