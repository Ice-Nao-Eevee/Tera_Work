import { IMenuItem, IAddOn } from './types';

export interface CartItem {
  id: string; // unique cart item instance key
  menuItem: IMenuItem;
  qty: number;
  spiceLevel?: string;
  selectedAddOns: IAddOn[];
  unitPrice: number;
  lineTotal: number;
}

export interface TableSession {
  tableId: string;
  tableNumber: number;
  qrToken?: string;
}

const CART_KEY = 'selera_sambal_cart';
const TABLE_KEY = 'selera_sambal_table_session';
const NOTES_KEY = 'selera_sambal_order_notes';
// Stores the manually entered table number for the current order session
const MANUAL_TABLE_KEY = 'selera_sambal_manual_table';
// Stores order history (order codes + basic info) for the customer
const ORDER_HISTORY_KEY = 'selera_sambal_order_history';

export interface OrderHistoryEntry {
  orderCode: string;
  tableNumber: number;
  total: number;
  itemCount: number;
  createdAt: string; // ISO date string
}

// Event emitter helper for reactive updates across components
class StoreEvents {
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const storeEvents = new StoreEvents();

class SearchEvents {
  private listeners: ((q: string) => void)[] = [];
  private currentQuery: string = '';

  subscribe(listener: (q: string) => void) {
    this.listeners.push(listener);
    listener(this.currentQuery);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  setQuery(q: string) {
    this.currentQuery = q;
    this.listeners.forEach((listener) => listener(q));
  }

  getQuery() {
    return this.currentQuery;
  }
}

export const searchEvents = new SearchEvents();

class UIEventBus {
  private cartListeners: (() => void)[] = [];
  private aiListeners: (() => void)[] = [];

  subscribeCart(cb: () => void) {
    this.cartListeners.push(cb);
    return () => {
      this.cartListeners = this.cartListeners.filter((l) => l !== cb);
    };
  }

  openCart() {
    this.cartListeners.forEach((cb) => cb());
  }

  subscribeAi(cb: () => void) {
    this.aiListeners.push(cb);
    return () => {
      this.aiListeners = this.aiListeners.filter((l) => l !== cb);
    };
  }

  toggleAi() {
    this.aiListeners.forEach((cb) => cb());
  }
}

export const uiEvents = new UIEventBus();

export function getCartItems(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Strict sanitization to prevent null pointer exceptions
    return parsed.filter(
      (ci: any) =>
        ci &&
        typeof ci === 'object' &&
        ci.id &&
        ci.menuItem &&
        typeof ci.menuItem === 'object' &&
        typeof ci.menuItem.name === 'string' &&
        typeof ci.menuItem.price === 'number' &&
        typeof ci.qty === 'number' &&
        ci.qty > 0
    );
  } catch (err) {
    return [];
  }
}

export function saveCartItems(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  storeEvents.notify();
}

export function addToCart(
  item: IMenuItem,
  qty: number = 1,
  spiceLevel?: string,
  selectedAddOns: IAddOn[] = []
): CartItem[] {
  if (!item || !item.name) return getCartItems();

  const current = getCartItems();
  const safeAddOns = Array.isArray(selectedAddOns) ? selectedAddOns : [];
  
  // Calculate unit price including addOns
  const addOnsTotal = safeAddOns.reduce((acc, a) => acc + (a?.price || 0), 0);
  const unitPrice = (item.price || 0) + addOnsTotal;

  // Create unique key based on item ID + spiceLevel + addOns signature
  const addOnSig = safeAddOns.map((a) => a?.label || '').sort().join(',');
  const itemId = (item as any)._id || item.id || 'item';
  const instanceId = `${itemId}_${spiceLevel || 'none'}_${addOnSig}`;

  const existingIndex = current.findIndex((ci) => ci.id === instanceId);

  if (existingIndex > -1) {
    current[existingIndex].qty += qty;
    current[existingIndex].lineTotal = current[existingIndex].qty * current[existingIndex].unitPrice;
  } else {
    current.push({
      id: instanceId,
      menuItem: item,
      qty,
      spiceLevel,
      selectedAddOns: safeAddOns,
      unitPrice,
      lineTotal: unitPrice * qty,
    });
  }

  saveCartItems(current);
  return current;
}

export function updateCartQty(id: string, delta: number): CartItem[] {
  let current = getCartItems();
  const index = current.findIndex((ci) => ci.id === id);

  if (index > -1) {
    current[index].qty += delta;
    if (current[index].qty <= 0) {
      current = current.filter((ci) => ci.id !== id);
    } else {
      current[index].lineTotal = current[index].qty * current[index].unitPrice;
    }
    saveCartItems(current);
  }
  return current;
}

export function removeCartItem(id: string): CartItem[] {
  const current = getCartItems().filter((ci) => ci.id !== id);
  saveCartItems(current);
  return current;
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(MANUAL_TABLE_KEY); // clear per-order table number on order completion
  storeEvents.notify();
}

export function getOrderNotes(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NOTES_KEY) || '';
}

export function saveOrderNotes(notes: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTES_KEY, notes);
}

export function getTableSession(): TableSession {
  if (typeof window === 'undefined') return { tableId: '', tableNumber: 0 };
  try {
    const raw = localStorage.getItem(TABLE_KEY);
    return raw ? JSON.parse(raw) : { tableId: '', tableNumber: 0 };
  } catch (err) {
    return { tableId: '', tableNumber: 0 };
  }
}

/**
 * Gets the manually entered table number for the current order session.
 * Returns 0 if not set (customer hasn't entered a table number yet).
 */
export function getManualTableNumber(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(MANUAL_TABLE_KEY);
  const num = parseInt(raw || '0', 10);
  return isNaN(num) || num < 1 ? 0 : num;
}

/** Persists the customer's manually entered table number. */
export function saveManualTableNumber(num: number): void {
  if (typeof window === 'undefined') return;
  if (num > 0) {
    localStorage.setItem(MANUAL_TABLE_KEY, String(num));
  } else {
    localStorage.removeItem(MANUAL_TABLE_KEY);
  }
  storeEvents.notify();
}

export function saveTableSession(session: TableSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TABLE_KEY, JSON.stringify(session));
  storeEvents.notify();
}

// ── Order History Helpers ────────────────────────────────────────────────────

/** Returns all saved order history entries (newest first). */
export function getOrderHistory(): OrderHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Return newest first
    return parsed.sort((a: OrderHistoryEntry, b: OrderHistoryEntry) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

/** Saves a new order to history (called after successful order creation). */
export function saveOrderToHistory(entry: OrderHistoryEntry): void {
  if (typeof window === 'undefined') return;
  const history = getOrderHistory();
  // Avoid duplicates
  const filtered = history.filter(h => h.orderCode !== entry.orderCode);
  filtered.unshift(entry); // newest first
  // Keep max 50 entries
  const trimmed = filtered.slice(0, 50);
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(trimmed));
  storeEvents.notify();
}

/** Clears all order history (for debugging or reset). */
export function clearOrderHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ORDER_HISTORY_KEY);
  storeEvents.notify();
}
