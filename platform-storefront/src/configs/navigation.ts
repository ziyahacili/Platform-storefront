export const NAV_LINKS = [
  { href: '/', label: 'Главная' },
  { href: '/shop/products', label: 'Каталог' },
  { href: '/shop/categories', label: 'Категории' },
  { href: '/shop/shops', label: 'Магазины' },
  { href: '/cart', label: 'Корзина' },
] as const;

export const AUTH_LINKS = [
  { href: '/login', label: 'Вход' },
  { href: '/register', label: 'Регистрация' },
] as const;
