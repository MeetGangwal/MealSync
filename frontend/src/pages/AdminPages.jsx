import { useState, useMemo, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Edit, Trash2, Plus, Search, Printer, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SectionHeader, ProgressBar, EmptyState, Modal, Spinner, MealImage, ConfirmDialog } from '../components/Shared';
import { MENU_CATEGORIES, QuantityStepper, categoryLabel, counterFor } from '../components/MenuCatalog';

// ─── Product catalog ───────────────────────────────────────
const CATALOG_FILTERS = [{ key: 'all', label: 'All' }, ...MENU_CATEGORIES.filter(c => c.key !== 'all')];
// The product catalog also lists dishes taken off the menu (kept for order history)
const PRODUCT_FILTERS = [...CATALOG_FILTERS, { key: 'retired', label: 'Retired' }];

function validateProduct(form) {
  const errors = {};
  if (!form.name?.trim() || form.name.trim().length < 2) errors.name = 'Enter a name of at least 2 characters.';
  if (!(Number(form.price) > 0)) errors.price = 'Enter a price above ₹0.';
  if (!(Number(form.availableQuantity) >= 0) || !Number.isInteger(Number(form.availableQuantity))) errors.availableQuantity = 'Enter a whole number of portions (0 or more).';
  if (form.imageUrl && !/^(https:\/\/|\/)/.test(form.imageUrl)) errors.imageUrl = 'Use an https:// link or a site path starting with /.';
  return errors;
}

