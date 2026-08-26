import { IMenuItem, IAddOn } from './models';

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
  const instanceId = `${item._id || 'item'}_${spiceLevel || 'none'}_${addOnSig}`;

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
  if (typeof window === 'undefined') return { tableId: 'table-5', tableNumber: 5 };
  try {
    const raw = localStorage.getItem(TABLE_KEY);
    return raw ? JSON.parse(raw) : { tableId: 'table-5', tableNumber: 5 };
  } catch (err) {
    return { tableId: 'table-5', tableNumber: 5 };
  }
}

export function saveTableSession(session: TableSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TABLE_KEY, JSON.stringify(session));
  storeEvents.notify();
}
