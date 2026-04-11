import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { AgentsService } from './agents.service';


@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}


  @Get()
  findAll(@Query('category') category?: string) {
    if (category) {
      return this.agentsService.findByCategory(category);
    }
    return this.agentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

}
