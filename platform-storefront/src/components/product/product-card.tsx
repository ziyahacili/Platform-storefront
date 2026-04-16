import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types/product';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: Product & {
    oldPrice?: number;
    discountPercent?: number;
    rating?: number;
    ratingCount?: number;
    installmentMonths?: number;
  };
}

function getProductImage(product: Product): string {
  const urls = product.imageUrls ?? [];
  if (urls.length > 0) return urls[0];
  if ((product as any).image) return (product as any).image;
  return '/placeholder-product.svg';
}

function getDiscountPercent(product: ProductCardProps['product']) {
  if (typeof product.discountPercent === 'number') return product.discountPercent;
  const oldPrice = product.oldPrice;
  if (typeof oldPrice === 'number' && oldPrice > product.price && oldPrice > 0) {
    return Math.round(((oldPrice - product.price) / oldPrice) * 100);
  }
  return null;
}

function getOldPrice(product: ProductCardProps['product']) {
  if (typeof product.oldPrice === 'number' && product.oldPrice > product.price) {
    return product.oldPrice;
  }
  return null;
}

function getInstallmentMonths(product: ProductCardProps['product']) {
  if (typeof product.installmentMonths === 'number' && product.installmentMonths > 0) {
    return product.installmentMonths;
  }
  return 18;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[17px] w-[17px]">
      <path
        d="M12 21s-7.2-4.35-9.5-8.7C.7 8.6 2.25 5.5 5.6 4.6c1.9-.5 3.8.18 5.1 1.55 1.3-1.37 3.2-2.05 5.1-1.55 3.35.9 4.9 4 3.1 7.7C19.2 16.65 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true" className="h-3 w-3">
      <path
        d="M12 17.3l-5.18 2.73 0.99-5.76-4.19-4.07 5.79-.84L12 4.1l2.59 5.26 5.79.84-4.19 4.07.99 5.76L12 17.3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[16px] w-[16px]">
      <path
        d="M3 5h2l2.2 10.2A2 2 0 0 0 9.16 17H18a2 2 0 0 0 1.94-1.5L21 8H6.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.4" fill="currentColor" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = getProductImage(product);
  const discountPercent = getDiscountPercent(product);
  const oldPrice = getOldPrice(product);
  const installmentMonths = getInstallmentMonths(product);
  const installmentPrice = Math.ceil(product.price / installmentMonths);
  const rating = typeof product.rating === 'number' ? product.rating : null;
  const ratingCount = typeof product.ratingCount === 'number' ? product.ratingCount : null;

  return (
    <article
      className="relative h-full bg-white border-r border-b border-[#EDEFF5] transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(246,79,160,0.10)] hover:z-10"
      style={{ outline: 'none' }}
    >
      {/* Wishlist */}
      <button
        type="button"
        aria-label="Добавить в избранное"
        className="absolute right-3 top-3 z-20 inline-flex h-7 w-7 items-center justify-center text-[#C8CCDA] transition-colors hover:text-[#F64FA0]"
      >
        <HeartIcon />
      </button>

      <Link href={`/shop/products/${product.id}`} className="block h-full">
        <div className="flex h-full flex-col">
          {/* Image zone */}
          <div className="relative bg-[#FAFAFA] px-5 pt-10 pb-5">
            <div className="relative mx-auto h-[170px] w-full max-w-[240px]">
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-contain drop-shadow-sm"
                sizes="(max-width: 768px) 100vw, 25vw"
                unoptimized={imageUrl.startsWith('http')}
              />
            </div>

            {discountPercent !== null && (
              <div
                className="absolute left-0 top-4 bg-[#F64FA0] px-2.5 py-[3px] text-[11px] font-bold tracking-wide text-white"
                style={{ letterSpacing: '0.04em' }}
              >
                -{discountPercent}%
              </div>
            )}
          </div>

          {/* Info zone */}
          <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
            {/* Price row */}
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-[18px] font-bold leading-none text-[#1D1D1F]">
                {formatPrice(product.price)}
              </span>
              {oldPrice !== null && (
                <span className="text-[12px] leading-none text-[#AААААА] line-through" style={{ color: '#ABABAB' }}>
                  {formatPrice(oldPrice)}
                </span>
              )}
            </div>

            {/* Installment badge */}
            <div
              className="mb-3 inline-flex w-fit items-center bg-[#FFF3CC] px-2 py-[3px] text-[11px] font-semibold text-[#8A6800]"
              style={{ letterSpacing: '0.01em' }}
            >
              {installmentPrice} ₼ × {installmentMonths} мес
            </div>

            {/* Name */}
            <h3 className="mb-2 line-clamp-2 min-h-[40px] text-[13px] font-normal leading-[1.45] text-[#3D3D3F]">
              {product.name}
            </h3>

            {/* Rating */}
            {rating !== null && ratingCount !== null && (
              <div className="mb-3 flex items-center gap-1.5 text-[11px]">
                <div className="flex items-center gap-0.5 text-[#F5A623]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} filled={i < Math.round(rating)} />
                  ))}
                </div>
                <span className="text-[#ABABAB]">{ratingCount}</span>
              </div>
            )}

            {/* CTA */}
            <div className="mt-auto">
              <div className="flex h-[38px] items-center justify-center gap-2 bg-[#1D1D1F] text-[13px] font-semibold text-white transition-colors hover:bg-black">
                <CartIcon />
                <span>В корзину</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}