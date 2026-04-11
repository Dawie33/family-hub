import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.chat(chatRequest);
  }
}
