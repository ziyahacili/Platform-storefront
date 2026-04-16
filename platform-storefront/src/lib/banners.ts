'use client';

import { useEffect, useRef, useState } from 'react';

export type BannerSlot = 'hero' | 'side';

export interface BannerItem {
  id: string;
  slot: BannerSlot;
  title: string;
  subtitle?: string;
  link?: string;
  imageUrl: string;
  active: boolean;
  order: number;
}

export interface BannerState {
  hero: BannerItem[];
  side: BannerItem[];
}

export const BANNER_STORAGE_KEY = 'marketplace-banner-state-v1';
export const BANNER_UPDATED_EVENT = 'marketplace-banners-updated';

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `banner-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function svgDataUrl(options: {
  title: string;
  subtitle?: string;
  from: string;
  to: string;
  accent?: string;
}): string {
  const { title, subtitle, from, to, accent = '#ffffff' } = options;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${from}" />
          <stop offset="100%" stop-color="${to}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="600" rx="36" fill="url(#g)" />
      <circle cx="970" cy="130" r="180" fill="rgba(255,255,255,0.18)" />
      <circle cx="1010" cy="430" r="140" fill="rgba(255,255,255,0.12)" />
      <rect x="78" y="82" width="180" height="54" rx="18" fill="rgba(255,255,255,0.18)" />
      <text x="100" y="118" fill="${accent}" font-size="28" font-family="Arial, sans-serif" font-weight="700">Birmarket</text>
      <text x="78" y="230" fill="${accent}" font-size="58" font-family="Arial, sans-serif" font-weight="800">${title}</text>
      ${
        subtitle
          ? `<text x="78" y="300" fill="${accent}" font-size="30" font-family="Arial, sans-serif" font-weight="500">${subtitle}</text>`
          : ''
      }
      <rect x="78" y="392" width="240" height="66" rx="20" fill="rgba(255,255,255,0.18)" />
      <text x="118" y="435" fill="${accent}" font-size="28" font-family="Arial, sans-serif" font-weight="700">Купить сейчас</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function makeDefaultState(): BannerState {
  return {
    hero: [
      {
        id: createId(),
        slot: 'hero',
        title: 'Günün endirimləri',
        subtitle: 'Smart cihazlar və aksesuarlar',
        link: '/shop/products',
        imageUrl: svgDataUrl({
          title: 'Günün endirimləri',
          subtitle: 'Smart cihazlar və aksesuarlar',
          from: '#ec4899',
          to: '#8b5cf6',
        }),
        active: true,
        order: 1,
      },
      {
        id: createId(),
        slot: 'hero',
        title: 'Ev əşyalarını yenilə',
        subtitle: '0% -dən başlayan rahat alış',
        link: '/shop/products',
        imageUrl: svgDataUrl({
          title: 'Ev əşyalarını yenilə',
          subtitle: '0% -dən başlayan rahat alış',
          from: '#a855f7',
          to: '#db2777',
        }),
        active: true,
        order: 2,
      },
      {
        id: createId(),
        slot: 'hero',
        title: 'Ramazana xüsusi endirim',
        subtitle: 'Seçilmiş məhsullarda böyük qənaət',
        link: '/shop/products',
        imageUrl: svgDataUrl({
          title: 'Ramazana xüsusi endirim',
          subtitle: 'Seçilmiş məhsullarda böyük qənaət',
          from: '#6d28d9',
          to: '#c026d3',
        }),
        active: true,
        order: 3,
      },
    ],
    side: [
      {
        id: createId(),
        slot: 'side',
        title: 'Günün endirimləri',
        subtitle: 'Telefonlar, saatlar və aksesuarlar',
        link: '/shop/products',
        imageUrl: svgDataUrl({
          title: 'Günün endirimləri',
          subtitle: 'Telefonlar, saatlar və aksesuarlar',
          from: '#fb7185',
          to: '#ec4899',
        }),
        active: true,
        order: 1,
      },
      {
        id: createId(),
        slot: 'side',
        title: 'Ev əşyalarını yenilə',
        subtitle: 'Sürətli çatdırılma və rahat ödəniş',
        link: '/shop/products',
        imageUrl: svgDataUrl({
          title: 'Ev əşyalarını yenilə',
          subtitle: 'Sürətli çatdırılma və rahat ödəniş',
          from: '#a855f7',
          to: '#7c3aed',
        }),
        active: true,
        order: 2,
      },
      {
        id: createId(),
        slot: 'side',
        title: 'Ramazana xüsusi endirim',
        subtitle: 'Mətbəx və məişət məhsulları',
        link: '/shop/products',
        imageUrl: svgDataUrl({
          title: 'Ramazana xüsusi endirim',
          subtitle: 'Mətbəx və məişət məhsulları',
          from: '#7c3aed',
          to: '#4c1d95',
        }),
        active: true,
        order: 3,
      },
    ],
  };
}

function normalizeItem(item: any, slot: BannerSlot, fallbackOrder: number): BannerItem {
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : createId(),
    slot,
    title: typeof item?.title === 'string' ? item.title : '',
    subtitle: typeof item?.subtitle === 'string' ? item.subtitle : '',
    link: typeof item?.link === 'string' ? item.link : '',
    imageUrl: typeof item?.imageUrl === 'string' ? item.imageUrl : '',
    active: typeof item?.active === 'boolean' ? item.active : true,
    order: Number.isFinite(Number(item?.order)) ? Number(item.order) : fallbackOrder,
  };
}

function sortItems(items: BannerItem[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

function normalizeState(state: BannerState): BannerState {
  return {
    hero: sortItems(state.hero.map((item, index) => normalizeItem(item, 'hero', index + 1))),
    side: sortItems(state.side.map((item, index) => normalizeItem(item, 'side', index + 1))),
  };
}

function serializeState(state: BannerState) {
  return JSON.stringify(normalizeState(state));
}

export function getDefaultBannerState(): BannerState {
  return normalizeState(makeDefaultState());
}

export function loadBannerState(): BannerState {
  if (typeof window === 'undefined') {
    return getDefaultBannerState();
  }

  const fallback = getDefaultBannerState();

  try {
    const raw = window.localStorage.getItem(BANNER_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<BannerState>;

    const hero = Array.isArray(parsed.hero)
      ? parsed.hero.map((item, index) => normalizeItem(item, 'hero', index + 1))
      : fallback.hero;

    const side = Array.isArray(parsed.side)
      ? parsed.side.map((item, index) => normalizeItem(item, 'side', index + 1))
      : fallback.side;

    return normalizeState({
      hero,
      side,
    });
  } catch {
    return fallback;
  }
}

export function saveBannerState(state: BannerState) {
  if (typeof window === 'undefined') return;

  const normalized = normalizeState(state);

  window.localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(BANNER_UPDATED_EVENT));
}

export function createBanner(
  slot: BannerSlot,
  data: {
    title: string;
    subtitle?: string;
    link?: string;
    imageUrl: string;
    order?: number;
    active?: boolean;
  }
): BannerItem {
  return {
    id: createId(),
    slot,
    title: data.title,
    subtitle: data.subtitle ?? '',
    link: data.link ?? '',
    imageUrl: data.imageUrl,
    active: data.active ?? true,
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 1,
  };
}

export function removeBanner(items: BannerItem[], id: string) {
  return items.filter((item) => item.id !== id);
}

export function patchBanner(items: BannerItem[], id: string, patch: Partial<BannerItem>) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function moveBanner(items: BannerItem[], id: string, direction: 'up' | 'down') {
  const sorted = sortItems(items);
  const index = sorted.findIndex((item) => item.id === id);
  if (index === -1) return sorted;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return sorted;

  const next = [...sorted];
  const current = next[index];
  next[index] = next[targetIndex];
  next[targetIndex] = current;

  return next.map((item, idx) => ({ ...item, order: idx + 1 }));
}

export function getActiveBanners(items: BannerItem[]) {
  return sortItems(items.filter((item) => item.active));
}

export function useBannerStore() {
  const [state, setState] = useState<BannerState>(getDefaultBannerState());
  const [ready, setReady] = useState(false);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => {
      const next = loadBannerState();
      const nextSerialized = serializeState(next);

      setState((current) => {
        const currentSerialized = serializeState(current);
        if (currentSerialized === nextSerialized) {
          return current;
        }

        return next;
      });
    };

    const initial = loadBannerState();
    setState(initial);
    lastSavedRef.current = serializeState(initial);
    setReady(true);

    window.addEventListener('storage', sync);
    window.addEventListener(BANNER_UPDATED_EVENT, sync as EventListener);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(BANNER_UPDATED_EVENT, sync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const serialized = serializeState(state);
    if (serialized === lastSavedRef.current) return;

    lastSavedRef.current = serialized;
    saveBannerState(state);
  }, [state, ready]);

  return { state, setState, ready };
}

export async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}