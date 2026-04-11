export interface ShoppingItem {
  item: string;
  quantity?: string;
  category?: string;
}

export interface GenerateShoppingListPdfDto {
  items: ShoppingItem[];
  summary?: string;
}
