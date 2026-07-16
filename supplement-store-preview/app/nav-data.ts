export const navItems = [
  { label: 'Shop', href: '/shop' },
  { label: 'Cart', href: '/cart' },
  { label: 'Product Detail', href: '/product/:handle' },
  { label: 'Profile', href: '/profile' },
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Checkout', href: '/checkout' },
  { label: 'Orders', href: '/orders' },
  { label: 'My Account', href: '/account' }
] as const;

export type NavItem = (typeof navItems)[number];
