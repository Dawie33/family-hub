import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(1)
  system_prompt: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
