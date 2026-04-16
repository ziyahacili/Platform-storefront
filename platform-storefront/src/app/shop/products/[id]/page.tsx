'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { productsAPI } from '@/lib/api/products';
import { shopsAPI } from '@/lib/api/shops';
import { reviewsAPI, qnaAPI } from '@/lib/api/reviews';
import { cartAPI } from '@/lib/api/cart';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types/product';
import type { ProductQuestion, ReviewItem } from '@/types/review';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtendedProduct = Product & {
  image?: string;
  oldPrice?: number;
  discountPercent?: number;
  rating?: number;
  ratingCount?: number;
  installmentMonths?: number;
  brand?: string;
  shopName?: string;
  sellerName?: string;
  shop?: { id?: string; name?: string; image?: string };
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  productId: ['currentProductId', 'selectedProductId', 'productId'],
  userId: ['currentUserId', 'selectedUserId', 'userId'],
} as const;

function getStoredString(keys: readonly string[]) {
  if (typeof window === 'undefined') return '';
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value && value.trim()) return value.trim();
  }
  return '';
}

function setStoredValue(keys: readonly string[], value: string) {
  if (typeof window === 'undefined') return;
  for (const key of keys) {
    window.localStorage.setItem(key, value);
  }
}

function getEffectiveUserId(fallbackUserId?: string) {
  const stored = getStoredString(STORAGE_KEYS.userId);
  return stored || fallbackUserId || '';
}

// ─── Product helpers ──────────────────────────────────────────────────────────

function getProductImages(product: ExtendedProduct): string[] {
  const urls = product.imageUrls ?? [];
  const image = product.image ? [product.image] : [];
  const merged = [...urls, ...image].filter(Boolean);
  return merged.length > 0 ? merged : ['/placeholder-product.svg'];
}

function getDiscountPercent(product: ExtendedProduct) {
  if (typeof product.discountPercent === 'number') return product.discountPercent;
  const oldPrice = product.oldPrice;
  if (typeof oldPrice === 'number' && oldPrice > product.price && oldPrice > 0) {
    return Math.round(((oldPrice - product.price) / oldPrice) * 100);
  }
  return null;
}

function getOldPrice(product: ExtendedProduct) {
  if (typeof product.oldPrice === 'number' && product.oldPrice > product.price) {
    return product.oldPrice;
  }
  return null;
}

function getInstallmentMonths(product: ExtendedProduct) {
  if (typeof product.installmentMonths === 'number' && product.installmentMonths > 0) {
    return product.installmentMonths;
  }
  return 18;
}

function getProductShopName(product: ExtendedProduct) {
  return product.shopName ?? product.sellerName ?? product.shop?.name ?? 'Магазин';
}

function getProductShopId(product: ExtendedProduct) {
  return product.shop?.id ?? '';
}

function getProductBrand(product: ExtendedProduct) {
  return product.brand ?? product.shopName ?? product.sellerName ?? product.shop?.name ?? 'Без бренда';
}

// ─── Review / Question helpers ────────────────────────────────────────────────

function getAuthorNameFromReview(review: ReviewItem) {
  const raw = review as unknown as Record<string, any>;
  const candidates = [
    raw.userName, raw.fullName, raw.authorName, raw.name,
    raw.userFullName, raw.createdByName, raw.user?.name,
    raw.user?.fullName, raw.profile?.name, raw.profile?.fullName,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return review.isAnonymous ? 'Анонимный пользователь' : `Пользователь ${review.userId.slice(0, 8)}`;
}

function getQuestionAuthorName(question: ProductQuestion) {
  const raw = question as unknown as Record<string, any>;
  const candidates = [
    raw.userName, raw.fullName, raw.authorName, raw.name,
    raw.userFullName, raw.createdByName, raw.user?.name, raw.user?.fullName,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return question.isAnonymous ? 'Анонимный пользователь' : `Пользователь ${question.userId.slice(0, 8)}`;
}

function getAnswerShopName(answer: any, fallback: string) {
  const candidates = [
    answer?.shopName, answer?.shop?.name, answer?.sellerName,
    answer?.companyName, answer?.merchantName,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function getReviewImages(review: ReviewItem) {
  return review.imageUrls?.length ? review.imageUrls : [];
}

function normalizeQuestion(raw: ProductQuestion) {
  return { ...raw, answers: Array.isArray(raw.answers) ? raw.answers : [] };
}

function safeDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" style={{ color: '#F59E0B' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true" className="h-[14px] w-[14px]"
          fill={i < rounded ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path d="M12 17.3l-5.18 2.73 0.99-5.76-4.19-4.07 5.79-.84L12 4.1l2.59 5.26 5.79.84-4.19 4.07.99 5.76L12 17.3z" />
        </svg>
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1;
        const active = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
            style={{ color: active ? '#F59E0B' : '#D1D5DB' }}
          >
            <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="currentColor" stroke="none">
              <path d="M12 17.3l-5.18 2.73 0.99-5.76-4.19-4.07 5.79-.84L12 4.1l2.59 5.26 5.79.84-4.19 4.07.99 5.76L12 17.3z" />
            </svg>
          </button>
        );
      })}
      <span className="ml-2 text-[12px] font-semibold text-[#6B7280]">{hovered || value} / 5</span>
    </div>
  );
}

