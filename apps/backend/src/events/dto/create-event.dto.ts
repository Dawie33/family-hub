import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, IsIn } from 'class-validator';

export class CreateEventDto {
  @IsOptional()
  @IsString()
  family_id?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  start_date: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsBoolean()
  all_day?: boolean;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  reminder_minutes?: number;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @IsOptional()
  @IsIn(['school', 'vacation', 'birthday', 'appointment', 'sport', 'meal', 'family', 'other'])
  category?: 'school' | 'vacation' | 'birthday' | 'appointment' | 'sport' | 'meal' | 'family' | 'other';
}
