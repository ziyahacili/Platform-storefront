import { apiClient, apiGet, apiPost } from './client';
import type {
  AnswerCreateRequest,
  ProductQuestion,
  QuestionAnswer,
  QuestionCreateRequest,
  QuestionUpdateRequest,
  ReviewAggregate,
  ReviewCreateRequest,
  ReviewUpdateRequest,
  ReviewItem,
} from '@/types/review';

const RATING_BASE = '/rating';

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function firstString(...values: any[]) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function firstNumber(...values: any[]) {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

function mapReview(raw: any): ReviewItem {
  return {
    id: firstString(raw.id, raw.reviewId, raw.ReviewId),
    productId: firstString(raw.productId, raw.ProductId),
    userId: firstString(raw.userId, raw.UserId),
    shopId: raw.shopId ?? raw.ShopId ?? null,
    rating: firstNumber(raw.rating, raw.Rating),
    title: raw.title ?? raw.Title ?? null,
    text: raw.text ?? raw.Text ?? null,
    imageUrls: asArray(raw.imageUrls ?? raw.ImageUrls).filter(
      (x) => typeof x === 'string' && x.trim()
    ),
    isAnonymous: Boolean(raw.isAnonymous ?? raw.IsAnonymous),
    createdAt: raw.createdAt ?? raw.CreatedAt ?? raw.createdAtUtc ?? '',
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? '',
  };
}

function mapAnswer(raw: any): QuestionAnswer {
  return {
    id: firstString(raw.id, raw.answerId, raw.AnswerId),
    questionId: firstString(raw.questionId, raw.QuestionId),
    shopId: firstString(raw.shopId, raw.ShopId),
    text: firstString(raw.text, raw.Text),
    createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
    shopName: raw.shopName ?? raw.ShopName ?? '',
  };
}

function mapQuestion(raw: any): ProductQuestion {
  const answersRaw =
    raw.answers ?? raw.Answers ?? raw.questionAnswers ?? raw.QuestionAnswers ?? [];
  return {
    id: firstString(raw.id, raw.questionId, raw.QuestionId),
    productId: firstString(raw.productId, raw.ProductId),
    userId: firstString(raw.userId, raw.UserId),
    text: firstString(raw.text, raw.Text),
    isAnonymous: Boolean(raw.isAnonymous ?? raw.IsAnonymous),
    createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
    answers: asArray(answersRaw).map(mapAnswer),
  };
}

function mapAggregate(raw: any): ReviewAggregate {
  const histogramRaw = raw.histogram ?? raw.Histogram ?? {};
  const histogram: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const key of [1, 2, 3, 4, 5]) {
    const v = histogramRaw[key] ?? histogramRaw[String(key)] ?? 0;
    histogram[key] = Number(v) || 0;
  }
  return {
    productId: raw.productId ?? raw.ProductId,
    shopId: raw.shopId ?? raw.ShopId,
    totalCount: firstNumber(raw.totalCount, raw.TotalCount, raw.reviewCount, raw.ReviewCount),
    averageRating: firstNumber(raw.averageRating, raw.AverageRating),
    bayesianRating: raw.bayesianRating ?? raw.BayesianRating ?? undefined,
    histogram,
  };
}

