export const navItems = [
  { label: 'Shop', href: '/shop' },
  { label: 'Cart', href: '/cart' },
  { label: 'Product Detail', href: '/product/:handle' },
  { label: 'Home', href: '/' }
] as const;

export type NavItem = (typeof navItems)[number];
