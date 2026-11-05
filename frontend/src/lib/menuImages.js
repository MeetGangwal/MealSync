import credits from '../data/imageCredits.json';

/** Menu names that are the same dish as an existing photo under another name. */
const SAME_DISH = {
  'steam-rice': 'steamed-rice',
  'veg-pulav': 'veg-pulao',
  'veg-biryani': 'veg-dum-biryani',
  'paneer-makhanwala': 'paneer-butter-masala', // makhanwala = butter masala
  'rajma-masala': 'rajma-rice-bowl',
};

/** URL-safe key for a dish name: "Idli Sambar (2 pcs)" → "idli-sambar-2-pcs". */
export function dishSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Photo for a menu item, or null when there is none (the UI then shows a neutral tile —
 * never an unrelated dish). An explicit image URL saved on the product wins; otherwise the
 * bundled, licensed photo for that dish name is used. Credits live in data/imageCredits.json.
 */
export function menuImageFor(item) {
  const own = item?.imageUrl;
  if (typeof own === 'string' && /^(https:\/\/|\/)/.test(own)) return own;
  const slug = dishSlug(item?.name);
  const key = credits[slug] ? slug : SAME_DISH[slug];
  return key && credits[key] ? `/images/menu/${key}.webp` : null;
}

export const HERO_IMAGE = { src: '/images/hero-thali.webp', small: '/images/hero-thali-sm.webp', credit: credits.hero };

/** Attribution rows for the photo-credits dialog, sorted by dish. */
export function photoCredits() {
  return Object.entries(credits)
    .map(([key, c]) => ({ key, ...c }))
    .sort((a, b) => (a.key === 'hero' ? -1 : b.key === 'hero' ? 1 : a.key.localeCompare(b.key)));
}
