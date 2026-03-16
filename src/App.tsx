/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  increment,
  getDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  Product, 
  Customer, 
  Invoice, 
  AppConfig, 
  CartItem,
  OperationType 
} from './types';
import { handleFirestoreError } from './utils/error-handler';
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  Trash2, 
  Printer, 
  Share2,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  X,
  Camera,
  Image as ImageIcon,
  List,
  LayoutGrid,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
      outline: 'border border-slate-200 bg-transparent hover:bg-slate-50',
      ghost: 'hover:bg-slate-100 text-slate-600',
      danger: 'bg-red-500 text-white hover:bg-red-600',
      success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'billing' | 'inventory' | 'customers' | 'settings'>('billing');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; phone: string }>({ name: '', phone: '' });
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountTendered, setAmountTendered] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const qProducts = query(collection(db, 'products'), orderBy('name'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const qCustomers = query(collection(db, 'customers'), orderBy('name'));
    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    const unsubConfig = onSnapshot(doc(db, 'config', 'shop'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as AppConfig);
      } else {
        // Initialize default config
        const defaultConfig: AppConfig = {
          shopName: 'Deshmukh Electricals',
          shopAddress: 'Qureshi Complex, Near Mahadev Mandir, Mondha, Railway Station Road, Partur, Jalna - 431501 (MH)',
          contactNumber: '9890563660',
          gstNumber: '',
          proprietor: 'Arshad Deshmukh, Shabax Deshmukh',
          lastInvoiceNumber: 1051
        };
        const configRef = doc(db, 'config', 'shop');
        setDoc(configRef, defaultConfig).catch(e => handleFirestoreError(e, OperationType.WRITE, 'config/shop'));

        // Add initial products if none exist
        const initialProducts = [
          {
            sku: 'FAN-001',
            name: 'Crompton High Speed Ceiling Fan',
            category: 'Appliances',
            unit: 'Pieces',
            price: 2450,
            stock: 15,
            imageUrl: 'https://picsum.photos/seed/fan/400/400',
            updatedAt: new Date().toISOString()
          },
          {
            sku: 'WIRE-1.5',
            name: 'Polycab 1.5mm FR Wire (90m)',
            category: 'Wires',
            unit: 'Bundles',
            price: 1850,
            stock: 25,
            imageUrl: 'https://picsum.photos/seed/wire/400/400',
            updatedAt: new Date().toISOString()
          },
          {
            sku: 'SW-MOD',
            name: 'Anchor Roma 6A Modular Switch',
            category: 'Switches',
            unit: 'Pieces',
            price: 45,
            stock: 100,
            imageUrl: 'https://picsum.photos/seed/switch/400/400',
            updatedAt: new Date().toISOString()
          },
          {
            sku: 'LED-9W',
            name: 'Philips 9W LED Bulb (Cool Day)',
            category: 'Lighting',
            unit: 'Pieces',
            price: 120,
            stock: 50,
            imageUrl: 'https://picsum.photos/seed/bulb/400/400',
            updatedAt: new Date().toISOString()
          },
          {
            sku: 'MCB-32A',
            name: 'Havells 32A Single Pole MCB',
            category: 'Appliances',
            unit: 'Pieces',
            price: 280,
            stock: 20,
            imageUrl: 'https://picsum.photos/seed/mcb/400/400',
            updatedAt: new Date().toISOString()
          },
          {
            sku: 'TAPE-PVC',
            name: 'Steelgrip PVC Insulation Tape',
            category: 'Tools',
            unit: 'Pieces',
            price: 15,
            stock: 200,
            imageUrl: 'https://picsum.photos/seed/tape/400/400',
            updatedAt: new Date().toISOString()
          }
        ];

        initialProducts.forEach(p => {
          addDoc(collection(db, 'products'), p).catch(e => handleFirestoreError(e, OperationType.WRITE, 'products'));
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'config/shop'));

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubConfig();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Package size={32} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Deshmukh Electricals</h1>
            <p className="mt-2 text-slate-500">Inventory & Billing Management</p>
          </div>
          <Button onClick={handleLogin} className="w-full py-6 text-lg">
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-blue-600 px-4 py-3 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Package size={20} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              {config?.shopName || 'Deshmukh Electricals'}
            </h1>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-white/10">
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-24">
        <div className="mx-auto max-w-7xl p-4">
          {activeTab === 'billing' && (
            <BillingScreen 
              products={products} 
              customers={customers} 
              config={config}
              cart={cart}
              setCart={setCart}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              discount={discount}
              setDiscount={setDiscount}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              amountTendered={amountTendered}
              setAmountTendered={setAmountTendered}
            />
          )}
          {activeTab === 'inventory' && <InventoryScreen products={products} />}
          {activeTab === 'customers' && <CustomersScreen customers={customers} />}
          {activeTab === 'settings' && <SettingsScreen config={config} />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-2 shadow-lg">
        <div className="mx-auto flex max-w-7xl justify-around">
          <NavButton 
            active={activeTab === 'billing'} 
            onClick={() => setActiveTab('billing')}
            icon={<ShoppingCart size={20} />}
            label="Billing"
          />
          <NavButton 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')}
            icon={<Package size={20} />}
            label="Inventory"
          />
          <NavButton 
            active={activeTab === 'customers'} 
            onClick={() => setActiveTab('customers')}
            icon={<Users size={20} />}
            label="Customers"
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon size={20} />}
            label="Settings"
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all",
        active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      {active && <div className="h-1 w-1 rounded-full bg-blue-600" />}
    </button>
  );
}

// --- Billing Screen ---

function BillingScreen({ 
  products, 
  customers, 
  config,
  cart,
  setCart,
  selectedCustomer,
  setSelectedCustomer,
  discount,
  setDiscount,
  paymentMethod,
  setPaymentMethod,
  amountTendered,
  setAmountTendered
}: { 
  products: Product[]; 
  customers: Customer[]; 
  config: AppConfig | null;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  selectedCustomer: { name: string; phone: string };
  setSelectedCustomer: React.Dispatch<React.SetStateAction<{ name: string; phone: string }>>;
  discount: number;
  setDiscount: React.Dispatch<React.SetStateAction<number>>;
  paymentMethod: string;
  setPaymentMethod: React.Dispatch<React.SetStateAction<string>>;
  amountTendered: number;
  setAmountTendered: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone.includes(customerSearch)
  );

  const addToCart = () => {
    if (!selectedProduct) return;
    
    const existing = cart.find(item => item.productId === selectedProduct.id);
    if (existing) {
      setCart(cart.map(item => 
        item.productId === selectedProduct.id 
          ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        quantity,
        price: selectedProduct.price,
        total: quantity * selectedProduct.price
      }]);
    }
    
    setSelectedProduct(null);
    setSearchQuery('');
    setQuantity(1);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.productId !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.18; // 18% GST
  const grandTotal = subtotal + tax - discount;
  const changeDue = amountTendered > 0 ? amountTendered - grandTotal : 0;

  const handleGenerateInvoice = async () => {
    if (cart.length === 0) return;
    if (!config) return;

    const invoiceNumber = `#${config.lastInvoiceNumber + 1}`;
    const date = new Date().toISOString();

    const invoice: Invoice = {
      invoiceNumber,
      date,
      customerName: selectedCustomer.name || 'Walk-in Customer',
      customerPhone: selectedCustomer.phone || '-',
      items: cart,
      subtotal,
      tax,
      discount,
      total: grandTotal,
      paymentMethod,
      amountTendered,
      changeDue
    };

    try {
      // 1. Save Invoice
      await addDoc(collection(db, 'invoices'), invoice);
      
      // 2. Update Stock
      for (const item of cart) {
        const productRef = doc(db, 'products', item.productId);
        await updateDoc(productRef, {
          stock: increment(-item.quantity)
        });
      }

      // 3. Update Config (Last Invoice Number)
      await updateDoc(doc(db, 'config', 'shop'), {
        lastInvoiceNumber: increment(1)
      });

      // 4. Update Customer Balance if Credit
      if (paymentMethod === 'Credit/Unpaid' && selectedCustomer.phone) {
        const existingCustomer = customers.find(c => c.phone === selectedCustomer.phone);
        if (existingCustomer) {
          await updateDoc(doc(db, 'customers', existingCustomer.id), {
            balance: increment(grandTotal)
          });
        } else if (selectedCustomer.name) {
          await addDoc(collection(db, 'customers'), {
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            balance: grandTotal,
            updatedAt: new Date().toISOString()
          });
        }
      }

      generatePDF(invoice, config);
      
      // Reset
      setCart([]);
      setSelectedCustomer({ name: '', phone: '' });
      setDiscount(0);
      setAmountTendered(0);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'invoices');
    }
  };

  const generatePDF = (invoice: Invoice, shop: AppConfig) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 200] // Thermal printer size
    });

    const margin = 5;
    let y = 10;

    // Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(shop.shopName, 40, y, { align: 'center' });
    y += 5;

    doc.setFontSize(8);
    doc.text(`Prop: ${shop.proprietor}`, 40, y, { align: 'center' });
    y += 4;
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const splitAddress = doc.splitTextToSize(shop.shopAddress, 70);
    doc.text(splitAddress, 40, y, { align: 'center' });
    y += (splitAddress.length * 3) + 2;
    
    doc.text(`Mob: ${shop.contactNumber}`, 40, y, { align: 'center' });
    y += 5;
    
    doc.setLineWidth(0.1);
    doc.line(margin, y, 75, y);
    y += 5;

    // Invoice Info
    doc.setFont('helvetica', 'bold');
    doc.text(`Bill No: ${invoice.invoiceNumber}`, margin, y);
    doc.text(`Date: ${format(new Date(invoice.date), 'dd/MM/yyyy')}`, 75, y, { align: 'right' });
    y += 4;
    doc.text(`Name: ${invoice.customerName}`, margin, y);
    y += 4;
    doc.text(`Mob: ${invoice.customerPhone}`, margin, y);
    y += 5;

    // Table
    (doc as any).autoTable({
      startY: y,
      head: [['Item', 'Qty', 'Rate', 'Total']],
      body: invoice.items.map(item => [
        item.name,
        item.quantity,
        `₹${item.price}`,
        `₹${item.total}`
      ]),
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fontStyle: 'bold' },
      margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // Totals
    doc.text(`Subtotal:`, 50, y, { align: 'right' });
    doc.text(`₹${invoice.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;
    doc.text(`Tax (18%):`, 50, y, { align: 'right' });
    doc.text(`₹${invoice.tax.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;
    if (invoice.discount > 0) {
      doc.text(`Discount:`, 50, y, { align: 'right' });
      doc.text(`-₹${invoice.discount.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4;
    }
    
    doc.setFontSize(10);
    doc.text(`GRAND TOTAL:`, 50, y, { align: 'right' });
    doc.text(`₹${invoice.total.toFixed(2)}`, 75, y, { align: 'right' });
    y += 6;

    doc.setFontSize(7);
    doc.text(`Payment: ${invoice.paymentMethod}`, margin, y);
    y += 8;

    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business!', 40, y, { align: 'center' });

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {isSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-emerald-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={20} />
          <span className="font-medium">Bill generated successfully!</span>
        </div>
      )}

      {/* Customer & Item Inputs */}
      <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Name</label>
            <Input 
              placeholder="Search or enter name..." 
              value={selectedCustomer.name}
              onChange={e => {
                setSelectedCustomer({ ...selectedCustomer, name: e.target.value });
                setCustomerSearch(e.target.value);
              }}
            />
            {customerSearch && !customers.find(c => c.name === selectedCustomer.name) && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer({ name: c.name, phone: c.phone });
                      setCustomerSearch('');
                    }}
                    className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.phone}</div>
                    </div>
                    {c.balance > 0 && <div className="text-[10px] font-bold text-red-500">Bal: ₹{c.balance}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
            <Input 
              placeholder="e.g. 9876543210" 
              value={selectedCustomer.phone}
              onChange={e => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Search Item</label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                className="pl-10" 
                placeholder="Search by name or SKU..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            {searchQuery && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      setSearchQuery('');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
                  >
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-50 border border-slate-100">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-200">
                          <Package size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-[10px] text-slate-500">SKU: {p.sku} • Stock: {p.stock} {p.unit}</div>
                    </div>
                    <div className="font-bold text-blue-600">₹{p.price}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="flex items-end gap-3 rounded-xl bg-blue-50 p-3 border border-blue-100 animate-in zoom-in-95">
              <div className="flex-1">
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">Selected: {selectedProduct.name}</div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    className="w-24" 
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                  />
                  <span className="text-sm text-slate-500">{selectedProduct.unit}</span>
                </div>
              </div>
              <Button onClick={addToCart} variant="success" className="h-10 px-6">
                <Plus size={18} className="mr-1" /> Add
              </Button>
              <Button onClick={() => setSelectedProduct(null)} variant="ghost" className="h-10 w-10 p-0">
                <X size={18} />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Cart Table */}
      <section className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Current Bill</h2>
        </div>
        
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <ShoppingCart size={48} strokeWidth={1} className="mb-2 opacity-20" />
            <p className="text-sm">No items added yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {cart.map(item => (
              <div key={item.productId} className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">
                    {item.quantity} × ₹{item.price}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-bold text-slate-900">₹{item.total}</div>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Checkout Section */}
      <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Method</label>
            <select 
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <option>Cash</option>
              <option>UPI / Online</option>
              <option>Card</option>
              <option>Credit/Unpaid</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Discount (₹)</label>
            <Input 
              type="number" 
              value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
            />
          </div>
        </div>

        {paymentMethod === 'Cash' && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount Tendered</label>
              <Input 
                type="number" 
                value={amountTendered}
                onChange={e => setAmountTendered(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Change Due</label>
              <div className="h-10 flex items-center px-3 font-bold text-emerald-600 bg-emerald-50 rounded-lg">
                ₹{changeDue.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>GST (18%)</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Discount</span>
              <span>-₹{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <span className="text-lg font-bold text-slate-900">Grand Total</span>
            <span className="text-2xl font-black text-amber-600">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <Button 
          onClick={handleGenerateInvoice} 
          disabled={cart.length === 0}
          className="w-full py-6 text-lg shadow-lg shadow-blue-200"
        >
          <Printer size={20} className="mr-2" /> PRINT / SHARE PDF
        </Button>
      </section>
    </div>
  );
}

// --- Inventory Screen ---

function InventoryScreen({ products }: { products: Product[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Wires',
    unit: 'Pieces',
    price: 0,
    stock: 0,
    imageUrl: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'products'), data);
      }

      setIsAdding(false);
      setEditingProduct(null);
      setFormData({ sku: '', name: '', category: 'Wires', unit: 'Pieces', price: 0, stock: 0, imageUrl: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const startEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: p.price,
      stock: p.stock,
      imageUrl: p.imageUrl || ''
    });
    setIsAdding(true);
  };

  const downloadPriceList = () => {
    const doc = new jsPDF();
    const shopName = localStorage.getItem('shopName') || 'Deshmukh Electricals';
    const proprietor = localStorage.getItem('proprietor') || 'Arshad Deshmukh';

    doc.setFontSize(20);
    doc.text(shopName, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Proprietor: ${proprietor}`, 14, 30);
    doc.text(`Price List - Generated on ${format(new Date(), 'dd MMM yyyy')}`, 14, 35);

    const tableData = products.map(p => [
      p.sku,
      p.name,
      p.category,
      `₹${p.price}`,
      `${p.stock} ${p.unit}`
    ]);

    (doc as any).autoTable({
      startY: 45,
      head: [['SKU', 'Item Name', 'Category', 'Price', 'Stock']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Price_List_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Inventory</h2>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
              )}
            >
              <List size={18} />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={downloadPriceList}>
            <Download size={16} className="mr-2" /> Price List
          </Button>
          <Button size="sm" onClick={() => {
            setEditingProduct(null);
            setFormData({ sku: '', name: '', category: 'Wires', unit: 'Pieces', price: 0, stock: 0, imageUrl: '' });
            setIsAdding(true);
          }}>
            <Plus size={16} className="mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleSave} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{editingProduct ? 'Edit Item' : 'Add New Item'}</h3>
              <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-32 w-32 overflow-hidden rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon size={32} className="text-slate-300" />
                  )}
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('camera-input')?.click()}>
                    <Camera size={14} className="mr-1" /> Camera
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('gallery-input')?.click()}>
                    <ImageIcon size={14} className="mr-1" /> Gallery
                  </Button>
                  <input id="camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                  <input id="gallery-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">SKU / Code</label>
                  <Input required value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <select 
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option>Wires</option>
                    <option>Switches</option>
                    <option>Lighting</option>
                    <option>Appliances</option>
                    <option>Tools</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Item Name</label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Unit</label>
                  <select 
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option>Pieces</option>
                    <option>Meters</option>
                    <option>Bundles</option>
                    <option>Boxes</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Price (₹)</label>
                  <Input type="number" required value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Initial Stock</label>
                <Input type="number" required value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1">Save Item</Button>
            </div>
          </form>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => (
            <div key={p.id} className="group relative rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all">
              <div className="flex gap-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-200">
                      <Package size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="inline-block rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-600">
                      {p.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 line-clamp-1">{p.name}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xl font-black text-blue-600">₹{p.price}</div>
                    <div className={cn(
                      "text-sm font-bold",
                      p.stock < 10 ? "text-red-500" : "text-slate-600"
                    )}>
                      {p.stock} <span className="text-[10px] font-normal text-slate-400">{p.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => startEdit(p)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-blue-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Item</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Category</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Price</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Stock</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 tracking-wider w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-50 border border-slate-100">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-200">
                              <Package size={16} />
                            </div>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.sku}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-600">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">₹{p.price}</td>
                    <td className="px-4 py-3 text-right">
                      <div className={cn(
                        "text-sm font-bold",
                        p.stock < 10 ? "text-red-500" : "text-slate-900"
                      )}>
                        {p.stock} <span className="text-[10px] font-normal text-slate-400">{p.unit}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => startEdit(p)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Customers Screen ---

function CustomersScreen({ customers }: { customers: Customer[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Customers</h2>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {customers.map(c => (
            <div key={c.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-bold text-slate-900">{c.name}</div>
                <div className="text-sm text-slate-500">{c.phone}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Balance</div>
                <div className={cn(
                  "text-lg font-black",
                  c.balance > 0 ? "text-red-500" : "text-emerald-500"
                )}>
                  ₹{c.balance.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
          {customers.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Users size={48} strokeWidth={1} className="mx-auto mb-2 opacity-20" />
              <p>No customers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Settings Screen ---

function SettingsScreen({ config }: { config: AppConfig | null }) {
  const [formData, setFormData] = useState<AppConfig>({
    shopName: '',
    shopAddress: '',
    contactNumber: '',
    gstNumber: '',
    proprietor: '',
    lastInvoiceNumber: 0
  });

  useEffect(() => {
    if (config) setFormData(config);
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'config', 'shop'), formData);
      alert('Settings saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/shop');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Shop Settings</h2>
      
      <form onSubmit={handleSave} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Shop Name</label>
            <Input value={formData.shopName} onChange={e => setFormData({ ...formData, shopName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
            <textarea 
              className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={formData.shopAddress} 
              onChange={e => setFormData({ ...formData, shopAddress: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Contact Number</label>
              <Input value={formData.contactNumber} onChange={e => setFormData({ ...formData, contactNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">GST Number</label>
              <Input value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Proprietor Name(s)</label>
            <Input value={formData.proprietor} onChange={e => setFormData({ ...formData, proprietor: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Last Invoice Number</label>
            <Input type="number" value={formData.lastInvoiceNumber} onChange={e => setFormData({ ...formData, lastInvoiceNumber: Number(e.target.value) })} />
          </div>
        </div>
        
        <Button type="submit" className="w-full py-4">Save Configuration</Button>
      </form>
    </div>
  );
}
