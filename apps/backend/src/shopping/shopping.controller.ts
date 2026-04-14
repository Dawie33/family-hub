import { Controller, Get, Query } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'

@Controller('shopping')
export class ShoppingController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('lists')
  async getLists(@Query('family_id') familyId?: string) {
    let query = this.supabase.db
      .from('shopping_lists')
      .select('id, name, color, created_at, family_id')
      .order('created_at', { ascending: false })
      .limit(10)

    if (familyId) query = query.eq('family_id', familyId)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data
  }

  @Get('items')
  async getItems(@Query('list_id') listId: string) {
    const { data, error } = await this.supabase.db
      .from('shopping_items')
      .select('id, name, quantity, unit, checked')
      .eq('list_id', listId)
      .order('checked', { ascending: true })

    if (error) throw new Error(error.message)
    return data
  }
}