export function MenuManagement() {
  const { menuItems, updateMenuItem, addMenuItem, deleteMenuItem, toggleMenuItemAvailability, showToast } = useApp();
  const [editing, setEditing] = useState(null); // item id, 'new' or null
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [toDeactivate, setToDeactivate] = useState(null);

  const open = (item) => {
    setForm(item ? {
      name: item.name,
      description: item.description || '',
      category: item.category || 'meals',
      price: item.price,
      availableQuantity: item.qty ?? 0,
      isAvailable: item.visible !== false,
      // Older products store an emoji here; only real image links are editable
      imageUrl: /^(https:\/\/|\/)/.test(item.imageUrl || '') ? item.imageUrl : '',
    } : { name: '', description: '', category: 'thali', price: '', availableQuantity: 50, isAvailable: true, imageUrl: '' });
    setErrors({});
    setSaveError('');
    setEditing(item ? item.id : 'new');
  };

  const save = async () => {
    const errs = validateProduct(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setSaveError('');
    const payload = { ...form, name: form.name.trim(), price: Number(form.price), availableQuantity: Number(form.availableQuantity) };
    const res = editing === 'new' ? await addMenuItem(payload) : await updateMenuItem(editing, payload);
    setSaving(false);
    if (res?.success) {
      showToast(editing === 'new' ? `${payload.name} added to the catalog.` : `${payload.name} saved.`);
      setEditing(null);
    } else {
      setSaveError(res?.error || 'The product could not be saved. Please try again.');
    }
  };

  const confirmDeactivate = async () => {
    const item = toDeactivate;
    const res = await deleteMenuItem(item.id);
    if (res?.success) showToast(`${item.name} deactivated. Past orders keep their records.`);
    else showToast(res?.error || `${item.name} could not be deactivated.`, 'danger');
    setToDeactivate(null);
  };

  const toggle = async (item) => {
    setToggling(item.id);
    const res = await toggleMenuItemAvailability(item.id);
    setToggling(null);
    if (res?.error) showToast(res.error, 'danger');
    else showToast(`${item.name} is now ${item.visible ? 'hidden from' : 'shown on'} the student menu.`);
  };

  const q = searchTerm.trim().toLowerCase();
  const filteredItems = menuItems.filter(item =>
    (filterCat === 'all' ? item.category !== 'retired' : item.category === filterCat) &&
    (!q || item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q)));

  return (
    <div>
      <SectionHeader
        title="Product catalog"
        subtitle="Prices, stock and visibility for everything on the student menu. Deactivating keeps past orders intact."
        actions={<button type="button" className="btn btn-primary" onClick={() => open(null)}><Plus size={16} aria-hidden="true" /> Add product</button>}
      />

      <div className="toolbar">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search products</span>
          <input type="search" placeholder="Search by name or description" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </label>
        <div className="tab-list" role="group" aria-label="Category">
          {PRODUCT_FILTERS.map(c => (
            <button key={c.key} type="button" className={`tab-item ${filterCat === c.key ? 'active' : ''}`}
              aria-pressed={filterCat === c.key} onClick={() => setFilterCat(c.key)}>{c.label}</button>
          ))}
        </div>
      </div>

      {menuItems.length === 0 ? (
        <div className="card"><div className="loading-row" role="status"><Spinner /> Loading products…</div></div>
      ) : filteredItems.length === 0 ? (
        <EmptyState icon={Search} title="No products match" message="Try another name or category." />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th scope="col">Product</th><th scope="col">Category</th><th scope="col" className="num">Price</th>
                <th scope="col">Stock</th><th scope="col">On student menu</th><th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const soldOut = item.qty <= 0;
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-md">
                        <MealImage item={item} alt="" className="meal-thumb" showLabel={false} />
                        <div style={{ minWidth: 0 }}>
                          <div className="label text-primary">{item.name}</div>
                          {item.description && <div className="caption text-muted truncate" style={{ maxWidth: 280 }}>{item.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{categoryLabel(item.category)}</td>
                    <td className="num text-primary">₹{item.price}</td>
                    <td style={{ minWidth: 140 }}>
                      <div className={`caption mb-xs ${item.qty === 0 ? 'text-danger' : item.qty < 20 ? 'text-warning' : 'text-secondary'}`}>
                        {item.qty === 0 ? 'Out of stock' : `${item.qty} portions${item.qty < 20 ? ' · low' : ''}`}
                      </div>
                      <ProgressBar value={item.qty} max={item.initialQty || 100} ariaLabel={`Stock of ${item.name}`}
                        variant={item.qty === 0 ? 'danger' : item.qty < 20 ? 'warning' : 'primary'} />
                    </td>
                    <td>
                      <button type="button" className={`btn btn-sm ${item.visible ? 'btn-secondary' : 'btn-outline'}`}
                        role="switch" aria-checked={Boolean(item.visible)} disabled={toggling === item.id} onClick={() => toggle(item)}
                        aria-label={`Show ${item.name} on the student menu`}>
                        {toggling === item.id ? <Spinner /> : <span className={`status-dot ${item.visible ? 'online' : ''}`} aria-hidden="true" />}
                        {item.visible ? 'Shown' : 'Hidden'}
                      </button>
                      {item.visible && soldOut && <div className="caption text-muted mt-xs">Shows as sold out</div>}
                    </td>
                    <td>
                      <div className="flex gap-xs justify-end">
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => open(item)} aria-label={`Edit ${item.name}`}><Edit size={15} /></button>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => setToDeactivate(item)} aria-label={`Deactivate ${item.name}`}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add product' : `Edit ${form.name || 'product'}`} onClose={() => !saving && setEditing(null)} size="lg"
          footer={<>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <><Spinner /> Saving…</> : editing === 'new' ? 'Add product' : 'Save changes'}
            </button>
          </>}>
          {saveError && <div className="alert alert-danger mb-md" role="alert">{saveError}</div>}
          <MenuItemForm form={form} setForm={setForm} errors={errors} />
        </Modal>
      )}

      {toDeactivate && (
        <ConfirmDialog title={`Deactivate ${toDeactivate.name}?`}
          message="It disappears from the student menu and can’t be ordered. Past orders and payment records keep their item names and prices."
          confirmLabel="Deactivate" cancelLabel="Keep product" danger onConfirm={confirmDeactivate} onCancel={() => setToDeactivate(null)} />
      )}
    </div>
  );
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="form-hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="form-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

