export type RatingStatus = 'Pending' | 'Succeeded' | 'Failed' | string;

export interface ReviewAggregate {
  productId?: string;
  shopId?: string;
  totalCount: number;
  averageRating: number;
  bayesianRating?: number;
  histogram: Record<number, number>;
}

export interface ReviewItem {
  id: string;
  productId: string;
  userId: string;
  shopId?: string | null;
  rating: number;
  title?: string | null;
  text?: string | null;
  imageUrls: string[];
  isAnonymous: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewCreateRequest {
  ProductId: string;
  UserId: string;
  Rating: number;
  Title?: string;
  Text?: string;
  Images?: File[];
  IsAnonymous: boolean;
}

export interface ReviewUpdateRequest {
  ReviewId: string;
  ProductId: string;
  UserId: string;
  Rating: number;
  Title?: string;
  Text?: string;
  Images?: File[];
  IsAnonymous: boolean;
}

export interface QuestionAnswer {
  id: string;
  questionId: string;
  shopId: string;
  text: string;
  createdAt?: string;
  shopName?: string;
}

export interface ProductQuestion {
  id: string;
  productId: string;
  userId: string;
  text: string;
  isAnonymous: boolean;
  createdAt?: string;
  answers: QuestionAnswer[];
}

export interface QuestionCreateRequest {
  ProductId: string;
  UserId: string;
  Text: string;
  IsAnonymous: boolean;
}

export interface QuestionUpdateRequest {
  QuestionId: string;
  ProductId: string;
  UserId: string;
  Text: string;
  IsAnonymous: boolean;
}

export interface AnswerCreateRequest {
  QuestionId: string;
  ShopId: string;
  Text: string;
}