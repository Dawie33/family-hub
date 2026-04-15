import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class MessageDto {
  @IsString()
  role: 'user' | 'assistant'

  @IsString()
  content: string
}

export class ChatRequestDto {
  @IsString()
  message: string

  @IsString()
  @IsOptional()
  session_id?: string

  @IsString()
  @IsOptional()
  family_id?: string

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  conversation_history?: MessageDto[]
}

export class ChatResponseDto {
  response: string
  image?: string
  pdfUrl?: string
  conversation_id?: string

  agent?: {
    id: string
    name: string
    label: string
    category: string
    icon?: string
  }
}