function AvatarMark({ name }: { name: string }) {
  const letter = name.charAt(0).toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[13px] font-semibold text-white"
      style={{ background: '#1D1D1F' }}>
      {letter}
    </div>
  );
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// ─── Inline Edit Form (shared for review / question) ─────────────────────────

function InlineEditBox({
  children,
  onCancel,
  onSave,
  saving,
  label,
}: {
  children: React.ReactNode;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  label: string;
}) {
  return (
    <div className="mt-4 border border-[#E8EAF0] bg-[#FAFAFA] p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
        Редактирование
      </div>
      {children}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-9 px-5 text-[12px] font-semibold tracking-wide text-white transition-opacity disabled:opacity-60"
          style={{ background: '#1D1D1F' }}
        >
          {saving ? 'Сохранение...' : label}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-4 text-[12px] font-semibold text-[#9CA3AF] transition-colors hover:text-[#1D1D1F]"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Review Card (with edit) ──────────────────────────────────────────────────

function ReviewCard({
  review,
  currentUserId,
  onEdit,
}: {
  review: ReviewItem;
  currentUserId: string;
  onEdit: (review: ReviewItem) => void;
}) {
  const images = getReviewImages(review);
  const authorName = getAuthorNameFromReview(review);
  const isOwner = !!currentUserId && review.userId === currentUserId;

  return (
    <div className="flex gap-4 border-b border-[#E8EAF0] pb-8 last:border-none last:pb-0">
      <AvatarMark name={authorName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-semibold text-[#1D1D1F]">{authorName}</div>
            <div className="mt-1"><Stars value={review.rating} /></div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-[11px] tracking-wide text-[#9CA3AF]">{safeDate(review.createdAt)}</div>
            {isOwner && (
              <button
                type="button"
                onClick={() => onEdit(review)}
                className="flex items-center gap-1 text-[11px] font-semibold tracking-wide transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1D1D1F')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
              >
                <IconEdit />
                Изменить
              </button>
            )}
          </div>
        </div>

        {review.title && (
          <div className="mt-3 text-[14px] font-semibold text-[#1D1D1F]">{review.title}</div>
        )}
        {review.text && (
          <p className="mt-2 max-w-[700px] text-[13px] leading-[1.7] text-[#6B7280]">{review.text}</p>
        )}

        {images.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {images.map((src, idx) => (
              <div key={`${src}-${idx}`}
                className="relative h-[72px] w-[72px] overflow-hidden border border-[#E8EAF0] bg-white">
                <Image src={src} alt={`review-${review.id}-${idx}`} fill
                  className="object-cover" unoptimized={src.startsWith('http')} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question Card (with edit) ────────────────────────────────────────────────

function QuestionCard({
  question,
  currentUserId,
  onReply,
  onEdit,
}: {
  question: ProductQuestion;
  currentUserId: string;
  onReply: (questionId: string) => void;
  onEdit: (question: ProductQuestion) => void;
}) {
  const authorName = getQuestionAuthorName(question);
  const isOwner = !!currentUserId && question.userId === currentUserId;

  return (
    <div className="flex gap-4 border-b border-[#E8EAF0] pb-8 last:border-none last:pb-0">
      <AvatarMark name={authorName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-semibold text-[#1D1D1F]">{authorName}</div>
            <div className="text-[11px] tracking-wide text-[#9CA3AF] mt-0.5">{safeDate(question.createdAt)}</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isOwner && (
              <button
                type="button"
                onClick={() => onEdit(question)}
                className="flex items-center gap-1 text-[11px] font-semibold tracking-wide transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1D1D1F')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
              >
                <IconEdit />
                Изменить
              </button>
            )}
            <button
              type="button"
              onClick={() => onReply(question.id)}
              className="text-[12px] font-semibold tracking-wide transition-colors"
              style={{ color: '#F64FA0' }}
            >
              Ответить
            </button>
          </div>
        </div>

        <p className="mt-3 max-w-[700px] text-[13px] leading-[1.7] text-[#6B7280]">{question.text}</p>

        <div className="mt-4 space-y-3">
          {question.answers?.length > 0 ? (
            question.answers.map((answer) => {
              const shopLabel = getAnswerShopName(answer, 'Магазин');
              return (
                <div key={answer.id} className="ml-8 border-l-2 border-[#E8EAF0] pl-4">
                  <div className="text-[13px] font-semibold text-[#1D1D1F]">{shopLabel}</div>
                  <p className="mt-1 text-[13px] leading-[1.7] text-[#6B7280]">{answer.text}</p>
                  <div className="mt-1 text-[11px] text-[#9CA3AF]">{safeDate(answer.createdAt)}</div>
                </div>
              );
            })
          ) : (
            <div className="ml-8 text-[12px] text-[#9CA3AF]">Ответов пока нет</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#EFEFEF' }}>
      <div className="mx-auto max-w-[1440px] px-6 py-6">
        <div className="h-3 w-64 animate-pulse bg-[#D1D5DB]" />
        <div className="mt-6 grid gap-6 xl:grid-cols-[88px_minmax(0,500px)_minmax(0,1.3fr)_300px]">
          <div className="hidden xl:flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[72px] w-[72px] animate-pulse bg-[#D1D5DB]" />
            ))}
          </div>
          <div className="aspect-square animate-pulse bg-[#D1D5DB]" />
          <div className="space-y-4 bg-white p-6">
            <div className="h-8 w-3/4 animate-pulse bg-[#E8EAF0]" />
            <div className="h-5 w-1/2 animate-pulse bg-[#E8EAF0]" />
            <div className="h-10 w-1/3 animate-pulse bg-[#E8EAF0]" />
          </div>
          <div className="space-y-4">
            <div className="h-40 animate-pulse bg-[#D1D5DB]" />
            <div className="h-32 animate-pulse bg-[#D1D5DB]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── product & media state
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // ── create review state
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewAnonymous, setReviewAnonymous] = useState(false);
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);

  // ── edit review state
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editReviewTitle, setEditReviewTitle] = useState('');
  const [editReviewText, setEditReviewText] = useState('');

  // ── create question state
  const [questionText, setQuestionText] = useState('');
  const [questionAnonymous, setQuestionAnonymous] = useState(false);

  // ── edit question state
  const [editingQuestion, setEditingQuestion] = useState<ProductQuestion | null>(null);
  const [editQuestionText, setEditQuestionText] = useState('');

  // ── reply state
  const [replyQuestionId, setReplyQuestionId] = useState<string>('');
  const [replyText, setReplyText] = useState('');

  // ── sync storage
  useEffect(() => { setStoredValue(STORAGE_KEYS.productId, id); }, [id]);
  useEffect(() => {
    if (user?.userId) setStoredValue(STORAGE_KEYS.userId, user.userId);
  }, [user?.userId]);

  // ── open edit review
  function openEditReview(review: ReviewItem) {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditReviewTitle(review.title ?? '');
    setEditReviewText(review.text ?? '');
  }

  // ── open edit question
  function openEditQuestion(question: ProductQuestion) {
    setEditingQuestion(question);
    setEditQuestionText(question.text);
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: productData, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsAPI.getProductDetail(id),
  });

  const product = productData as ExtendedProduct | undefined;
  const shopId = product ? getProductShopId(product) : '';

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['product-reviews', id],
    queryFn: () => reviewsAPI.getProductReviews(id, 1, 100),
    enabled: !!product,
  });

  const { data: productAggregate } = useQuery({
    queryKey: ['product-review-aggregate', id],
    queryFn: () => reviewsAPI.getProductAggregate(id),
    enabled: !!product,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['product-questions', id],
    queryFn: () => qnaAPI.getProductQuestions(id, 1, 100),
    enabled: !!product,
  });

  const { data: shopData } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsAPI.getShopById(shopId),
    enabled: !!shopId,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const addToCart = useMutation({
    mutationFn: (qty: number) => cartAPI.addItem(id, qty),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  // Create review
  const createReview = useMutation({
    mutationFn: async () => {
      const productIdToSend = getStoredString(STORAGE_KEYS.productId) || id;
      const userIdToSend = getEffectiveUserId(user?.userId);
      if (!productIdToSend) throw new Error('ProductId not found');
      if (!userIdToSend) throw new Error('UserId not found');
      return reviewsAPI.createReview({
        ProductId: productIdToSend,
        UserId: userIdToSend,
        Rating: rating,
        Title: reviewTitle.trim() || undefined,
        Text: reviewText.trim() || undefined,
        Images: reviewFiles,
        IsAnonymous: reviewAnonymous,
      });
    },
    onSuccess: async () => {
      setReviewTitle(''); setReviewText(''); setReviewFiles([]); setRating(5); setReviewAnonymous(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product-reviews', id] }),
        queryClient.invalidateQueries({ queryKey: ['product-review-aggregate', id] }),
      ]);
    },
  });

  // Update review
  const updateReview = useMutation({
    mutationFn: async () => {
      if (!editingReview) throw new Error('No review selected');
      const userIdToSend = getEffectiveUserId(user?.userId);
      // Call the update endpoint — passes review id + updated fields
      return reviewsAPI.updateReview({
        ReviewId: editingReview.id,
        ProductId: editingReview.productId,
        UserId: userIdToSend,
        Rating: editRating,
        Title: editReviewTitle.trim() || undefined,
        Text: editReviewText.trim() || undefined,
        IsAnonymous: editingReview.isAnonymous,
      });
    },
    onSuccess: async () => {
      setEditingReview(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product-reviews', id] }),
        queryClient.invalidateQueries({ queryKey: ['product-review-aggregate', id] }),
      ]);
    },
  });

  // Create question
  const createQuestion = useMutation({
    mutationFn: async () => {
      const userIdToSend = getEffectiveUserId(user?.userId);
      if (!userIdToSend) throw new Error('UserId not found');
      return qnaAPI.createQuestion({
        ProductId: id,
        UserId: userIdToSend,
        Text: questionText.trim(),
        IsAnonymous: questionAnonymous,
      });
    },
    onSuccess: async () => {
      setQuestionText(''); setQuestionAnonymous(false);
      await queryClient.invalidateQueries({ queryKey: ['product-questions', id] });
    },
  });

  // Update question
  const updateQuestion = useMutation({
    mutationFn: async () => {
      if (!editingQuestion) throw new Error('No question selected');
      const userIdToSend = getEffectiveUserId(user?.userId);
      return qnaAPI.updateQuestion({
        QuestionId: editingQuestion.id,
        ProductId: editingQuestion.productId,
        UserId: userIdToSend,
        Text: editQuestionText.trim(),
        IsAnonymous: editingQuestion.isAnonymous,
      });
    },
    onSuccess: async () => {
      setEditingQuestion(null);
      await queryClient.invalidateQueries({ queryKey: ['product-questions', id] });
    },
  });

  // Create answer
  const createAnswer = useMutation({
    mutationFn: async ({ questionId, text }: { questionId: string; text: string }) => {
      if (!shopId) throw new Error('No shop id');
      return qnaAPI.createAnswer({ QuestionId: questionId, ShopId: shopId, Text: text.trim() });
    },
    onSuccess: async () => {
      setReplyQuestionId(''); setReplyText('');
      await queryClient.invalidateQueries({ queryKey: ['product-questions', id] });
    },
  });

  // ─── Derived state ────────────────────────────────────────────────────────

  const images = useMemo(
    () => (product ? getProductImages(product) : ['/placeholder-product.svg']),
    [product]
  );

  const mainImage = images[activeImageIndex] ?? images[0];
  const discountPercent = product ? getDiscountPercent(product) : null;
  const oldPrice = product ? getOldPrice(product) : null;
  const installmentMonths = product ? getInstallmentMonths(product) : 18;
  const installmentPrice = product ? Math.ceil(product.price / installmentMonths) : 0;
  const shopName = product ? getProductShopName(product) : 'Магазин';
  const normalizedReviews = useMemo(() => (reviews ?? []).map((r) => r), [reviews]);
  const normalizedQuestions = useMemo(
    () => ((questions ?? []) as ProductQuestion[]).map(normalizeQuestion),
    [questions]
  );
  const averageRating = productAggregate?.averageRating ?? product?.rating ?? 0;
  const totalRatings = productAggregate?.totalCount ?? product?.ratingCount ?? 0;
  const currentUserId = getEffectiveUserId(user?.userId);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) return <DetailSkeleton />;

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#EFEFEF' }}>
        <div className="bg-white border border-[#E8EAF0] px-10 py-12 text-center max-w-sm w-full">
          <div className="text-[15px] font-semibold text-[#1D1D1F]">Продукт не найден</div>
          <Link href="/shop/products" className="mt-4 inline-block text-[13px] font-semibold transition-colors"
            style={{ color: '#F64FA0' }}>
            ← Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#1D1D1F]"
      style={{ background: '#EFEFEF', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-[1440px] px-6 py-5">

        {/* Breadcrumb */}
        <div className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] tracking-wide text-[#9CA3AF]">
          <Link href="/" className="transition-colors hover:text-[#1D1D1F]">Главная</Link>
          <span>/</span>
          <Link href="/shop/products" className="transition-colors hover:text-[#1D1D1F]">Каталог</Link>
          <span>/</span>
          <span className="truncate text-[#6B7280]">{product.name}</span>
        </div>

        {/* Main grid */}
        <div className="grid gap-4 xl:grid-cols-[88px_minmax(0,500px)_minmax(0,1.3fr)_300px]">

          {/* Thumbnails */}
          <div className="hidden xl:flex flex-col gap-2">
            {images.slice(0, 6).map((img, index) => (
              <button key={`${img}-${index}`} type="button" onClick={() => setActiveImageIndex(index)}
                className="relative h-[72px] w-[72px] overflow-hidden border bg-white transition-all"
                style={{
                  borderColor: activeImageIndex === index ? '#1D1D1F' : '#E8EAF0',
                  outline: activeImageIndex === index ? '1px solid #1D1D1F' : 'none',
                }}>
                <Image src={img} alt={`${product.name} ${index + 1}`} fill
                  className="object-contain p-1.5" unoptimized={img.startsWith('http')} />
              </button>
            ))}
          </div>

          {/* Main image */}
          <div className="relative min-w-0">
            <div className="relative aspect-square overflow-hidden bg-white" style={{ border: '1px solid #E8EAF0' }}>
              <Image src={mainImage} alt={product.name} fill priority className="object-contain p-8"
                sizes="(max-width: 1280px) 100vw, 50vw" unoptimized={mainImage.startsWith('http')} />
              {discountPercent !== null && (
                <div className="absolute left-3 top-3 px-2 py-1 text-[11px] font-bold tracking-wider text-white"
                  style={{ background: '#F64FA0' }}>
                  -{discountPercent}%
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {images.slice(0, 6).map((img, index) => (
                <button key={`${img}-${index}`} type="button" onClick={() => setActiveImageIndex(index)}
                  className="relative h-[64px] w-[64px] shrink-0 overflow-hidden border bg-white"
                  style={{ borderColor: activeImageIndex === index ? '#1D1D1F' : '#E8EAF0' }}>
                  <Image src={img} alt={`${product.name} ${index + 1}`} fill
                    className="object-contain p-2" unoptimized={img.startsWith('http')} />
                </button>
              ))}
            </div>
          </div>

          {/* Product info */}
          <div className="min-w-0 bg-white p-6" style={{ border: '1px solid #E8EAF0' }}>
            <div className="flex flex-wrap gap-1.5">
              {discountPercent !== null && (
                <span className="px-2 py-0.5 text-[11px] font-bold tracking-wide text-white"
                  style={{ background: '#F64FA0' }}>
                  -{discountPercent}%
                </span>
              )}
              <span className="border border-[#D1FAE5] bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#065F46]">
                Бесплатная доставка
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold text-[#1D1D1F]" style={{ background: '#FFD84D' }}>
                Кредит до 2х лет
              </span>
            </div>

            <h1 className="mt-4 text-[22px] font-bold leading-[1.3] text-[#1D1D1F]"
              style={{ letterSpacing: '-0.02em' }}>
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Stars value={typeof product.rating === 'number' ? product.rating : 5} />
              <span className="text-[12px] text-[#9CA3AF]">
                {typeof product.ratingCount === 'number' ? `${product.ratingCount} отзывов` : 'Нет отзывов'}
              </span>
              <span className="h-3 w-px bg-[#E8EAF0]" />
              <span className="text-[12px] text-[#9CA3AF]">
                Магазин: <span className="font-semibold text-[#1D1D1F]">{shopName}</span>
              </span>
            </div>

            <div className="my-5 border-t border-[#E8EAF0]" />

            <div className="flex flex-wrap items-baseline gap-3">
              <div className="text-[32px] font-bold leading-none text-[#1D1D1F]"
                style={{ letterSpacing: '-0.03em' }}>
                {formatPrice(product.price)}
              </div>
              {oldPrice !== null && (
                <div className="text-[17px] font-medium leading-none text-[#9CA3AF] line-through">
                  {formatPrice(oldPrice)}
                </div>
              )}
            </div>

            <div className="mt-4 inline-flex items-center gap-2 border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2">
              <span className="text-[11px] font-bold tracking-wider text-[#92400E]">РАССРОЧКА</span>
              <span className="text-[13px] font-semibold text-[#1D1D1F]">
                {installmentPrice} ₼ × {installmentMonths} мес
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={() => addToCart.mutate(quantity)}
                disabled={(product.stockQuantity ?? 0) <= 0}
                className="flex h-[48px] items-center justify-center px-8 text-[14px] font-semibold tracking-wide text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#1D1D1F' }}>
                {addToCart.isPending ? 'Добавление...' : 'В корзину'}
              </button>
              <div className="flex items-center border border-[#E8EAF0] bg-white">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-[48px] w-11 items-center justify-center text-[18px] text-[#6B7280] transition-colors hover:text-[#1D1D1F]">
                  −
                </button>
                <span className="w-10 text-center text-[14px] font-semibold text-[#1D1D1F]">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-[48px] w-11 items-center justify-center text-[18px] text-[#6B7280] transition-colors hover:text-[#1D1D1F]">
                  +
                </button>
              </div>
            </div>

            <div className="mt-7">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">О товаре</div>
              <p className="text-[13px] leading-[1.75] text-[#6B7280]">
                {product.description || 'Описание отсутствует.'}
              </p>
              <div className="mt-5 grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
                <div className="text-[#9CA3AF]">Бренд</div>
                <div className="font-semibold text-[#1D1D1F]">{getProductBrand(product)}</div>
                <div className="text-[#9CA3AF]">Магазин</div>
                <div className="font-semibold text-[#1D1D1F]">{shopName}</div>
                <div className="text-[#9CA3AF]">В наличии</div>
                <div className="font-semibold text-[#1D1D1F]">
                  {(product.stockQuantity ?? 0) > 0 ? `${product.stockQuantity} шт.` : 'Нет в наличии'}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-3">
            <div className="bg-white p-5" style={{ border: '1px solid #E8EAF0' }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Продавец</div>
              <div className="mt-2 text-[15px] font-bold text-[#1D1D1F]">{shopData?.name ?? shopName}</div>
              {typeof productAggregate?.averageRating === 'number' && (
                <div className="mt-1 flex items-center gap-1.5">
                  <Stars value={productAggregate.averageRating} />
                  <span className="text-[12px] text-[#9CA3AF]">{productAggregate.averageRating.toFixed(1)}</span>
                </div>
              )}
              <Link href={`/shop?id=${shopId}`}
                className="mt-4 flex h-9 w-full items-center justify-center border border-[#E8EAF0] text-[12px] font-semibold tracking-wide text-[#1D1D1F] transition-colors hover:border-[#1D1D1F]">
                Перейти в магазин
              </Link>
            </div>

            <div className="bg-white p-5" style={{ border: '1px solid #E8EAF0' }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Рейтинг товара</div>
              <div className="mt-3 flex items-baseline gap-3">
                <div className="text-[36px] font-bold leading-none text-[#1D1D1F]"
                  style={{ letterSpacing: '-0.03em' }}>
                  {typeof averageRating === 'number' ? averageRating.toFixed(1) : '—'}
                </div>
                <div className="flex flex-col gap-0.5">
                  <Stars value={averageRating} />
                  <span className="text-[11px] text-[#9CA3AF]">
                    {totalRatings > 0 ? `${totalRatings} отзывов` : 'Нет отзывов'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5" style={{ border: '1px solid #E8EAF0' }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Доставка и оплата</div>
              <div className="mt-3 space-y-2.5 text-[13px]">
                {[
                  { label: 'Самовывоз', value: 'Бесплатно' },
                  { label: 'Курьер', value: 'от 50.00 ₼' },
                  { label: 'Оплата', value: 'Картой / при получении' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-[#9CA3AF]">{row.label}</span>
                    <span className="font-semibold text-[#1D1D1F]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {(product.stockQuantity ?? 0) <= 5 && (product.stockQuantity ?? 0) > 0 && (
              <div className="border border-[#FDE68A] bg-[#FFFBEB] p-4 text-[12px] text-[#92400E]">
                <span className="font-bold">Осталось мало!</span> Только {product.stockQuantity} шт.
              </div>
            )}
          </aside>
        </div>

        {/* ─── Reviews section ───────────────────────────────────────────────── */}
        <section className="mt-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">

            {/* Review list */}
            <div className="bg-white p-8" style={{ border: '1px solid #E8EAF0' }}>
              <div className="flex items-baseline gap-4 border-b border-[#E8EAF0] pb-6">
                <h2 className="text-[20px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
                  Отзывы
                </h2>
                {totalRatings > 0 && (
                  <span className="text-[13px] text-[#9CA3AF]">{totalRatings} отзывов</span>
                )}
              </div>

              <div className="mt-6 space-y-0">
                {reviewsLoading ? (
                  <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="h-9 w-9 animate-pulse bg-[#E8EAF0]" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-40 animate-pulse bg-[#E8EAF0]" />
                          <div className="h-3 w-24 animate-pulse bg-[#E8EAF0]" />
                          <div className="h-12 w-full animate-pulse bg-[#F3F4F6]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : normalizedReviews.length > 0 ? (
                  normalizedReviews.map((review) => (
                    <div key={review.id}>
                      <ReviewCard
                        review={review}
                        currentUserId={currentUserId}
                        onEdit={openEditReview}
                      />

                      {/* ── Inline edit form for this review ── */}
                      {editingReview?.id === review.id && (
                        <InlineEditBox
                          label="Сохранить отзыв"
                          saving={updateReview.isPending}
                          onCancel={() => setEditingReview(null)}
                          onSave={() => updateReview.mutate()}
                        >
                          <div className="space-y-3">
                            <div>
                              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                                Оценка
                              </div>
                              <StarPicker value={editRating} onChange={setEditRating} />
                            </div>
                            <input
                              value={editReviewTitle}
                              onChange={(e) => setEditReviewTitle(e.target.value)}
                              placeholder="Заголовок"
                              className="h-10 w-full border border-[#E8EAF0] bg-white px-3 text-[13px] text-[#1D1D1F] outline-none placeholder:text-[#9CA3AF] focus:border-[#1D1D1F]"
                            />
                            <textarea
                              value={editReviewText}
                              onChange={(e) => setEditReviewText(e.target.value)}
                              placeholder="Текст отзыва..."
                              className="min-h-[90px] w-full border border-[#E8EAF0] bg-white px-3 py-2 text-[13px] text-[#1D1D1F] outline-none placeholder:text-[#9CA3AF] focus:border-[#1D1D1F]"
                            />
                            {updateReview.isError && (
                              <div className="text-[12px] text-red-500">
                                {(updateReview.error as Error)?.message ?? 'Ошибка при сохранении'}
                              </div>
                            )}
                          </div>
                        </InlineEditBox>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[13px] text-[#9CA3AF]">Отзывы пока отсутствуют</div>
                )}
              </div>
            </div>

            {/* Write review form */}
            <div className="space-y-4">
              <div className="bg-white p-6" style={{ border: '1px solid #E8EAF0' }}>
                <div className="text-[13px] font-bold uppercase tracking-[0.1em] text-[#1D1D1F]">
                  Оставить отзыв
                </div>
                {!user ? (
                  <div className="mt-4">
                    <p className="text-[13px] text-[#9CA3AF]">Войдите в аккаунт, чтобы оставить отзыв.</p>
                    <Link href="/login"
                      className="mt-3 flex h-10 items-center justify-center text-[13px] font-semibold text-white"
                      style={{ background: '#1D1D1F' }}>
                      Войти
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Оценка
                      </div>
                      <StarPicker value={rating} onChange={setRating} />
                    </div>
                    <input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="Заголовок"
                      className="h-10 w-full border border-[#E8EAF0] bg-[#FAFAFA] px-3 text-[13px] text-[#1D1D1F] outline-none placeholder:text-[#9CA3AF] focus:border-[#1D1D1F]" />
                    <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Ваш отзыв..."
                      className="min-h-[100px] w-full border border-[#E8EAF0] bg-[#FAFAFA] px-3 py-2 text-[13px] text-[#1D1D1F] outline-none placeholder:text-[#9CA3AF] focus:border-[#1D1D1F]" />
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                      Фото
                      <input type="file" multiple accept=".jpg,.jpeg,.png"
                        className="mt-1 block w-full text-[12px] text-[#6B7280]"
                        onChange={(e) => setReviewFiles(Array.from(e.target.files ?? []))} />
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#6B7280]">
                      <input type="checkbox" checked={reviewAnonymous}
                        onChange={(e) => setReviewAnonymous(e.target.checked)}
                        className="accent-[#1D1D1F]" />
                      Анонимный отзыв
                    </label>
                    {createReview.isError && (
                      <div className="text-[12px] text-red-500">
                        {(createReview.error as Error)?.message ?? 'Ошибка при отправке'}
                      </div>
                    )}
                    <button type="button" onClick={() => createReview.mutate()}
                      disabled={createReview.isPending}
                      className="h-10 w-full text-[13px] font-semibold tracking-wide text-white transition-opacity disabled:opacity-60"
                      style={{ background: '#1D1D1F' }}>
                      {createReview.isPending ? 'Отправка...' : 'Отправить отзыв'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Q&A section ───────────────────────────────────────────────────── */}
        <section className="mt-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">

            {/* Question list */}
            <div className="bg-white p-8" style={{ border: '1px solid #E8EAF0' }}>
              <div className="border-b border-[#E8EAF0] pb-6">
                <h2 className="text-[20px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
                  Вопросы и ответы
                </h2>
              </div>

              <div className="mt-6 space-y-0">
                {questionsLoading ? (
                  <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="h-9 w-9 animate-pulse bg-[#E8EAF0]" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-40 animate-pulse bg-[#E8EAF0]" />
                          <div className="h-12 w-full animate-pulse bg-[#F3F4F6]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : normalizedQuestions.length > 0 ? (
                  normalizedQuestions.map((question) => (
                    <div key={question.id}>
                      <QuestionCard
                        question={question}
                        currentUserId={currentUserId}
                        onReply={(qid) => setReplyQuestionId(qid)}
                        onEdit={openEditQuestion}
                      />

                      {/* ── Inline edit form for this question ── */}
                      {editingQuestion?.id === question.id && (
                        <InlineEditBox
                          label="Сохранить вопрос"
                          saving={updateQuestion.isPending}
                          onCancel={() => setEditingQuestion(null)}
                          onSave={() => updateQuestion.mutate()}
                        >
                          <textarea
                            value={editQuestionText}
                            onChange={(e) => setEditQuestionText(e.target.value)}
                            placeholder="Текст вопроса..."
                            className="min-h-[90px] w-full border border-[#E8EAF0] bg-white px-3 py-2 text-[13px] text-[#1D1D1F] outline-none placeholder:text-[#9CA3AF] focus:border-[#1D1D1F]"
                          />
                          {updateQuestion.isError && (
                            <div className="mt-2 text-[12px] text-red-500">
                              {(updateQuestion.error as Error)?.message ?? 'Ошибка при сохранении'}
                            </div>
                          )}
                        </InlineEditBox>
                      )}

                      {/* ── Reply form ── */}
                      {replyQuestionId === question.id && (
                        <div className="mt-4 ml-13 border-l-2 border-[#E8EAF0] pl-4">
                          <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Ответ магазина..."
                            className="min-h-[90px] w-full border border-[#E8EAF0] bg-[#FAFAFA] px-3 py-2 text-[13px] outline-none focus:border-[#1D1D1F]" />
                          <div className="mt-2 flex items-center gap-3">
                            <button type="button"
                              onClick={() => createAnswer.mutate({ questionId: question.id, text: replyText })}
                              disabled={createAnswer.isPending}
                              className="h-9 px-5 text-[12px] font-semibold tracking-wide text-white disabled:opacity-60"
                              style={{ background: '#1D1D1F' }}>
                              {createAnswer.isPending ? 'Отправка...' : 'Отправить'}
                            </button>
                            <button type="button"
                              onClick={() => { setReplyQuestionId(''); setReplyText(''); }}
                              className="h-9 px-4 text-[12px] font-semibold text-[#9CA3AF] hover:text-[#1D1D1F]">
                              Отмена
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[13px] text-[#9CA3AF]">Вопросов пока нет</div>
                )}
              </div>
            </div>

            {/* Ask question form */}
            <div className="bg-white p-6" style={{ border: '1px solid #E8EAF0' }}>
              <div className="text-[13px] font-bold uppercase tracking-[0.1em] text-[#1D1D1F]">Задать вопрос</div>
              {!user ? (
                <div className="mt-4">
                  <p className="text-[13px] text-[#9CA3AF]">Войдите в аккаунт, чтобы задать вопрос.</p>
                  <Link href="/login"
                    className="mt-3 flex h-10 items-center justify-center text-[13px] font-semibold text-white"
                    style={{ background: '#1D1D1F' }}>
                    Войти
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Напишите вопрос..."
                    className="min-h-[110px] w-full border border-[#E8EAF0] bg-[#FAFAFA] px-3 py-2 text-[13px] text-[#1D1D1F] outline-none placeholder:text-[#9CA3AF] focus:border-[#1D1D1F]" />
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#6B7280]">
                    <input type="checkbox" checked={questionAnonymous}
                      onChange={(e) => setQuestionAnonymous(e.target.checked)}
                      className="accent-[#1D1D1F]" />
                    Анонимный вопрос
                  </label>
                  {createQuestion.isError && (
                    <div className="text-[12px] text-red-500">
                      {(createQuestion.error as Error)?.message ?? 'Ошибка при отправке'}
                    </div>
                  )}
                  <button type="button" onClick={() => createQuestion.mutate()}
                    disabled={createQuestion.isPending}
                    className="h-10 w-full text-[13px] font-semibold tracking-wide text-white disabled:opacity-60"
                    style={{ background: '#1D1D1F' }}>
                    {createQuestion.isPending ? 'Отправка...' : 'Отправить вопрос'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}