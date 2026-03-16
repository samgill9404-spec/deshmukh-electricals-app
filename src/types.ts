export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  imageUrl?: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountTendered: number;
  changeDue: number;
}

export interface AppConfig {
  shopName: string;
  shopAddress: string;
  contactNumber: string;
  gstNumber: string;
  proprietor: string;
  lastInvoiceNumber: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
