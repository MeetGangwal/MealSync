import { Plus, Minus, Search } from 'lucide-react';
import { isOrderable } from '../lib/cart';
import { MealImage } from './Shared';

/** Menu categories used by Today's menu and Place order (keys match meals.category). */
export const MENU_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'thali', label: 'Thalis' },
  { key: 'accompaniments', label: 'Accompaniments' },
  { key: 'soups', label: 'Soups' },
  { key: 'chinese-starters', label: 'Chinese starters' },
  { key: 'vegetables', label: 'Vegetables' },
  { key: 'breads', label: 'Chapati & paratha' },
  { key: 'rice-noodles', label: 'Rice & noodles' },
  { key: 'rice', label: 'Rice' },
];

// Categories of the earlier demo catalogue; those dishes are retired but appear in order history
const LEGACY_LABELS = {
  retired: 'Retired', snacks: 'Snacks', 'south-indian': 'South Indian', meals: 'Rice bowls', beverages: 'Beverages',
};

export function categoryLabel(key) {
  return MENU_CATEGORIES.find(c => c.key === key)?.label || LEGACY_LABELS[key] || key;
}

/** Thalis are served at the thali counter; everything else at the other-dishes counter. */
export function counterFor(category) {
  return category === 'thali' ? 'Thali counter' : 'Other dishes counter';
}

export function stockText(item) {
  if (!isOrderable(item)) return 'Sold out';
  if (item.qty <= 5) return `Only ${item.qty} left`;
  return `${item.qty} left`;
}

/** Search box + category chips shared by the menu pages. */
export function MenuFilters({ search, onSearch, category, onCategory, counts, children }) {
  return (
    <div className="toolbar">
      <label className="search-field">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Search the menu</span>
        <input type="search" placeholder="Search dishes" value={search} onChange={e => onSearch(e.target.value)} />
      </label>
      {children}
      <div className="chip-row" role="group" aria-label="Filter by category">
        {MENU_CATEGORIES.map(c => (
          <button key={c.key} type="button" aria-pressed={category === c.key}
            className={`chip ${category === c.key ? 'active' : ''}`} onClick={() => onCategory(c.key)}>
            {c.label}
            {counts?.[c.key] != null && <span className="chip-count">{counts[c.key]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Per-category item counts for the filter chips. */
export function categoryCounts(items) {
  const counts = { all: items.length };
  for (const i of items) counts[i.category] = (counts[i.category] || 0) + 1;
  return counts;
}

/** Quantity control used on menu cards, the cart and the item dialog. */
export function QuantityStepper({ name, qty, max, onAdd, onRemove }) {
  const atMax = max != null && qty >= max;
  return (
    <div className="quantity-controls" role="group" aria-label={`Quantity of ${name}`}>
      <button type="button" className="qty-btn" onClick={onRemove} aria-label={qty === 1 ? `Remove ${name}` : `One fewer ${name}`}><Minus size={14} /></button>
      <span key={qty} className="qty-value bump" aria-live="polite">{qty}</span>
      <button type="button" className="qty-btn" onClick={onAdd} disabled={atMax}
        aria-label={atMax ? `No more ${name} in stock` : `One more ${name}`}><Plus size={14} /></button>
    </div>
  );
}

/**
 * Menu item card. Only the buttons are interactive — clicking the card body does nothing,
 * so selecting an item can never navigate away unexpectedly.
 */
export function MenuCard({ item, qty, onAdd, onRemove, onDetails }) {
  const orderable = isOrderable(item);
  const low = orderable && item.qty <= 5;
  return (
    <article className={`menu-card ${orderable ? '' : 'is-sold-out'}`} aria-label={item.name}>
      <div className="relative">
        <MealImage item={item} alt="" />
        {!orderable && <span className="badge badge-muted menu-card-flag">Sold out</span>}
        {low && <span className="badge badge-warning menu-card-flag">Only {item.qty} left</span>}
      </div>
      <div className="menu-card-content">
        <div className="menu-card-body">
          <h3 className="menu-card-title">{item.name}</h3>
          {item.description && <p className="menu-card-desc">{item.description}</p>}
        </div>
        <div className="menu-card-meta">
          <span className="price">₹{item.price}</span>
          <span className={`stock ${!orderable ? 'text-danger' : 'text-muted'}`}>{stockText(item)}</span>
        </div>
        <div className="menu-card-actions">
          {onDetails
            ? <button type="button" className="btn btn-ghost btn-sm" onClick={onDetails} aria-label={`Details for ${item.name}`}>Details</button>
            : <span />}
          {!orderable ? (
            <span className="caption text-muted">Unavailable</span>
          ) : qty > 0 ? (
            <QuantityStepper name={item.name} qty={qty} max={item.qty} onAdd={onAdd} onRemove={onRemove} />
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={onAdd} aria-label={`Add ${item.name} to order`}>
              <Plus size={14} aria-hidden="true" /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