function MenuItemForm({ form, setForm, errors }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const aria = (k) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `pm-${k}-error` : undefined });
  const preview = { name: form.name, imageUrl: form.imageUrl };

  return (
    <div className="grid gap-lg product-form">
      <div className="form-stack">
        <Field id="pm-name" label="Name" error={errors.name}>
          <input id="pm-name" className="form-input" placeholder="e.g. Masala Dosa" value={form.name} onChange={e => f('name', e.target.value)} data-autofocus {...aria('name')} />
        </Field>
        <div className="grid grid-2 gap-md">
          <Field id="pm-price" label="Price (₹)" error={errors.price}>
            <input id="pm-price" className="form-input" type="number" inputMode="decimal" min="1" step="1" value={form.price} onChange={e => f('price', e.target.value)} {...aria('price')} />
          </Field>
          <Field id="pm-availableQuantity" label="Portions in stock" error={errors.availableQuantity}>
            <input id="pm-availableQuantity" className="form-input" type="number" inputMode="numeric" min="0" step="1" value={form.availableQuantity} onChange={e => f('availableQuantity', e.target.value)} {...aria('availableQuantity')} />
          </Field>
        </div>
        <div className="grid grid-2 gap-md">
          <Field id="pm-category" label="Category" hint={counterFor(form.category)}>
            <select id="pm-category" className="form-select" value={form.category} onChange={e => f('category', e.target.value)}>
              {MENU_CATEGORIES.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              {form.category === 'retired' && <option value="retired">Retired (off the menu)</option>}
            </select>
          </Field>
          <Field id="pm-visible" label="Student menu">
            <select id="pm-visible" className="form-select" value={form.isAvailable ? 'true' : 'false'} onChange={e => f('isAvailable', e.target.value === 'true')}>
              <option value="true">Shown</option>
              <option value="false">Hidden</option>
            </select>
          </Field>
        </div>
        <Field id="pm-description" label="Description" hint="What is on the plate, e.g. 2 rotis, dal, rice, sabzi and salad.">
          <textarea id="pm-description" className="form-textarea" value={form.description} onChange={e => f('description', e.target.value)} maxLength={255} />
        </Field>
        <Field id="pm-imageUrl" label="Photo link (optional)" error={errors.imageUrl} hint="Leave empty to use the built-in photo for this dish, if there is one.">
          <input id="pm-imageUrl" className="form-input" type="url" placeholder="https://…" value={form.imageUrl} onChange={e => f('imageUrl', e.target.value.trim())} {...aria('imageUrl')} />
        </Field>
      </div>
      <div className="flex flex-col gap-sm">
        <span className="form-label">Preview</span>
        <div className="menu-card" style={{ pointerEvents: 'none' }}>
          <MealImage key={`${form.name}|${form.imageUrl}`} item={preview} alt="" />
          <div className="menu-card-content">
            <span className="menu-card-title">{form.name || 'Product name'}</span>
            <span className="price">₹{form.price || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Counter sale (walk-in orders) ─────────────────────────
const COUNTER_PAYMENTS = [
  { key: 'CASH', label: 'Cash', note: 'Collected at the counter' },
  { key: 'UPI', label: 'UPI', note: 'Test payment' },
  { key: 'CARD', label: 'Card', note: 'Test payment' },
];
const HANDOVER_NOW = 'Instant Counter Pickup';

/** Order line from the counter-order API (an Order entity) in display form. */
function receiptLine(it) {
  const qty = it.quantity ?? it.qty ?? 0;
  const price = it.priceAtTimeOfOrder ?? it.price ?? 0;
  return { qty, price, name: it.itemName || it.meal?.name || it.name || 'Item unavailable' };
}

export function CounterSalePage() {
  const { liveMenu: menuItems, slots, createCounterOrder, currentUser, authHeaders, showToast } = useApp();
  const [counterCart, setCounterCart] = useState([]);
  const [customerType, setCustomerType] = useState('guest'); // 'guest' | 'registered'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchState, setSearchState] = useState('idle'); // idle | searching | done | error

  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashCollected, setCashCollected] = useState(true);
  const [pickupSlot, setPickupSlot] = useState(HANDOVER_NOW);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [receiptOrder, setReceiptOrder] = useState(null);

  const [filterCat, setFilterCat] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced customer search; a late response for an older query is ignored
  useEffect(() => {
    if (customerType !== 'registered' || selectedUser) return undefined;
    const q = userQuery.trim();
    if (q.length < 2) { setSearchResults([]); setSearchState('idle'); return undefined; }
    let stale = false;
    setSearchState('searching');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/customers/search?query=${encodeURIComponent(q)}`, { headers: authHeaders() });
        if (stale) return;
        if (!res.ok) throw new Error(String(res.status));
        setSearchResults(await res.json());
        setSearchState('done');
      } catch {
        if (!stale) { setSearchResults([]); setSearchState('error'); }
      }
    }, 250);
    return () => { stale = true; clearTimeout(t); };
  }, [userQuery, customerType, selectedUser, authHeaders]);

  const selectCustomer = (u) => {
    setSelectedUser(u);
    setCustomerName(u.name);
    setCustomerPhone(u.phone || '');
    setSearchResults([]);
    setUserQuery('');
  };

  const setMode = (mode) => {
    setCustomerType(mode);
    setSelectedUser(null);
    setCustomerName('');
    setCustomerPhone('');
    setUserQuery('');
    setSearchResults([]);
  };

  const setLineQty = (item, qty) => {
    setSaleError('');
    setCounterCart(prev => {
      const others = prev.filter(i => i.menuItemId !== item.id);
      if (qty <= 0) return others;
      const capped = Math.min(qty, item.qty);
      const line = prev.find(i => i.menuItemId === item.id) || { menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl };
      return [...others, { ...line, qty: capped, maxQty: item.qty }].sort((a, b) => a.name.localeCompare(b.name));
    });
  };
  const qtyOf = (id) => counterCart.find(c => c.menuItemId === id)?.qty || 0;
  const cartTotal = useMemo(() => counterCart.reduce((sum, i) => sum + i.price * i.qty, 0), [counterCart]);

  const completeSale = async () => {
    if (counterCart.length === 0) { setSaleError('Add at least one item.'); return; }
    if (customerType === 'registered' && !selectedUser) { setSaleError('Choose the registered customer, or switch to walk-in.'); return; }
    const payload = {
      userId: selectedUser ? selectedUser.id : null,
      customerName: (customerName.trim() || 'Walk-in customer'),
      customerPhone: customerPhone.trim() || null,
      customerEmail: selectedUser ? selectedUser.email : null,
      paymentMethod,
      cashCollected: paymentMethod === 'CASH' ? cashCollected : true,
      pickupSlot,
      items: counterCart.map(c => ({ menuItemId: c.menuItemId, qty: c.qty })),
    };
    setIsSubmitting(true);
    setSaleError('');
    const result = await createCounterOrder(payload);
    setIsSubmitting(false);
    if (result.success && result.order) {
      setReceiptOrder(result.order);
      setCounterCart([]);
      if (customerType === 'guest') { setCustomerName(''); setCustomerPhone(''); }
      showToast(`Sale ${result.order.orderNumber} recorded.`);
    } else {
      setSaleError(result.error || 'The sale could not be recorded. Nothing was charged.');
    }
  };

  const q = searchTerm.trim().toLowerCase();
  const filteredItems = menuItems.filter(item =>
    (filterCat === 'all' || item.category === filterCat) && (!q || item.name.toLowerCase().includes(q)));

  return (
    <div>
      <SectionHeader
        title="Counter sale"
        subtitle="Ring up walk-in purchases. Stock is updated when the sale is recorded."
        actions={<span className="caption text-muted">Operator: <strong className="text-primary">{currentUser?.name}</strong></span>}
      />

      <div className="order-page-layout">
        <div className="flex flex-col gap-lg" style={{ minWidth: 0 }}>
          <section className="card" aria-labelledby="customer-title">
            <div className="flex justify-between items-center flex-wrap gap-md mb-md">
              <h2 id="customer-title" className="heading-md">Customer</h2>
              <div className="tab-list" role="group" aria-label="Customer type">
                <button type="button" className={`tab-item ${customerType === 'guest' ? 'active' : ''}`} aria-pressed={customerType === 'guest'} onClick={() => setMode('guest')}>Walk-in</button>
                <button type="button" className={`tab-item ${customerType === 'registered' ? 'active' : ''}`} aria-pressed={customerType === 'registered'} onClick={() => setMode('registered')}>Registered student</button>
              </div>
            </div>
            {customerType === 'guest' ? (
              <div className="grid grid-2 gap-md">
                <div className="form-group">
                  <label className="form-label" htmlFor="cs-name">Name <span className="text-muted">(optional)</span></label>
                  <input id="cs-name" className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in customer" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cs-phone">Phone <span className="text-muted">(optional)</span></label>
                  <input id="cs-phone" className="form-input" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+91 98765 43210" />
                </div>
              </div>
            ) : selectedUser ? (
              <div className="flex justify-between items-center gap-md panel-muted">
                <div>
                  <div className="label">{selectedUser.name}</div>
                  <div className="caption text-muted">{selectedUser.email}{selectedUser.phone ? ` · ${selectedUser.phone}` : ''}</div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('registered')}>Change</button>
              </div>
            ) : (
              <div className="relative">
                <label className="search-field" style={{ width: '100%' }}>
                  <Search size={16} aria-hidden="true" />
                  <span className="sr-only">Search registered students by name or email</span>
                  <input type="search" placeholder="Name or email (at least 2 letters)" value={userQuery} onChange={e => setUserQuery(e.target.value)}
                    aria-controls="cs-results" aria-autocomplete="list" />
                </label>
                <div id="cs-results" className="mt-sm" aria-live="polite">
                  {searchState === 'searching' && <div className="loading-row caption"><Spinner size={14} /> Searching…</div>}
                  {searchState === 'error' && <div className="caption text-danger">Search failed. Check the connection and try again.</div>}
                  {searchState === 'done' && searchResults.length === 0 && <div className="caption text-muted">No registered student matches “{userQuery.trim()}”.</div>}
                  {searchResults.length > 0 && (
                    <ul className="row-list">
                      {searchResults.map(u => (
                        <li key={u.id} className="row-item">
                          <div className="row-item-main">
                            <span className="label">{u.name}</span>
                            <span className="caption text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ''}</span>
                          </div>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => selectCustomer(u)}>Select</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="items-title">
            <h2 id="items-title" className="sr-only">Items</h2>
            <div className="toolbar">
              <label className="search-field">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Search items</span>
                <input type="search" placeholder="Search items" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </label>
              <div className="tab-list" role="group" aria-label="Category">
                {CATALOG_FILTERS.map(c => (
                  <button key={c.key} type="button" className={`tab-item ${filterCat === c.key ? 'active' : ''}`} aria-pressed={filterCat === c.key} onClick={() => setFilterCat(c.key)}>{c.label}</button>
                ))}
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead><tr><th scope="col">Item</th><th scope="col" className="num">Price</th><th scope="col">Stock</th><th scope="col"><span className="sr-only">Quantity</span></th></tr></thead>
                <tbody>
                  {filteredItems.map(item => {
                    const orderable = item.available && item.qty > 0;
                    const qty = qtyOf(item.id);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-sm">
                            <MealImage item={item} alt="" className="meal-thumb" showLabel={false} />
                            <span className="label text-primary">{item.name}</span>
                          </div>
                        </td>
                        <td className="num text-primary">₹{item.price}</td>
                        <td className={item.qty === 0 ? 'text-danger' : item.qty < 10 ? 'text-warning' : ''}>{orderable ? `${item.qty} left` : 'Sold out'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {!orderable ? null : qty > 0 ? (
                            <QuantityStepper name={item.name} qty={qty} max={item.qty} onAdd={() => setLineQty(item, qty + 1)} onRemove={() => setLineQty(item, qty - 1)} />
                          ) : (
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setLineQty(item, 1)} aria-label={`Add ${item.name}`}><Plus size={14} aria-hidden="true" /> Add</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="order-sidebar-sticky" aria-label="Sale">
          <div className="card summary-card">
            <div className="summary-header">
              <h2 className="heading-md">Sale</h2>
              {counterCart.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCounterCart([])}>Clear</button>}
            </div>

            {counterCart.length === 0 ? (
              <p className="body-sm text-muted">Add items from the list to start a sale.</p>
            ) : (
              <>
                <ul className="summary-lines">
                  {counterCart.map(i => <li key={i.menuItemId}><span>{i.qty} × {i.name}</span><span>₹{i.price * i.qty}</span></li>)}
                </ul>
                <div className="summary-total"><span>Total</span><span className="price">₹{cartTotal}</span></div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="cs-slot">Hand-over</label>
              <select id="cs-slot" className="form-select" value={pickupSlot} onChange={e => setPickupSlot(e.target.value)}>
                <option value={HANDOVER_NOW}>Now, at the counter</option>
                {slots.filter(s => s.active).map(s => <option key={s.id} value={s.label}>Pickup slot {s.label}</option>)}
              </select>
            </div>

            <fieldset className="radio-list">
              <legend className="form-label">Payment</legend>
              {COUNTER_PAYMENTS.map(m => (
                <label key={m.key} className={`radio-option ${paymentMethod === m.key ? 'selected' : ''}`}>
                  <input type="radio" name="cs-pay" value={m.key} checked={paymentMethod === m.key} onChange={() => setPaymentMethod(m.key)} />
                  <span><span className="label">{m.label}</span><span className="caption text-muted">{m.note}</span></span>
                </label>
              ))}
            </fieldset>

            {paymentMethod === 'CASH' ? (
              <label className="checkbox-option" style={{ borderStyle: 'solid' }}>
                <input type="checkbox" checked={cashCollected} onChange={e => setCashCollected(e.target.checked)} />
                <span>
                  <span className="label">Cash received{cartTotal ? ` (₹${cartTotal})` : ''}</span>
                  <span className="caption text-muted" style={{ display: 'block' }}>{cashCollected ? 'Recorded as paid now.' : 'Recorded as cash due; settled when the order is handed over.'}</span>
                </span>
              </label>
            ) : (
              <div className="alert alert-info"><ShieldCheck size={16} aria-hidden="true" /><span>Test payment — no real money is charged.</span></div>
            )}

            {saleError && <div className="alert alert-danger" role="alert">{saleError}</div>}

            <button type="button" className="btn btn-primary btn-lg btn-full" onClick={completeSale} disabled={isSubmitting || counterCart.length === 0}>
              {isSubmitting ? <><Spinner /> Recording sale…</> : `Record sale · ₹${cartTotal}`}
            </button>
          </div>
        </aside>
      </div>

      {receiptOrder && (
        <Modal title="Receipt" onClose={() => setReceiptOrder(null)}
          footer={<>
            <button type="button" className="btn btn-outline" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print</button>
            <button type="button" className="btn btn-primary" onClick={() => setReceiptOrder(null)} data-autofocus>New sale</button>
          </>}>
          <div className="flex flex-col items-center gap-md">
            <div className="qr-ticket">
              <QRCodeSVG value={receiptOrder.qrCodeData || receiptOrder.orderNumber} size={128} bgColor="#ffffff" fgColor="#20211D" title={`QR for ${receiptOrder.orderNumber}`} />
              <span className="qr-ticket-id">{receiptOrder.orderNumber}</span>
            </div>
            <dl className="detail-list w-full">
              <div><dt>Customer</dt><dd>{receiptOrder.user?.name || receiptOrder.customerName || 'Walk-in customer'}</dd></div>
              <div><dt>Operator</dt><dd>{receiptOrder.counterOperator || currentUser?.name}</dd></div>
              <div><dt>Payment</dt><dd>{receiptOrder.paymentMethod} · {receiptOrder.paymentStatus === 'PAID' ? 'paid' : receiptOrder.paymentStatus === 'PENDING_CASH' ? 'cash due' : String(receiptOrder.paymentStatus || '').toLowerCase()}</dd></div>
              {receiptOrder.transactionId && <div><dt>Reference</dt><dd className="mono">{receiptOrder.transactionId}</dd></div>}
              <div><dt>Hand-over</dt><dd>{receiptOrder.pickupSlot === HANDOVER_NOW ? 'Now, at the counter' : receiptOrder.pickupSlot}</dd></div>
            </dl>
            <ul className="summary-lines w-full">
              {(receiptOrder.items || []).map(receiptLine).map((it, idx) => (
                <li key={idx}><span>{it.qty} × {it.name}</span><span>₹{it.price * it.qty}</span></li>
              ))}
            </ul>
            <div className="summary-total w-full"><span>Total</span><span className="price">₹{receiptOrder.totalAmount}</span></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Users & Roles (administrators only) ───────────────────
/**
 * Grants or removes mess-administrator access. The backend (/api/admin/users) enforces that
 * only administrators can do this, that nobody changes their own role, and that the last
 * administrator cannot be removed; this page just presents those rules clearly.
 */
export function UserManagementPage() {
  const { currentUser, fetchUsers, changeUserRole } = useApp();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [pending, setPending] = useState(null); // { user, role }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q) => {
    setLoading(true);
    setError('');
    try {
      setUsers(await fetchUsers(q));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  useEffect(() => { load(''); }, [load]);

  const onSearch = (e) => {
    e.preventDefault();
    load(query.trim());
  };

  const confirmChange = async () => {
    setSaving(true);
    const res = await changeUserRole(pending.user.id, pending.role);
    setSaving(false);
    if (res.error) {
      setMessage({ type: 'danger', text: res.error });
    } else {
      setMessage({ type: 'success', text: `${res.user.name} is now ${res.user.role === 'ROLE_ADMIN' ? 'a mess administrator' : 'a student'}.` });
      setUsers(prev => prev.map(u => (u.id === res.user.id ? res.user : u)));
    }
    setPending(null);
  };

  return (
    <div>
      <SectionHeader title="Users & roles" subtitle="Grant or remove mess-administrator access. New registrations are always student accounts." />

      <div className="alert alert-info mb-lg">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>Administrators can manage the menu, orders and users, and can still order food for themselves. Changes apply on the user's next request — no new login needed. You cannot change your own role.</span>
      </div>

      <form className="toolbar" onSubmit={onSearch}>
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search users by name or email</span>
          <input type="search" placeholder="Search by name or email" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-outline">Search</button>
      </form>

      {message && <div className={`alert alert-${message.type} mb-md`} role={message.type === 'danger' ? 'alert' : 'status'}>{message.text}</div>}

      {loading ? (
        <div className="card"><div className="loading-row"><Spinner /> Loading users…</div></div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : users.length === 0 ? (
        <EmptyState icon={UserRound} title="No users found" message="Try a different name or email." />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Registered</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isAdmin = u.role === 'ROLE_ADMIN';
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id}>
                    <td>{u.name}{isSelf && <span className="caption text-muted"> (you)</span>}</td>
                    <td className="truncate">{u.email}</td>
                    <td><span className={`badge ${isAdmin ? 'badge-info' : 'badge-muted'}`}>{isAdmin ? 'Administrator' : 'Student'}</span></td>
                    <td className="caption text-muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="text-right">
                      {isSelf ? (
                        <span className="caption text-muted">—</span>
                      ) : isAdmin ? (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setPending({ user: u, role: 'USER' })}>Remove admin</button>
                      ) : (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setPending({ user: u, role: 'ADMIN' })}>Make admin</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pending && (
        <Modal title={pending.role === 'ADMIN' ? 'Grant administrator access?' : 'Remove administrator access?'}
          onClose={() => !saving && setPending(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setPending(null)} disabled={saving}>Cancel</button>
              <button type="button" className={`btn ${pending.role === 'ADMIN' ? 'btn-primary' : 'btn-danger'}`} onClick={confirmChange} disabled={saving}>
                {saving ? <><Spinner /> Saving…</> : pending.role === 'ADMIN' ? 'Grant access' : 'Remove access'}
              </button>
            </>
          }>
          <p className="body-md">
            {pending.role === 'ADMIN'
              ? <><strong>{pending.user.name}</strong> ({pending.user.email}) will be able to manage the menu, orders, payments and user roles.</>
              : <><strong>{pending.user.name}</strong> ({pending.user.email}) will keep their student account but lose all administrator pages and APIs.</>}
          </p>
        </Modal>
      )}
    </div>
  );
}