function extractErrorMessage(error: any): string {
  const data = error?.response?.data;
  if (data) {
    const msg =
      data.exceptionMessage ||
      data.ExceptionMessage ||
      data.message ||
      data.Message ||
      data.error ||
      data.Error ||
      data.detail ||
      data.Detail;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  return error?.message || 'Неизвестная ошибка';
}

// ─── Reviews API ──────────────────────────────────────────────────────────────

export const reviewsAPI = {
  async getProductReviews(productId: string, pageNumber = 1, pageSize = 10): Promise<ReviewItem[]> {
    try {
      const data = await apiGet<unknown>(
        `${RATING_BASE}/reviews/product/${encodeURIComponent(productId)}`
      );
      if (Array.isArray(data)) return data.map(mapReview);
      if (data && typeof data === 'object') {
        const d = data as Record<string, any>;
        if (Array.isArray(d.items)) return d.items.map(mapReview);
        if (Array.isArray(d.data)) return d.data.map(mapReview);
        if (Array.isArray(d.result)) return d.result.map(mapReview);
      }
      return [];
    } catch {
      return [];
    }
  },

  async getProductAggregate(productId: string): Promise<ReviewAggregate | null> {
    try {
      const data = await apiGet<unknown>(
        `${RATING_BASE}/reviews/product/${encodeURIComponent(productId)}/aggregate`
      );
      return mapAggregate(data);
    } catch {
      return null;
    }
  },

  async getShopAggregate(shopId: string): Promise<ReviewAggregate | null> {
    try {
      const data = await apiGet<unknown>(
        `${RATING_BASE}/reviews/shop/${encodeURIComponent(shopId)}/aggregate`
      );
      return mapAggregate(data);
    } catch {
      return null;
    }
  },

  async createReview(payload: ReviewCreateRequest): Promise<ReviewItem> {
    const url = `${RATING_BASE}/reviews`;
    const formData = new FormData();

    formData.append('ProductId', payload.ProductId);
    formData.append('UserId', payload.UserId);
    formData.append('Rating', String(payload.Rating));

    if (payload.Title && payload.Title.trim()) {
      formData.append('Title', payload.Title.trim());
    }
    if (payload.Text && payload.Text.trim()) {
      formData.append('Text', payload.Text.trim());
    }
    if (payload.Images && payload.Images.length > 0) {
      payload.Images.forEach((file) => {
        formData.append('Images', file, file.name);
      });
    }

    formData.append('IsAnonymous', payload.IsAnonymous ? 'true' : 'false');

    try {
      const res = await apiClient.post(url, formData, {
        headers: { 'Content-Type': undefined as any },
      });
      return mapReview(res.data);
    } catch (error: any) {
      const message = extractErrorMessage(error);
      const enriched = new Error(message);
      (enriched as any).originalError = error;
      throw enriched;
    }
  },

  /**
   * Update an existing review.
   * Uses PUT /rating/reviews/{reviewId} with multipart/form-data
   * (same structure as create — backend expects same field names).
   */
 async updateReview(payload: ReviewUpdateRequest): Promise<ReviewItem> {
    const url = `${RATING_BASE}/reviews`;
    const formData = new FormData();

    formData.append('ReviewId', payload.ReviewId);
    formData.append('ProductId', payload.ProductId);
    formData.append('UserId', payload.UserId);
    formData.append('Rating', String(payload.Rating));

    if (payload.Title && payload.Title.trim()) {
      formData.append('Title', payload.Title.trim());
    }

    if (payload.Text && payload.Text.trim()) {
      formData.append('Text', payload.Text.trim());
    }

    if (payload.Images && payload.Images.length > 0) {
      payload.Images.forEach((file) => {
        formData.append('Images', file, file.name);
      });
    }

    formData.append('IsAnonymous', payload.IsAnonymous ? 'true' : 'false');

    try {
      await apiClient.put(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedReview = await apiGet<unknown>(
        `${RATING_BASE}/reviews/${encodeURIComponent(payload.ReviewId)}`
      );

      return mapReview(updatedReview);
    } catch (error: any) {
      const message = extractErrorMessage(error);
      const enriched = new Error(message);
      (enriched as any).originalError = error;
      throw enriched;
    }
  },


  async getReviewsByUser(userId: string, pageNumber = 1, pageSize = 10): Promise<ReviewItem[]> {
    try {
      const data = await apiGet<unknown>(
        `${RATING_BASE}/reviews/user/${encodeURIComponent(userId)}?pageNumber=${pageNumber}&pageSize=${pageSize}`
      );
      if (Array.isArray(data)) return data.map(mapReview);
      return [];
    } catch {
      return [];
    }
  },
};

// ─── Q&A API ──────────────────────────────────────────────────────────────────

export const qnaAPI = {
  async getProductQuestions(productId: string, page = 1, pageSize = 20): Promise<ProductQuestion[]> {
    try {
      const data = await apiGet<unknown>(
        `${RATING_BASE}/questionsandanswers/product/${encodeURIComponent(productId)}`
      );
      if (Array.isArray(data)) return data.map(mapQuestion);
      if (data && typeof data === 'object') {
        const d = data as Record<string, any>;
        if (Array.isArray(d.items)) return d.items.map(mapQuestion);
        if (Array.isArray(d.data)) return d.data.map(mapQuestion);
        if (Array.isArray(d.result)) return d.result.map(mapQuestion);
      }
      return [];
    } catch {
      return [];
    }
  },

  async createQuestion(payload: QuestionCreateRequest): Promise<ProductQuestion> {
    try {
      const res = await apiPost<any>(`${RATING_BASE}/questionsandanswers/questions`, payload);
      return mapQuestion(res);
    } catch (error: any) {
      const message = extractErrorMessage(error);
      throw new Error(message);
    }
  },

  /**
   * Update an existing question.
   * Uses PUT /rating/questionsandanswers/questions/{questionId}
   */
   async updateQuestion(payload: QuestionUpdateRequest): Promise<ProductQuestion> {
    const url = `${RATING_BASE}/questionsandanswers/questions`;

    try {
      const res = await apiClient.put(url, {
        QuestionId: payload.QuestionId,
        ProductId: payload.ProductId,
        UserId: payload.UserId,
        Text: payload.Text,
        IsAnonymous: payload.IsAnonymous,
      });

      if (res.data && typeof res.data === 'object') {
        return mapQuestion(res.data);
      }

      return {
        id: payload.QuestionId,
        productId: payload.ProductId,
        userId: payload.UserId,
        text: payload.Text,
        isAnonymous: payload.IsAnonymous,
        createdAt: '',
        answers: [],
      };
    } catch (error: any) {
      const message = extractErrorMessage(error);
      throw new Error(message);
    }
  },


  async createAnswer(payload: AnswerCreateRequest): Promise<QuestionAnswer> {
    try {
      const res = await apiPost<any>(`${RATING_BASE}/questionsandanswers/answers`, payload);
      return mapAnswer(res);
    } catch (error: any) {
      const message = extractErrorMessage(error);
      throw new Error(message);
    }
  },
};