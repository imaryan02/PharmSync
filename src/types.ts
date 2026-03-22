export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
}

export interface Clinic {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface Medicine {
  id: string;
  owner_id: string;
  name: string;
  composition: string | null;
  category: string | null;
  division: string | null;
  company: string | null;
  mrp: number | null;
  aliases: string[] | null;
  created_at: string;
}

export interface Batch {
  id: string;
  clinic_id: string;
  medicine_id: string;
  batch_code: string | null;
  expiry_date: string;
  quantity_remaining: number;
  purchase_price: number | null;
  selling_price: number | null;
  mrp: number | null;
  created_at: string;
}

export interface Inventory {
  id: string;
  clinic_id: string;
  medicine_id: string;
  total_quantity: number;
  created_at: string;
  medicines?: Medicine; // For joined queries
}

export interface Order {
  id: string;
  clinic_id: string;
  created_by: string;
  total_amount: number;
  status: 'active' | 'refunded' | 'cancelled';
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  medicine_id: string;
  quantity: number;
  selling_price: number;
  created_at: string;
}

export interface OrderBatch {
  id: string;
  order_item_id: string;
  batch_id: string;
  quantity: number;
  created_at: string;
}

export interface Refund {
  id: string;
  order_id: string;
  created_by: string;
  reason: string | null;
  created_at: string;
}

export interface RefundItem {
  id: string;
  refund_id: string;
  batch_id: string;
  quantity: number;
  order_item_id: string;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  clinic_id: string;
  medicine_id: string;
  batch_id: string | null;
  quantity_change: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  clinic_id: string | null;
  action: string;
  entity_type: string;
  actor_id: string | null;
  actor_type: string;
  metadata: any | null;
  created_at: string;
}
