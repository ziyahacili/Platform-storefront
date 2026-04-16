export interface Category {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string | null;
  slug?: string;
  level: number;
  sortOrder: number;
  imageUrl?: string | null;
  isActive: boolean;
  isVisible: boolean;
  children: Category[];
}