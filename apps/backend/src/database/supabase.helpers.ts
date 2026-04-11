import { InternalServerErrorException } from '@nestjs/common'
import { PostgrestError } from '@supabase/supabase-js'

export function assertNoError<T>(
  data: T | null,
  error: PostgrestError | null,
  context: string,
): T {
  if (error) {
    throw new InternalServerErrorException(
      `Supabase error in ${context}: ${error.message}`,
    )
  }
  if (data === null) {
    throw new InternalServerErrorException(
      `Supabase returned null in ${context}`,
    )
  }
  return data
}
