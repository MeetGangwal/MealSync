import { describe, it, expect } from 'vitest';
import { dishSlug, menuImageFor, photoCredits } from './menuImages';

describe('menu images', () => {
  it('derives stable slugs from dish names', () => {
    expect(dishSlug('Idli Sambar (2 pcs)')).toBe('idli-sambar-2-pcs');
    expect(dishSlug('Spiced Buttermilk (Chaas)')).toBe('spiced-buttermilk-chaas');
  });

  it('uses the bundled photo for a known dish and nothing for an unknown one', () => {
    expect(menuImageFor({ name: 'Masala Dosa' })).toBe('/images/menu/masala-dosa.webp');
    expect(menuImageFor({ name: 'Cheese Burst Maggi' })).toBeNull();
    expect(menuImageFor({ name: 'Brand new dish' })).toBeNull();
    expect(menuImageFor({ name: 'Steam Rice' })).toBe('/images/menu/steamed-rice.webp');
    expect(menuImageFor({ name: 'Paneer Makhanwala' })).toBe('/images/menu/paneer-butter-masala.webp');
    expect(menuImageFor({ name: 'Rajma Masala' })).toBe('/images/menu/rajma-rice-bowl.webp');
    expect(menuImageFor({ name: 'Hot & Sour Soup' })).toBe('/images/menu/hot-and-sour-soup.webp');
  });

  it('prefers an explicit image URL but ignores legacy emoji values', () => {
    expect(menuImageFor({ name: 'Masala Dosa', imageUrl: 'https://cdn.example.com/d.webp' })).toBe('https://cdn.example.com/d.webp');
    expect(menuImageFor({ name: 'Masala Dosa', imageUrl: '🍱' })).toBe('/images/menu/masala-dosa.webp');
  });

  it('has attribution for every bundled photo', () => {
    for (const c of photoCredits()) {
      expect(c.author).toBeTruthy();
      expect(c.license).toBeTruthy();
      expect(c.source).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });
});
