import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mock database default seed data
const SEED_VEHICLES = [
  {
    id: "activa-123",
    user_id: "mock-user",
    registration_number: "MH 12 AB 1234",
    nickname: "My Activa",
    current_odometer: 12450,
    color: "#1a3c6e", // Deep Blue
    model_name: "Honda Activa 6G",
    vehicle_type: "scooter",
    puc_expiry_date: "2026-06-26", // expires soon (6 days from June 20, 2026)
    insurance_expiry_date: "2026-12-20", // valid
    service_due_odometer: 15000,
    created_at: new Date().toISOString()
  },
  {
    id: "swift-456",
    user_id: "mock-user",
    registration_number: "MH 14 XY 9876",
    nickname: "Papa's Swift",
    current_odometer: 48900,
    color: "#ba1a1a", // Red
    model_name: "Maruti Swift",
    vehicle_type: "car",
    puc_expiry_date: "2026-11-15", // active
    insurance_expiry_date: "2026-06-18", // expired (2 days ago from June 20, 2026)
    service_due_odometer: 50000,
    created_at: new Date().toISOString()
  }
];

const SEED_SERVICE_LOGS = [
  {
    id: "log-1",
    vehicle_id: "activa-123",
    entry_type: "service",
    date: "2023-10-12",
    odometer: 12450,
    cost: 1250,
    details: ["Engine Oil Replaced", "Air Filter Cleaned", "Brake Pads Checked"],
    notes: "Honda Service Center",
    created_at: new Date().toISOString()
  },
  {
    id: "log-2",
    vehicle_id: "activa-123",
    entry_type: "service",
    date: "2023-05-15",
    odometer: 9100,
    cost: 350,
    details: ["General checkup", "washing", "chain lubrication"],
    notes: "Honda Service Center",
    created_at: new Date().toISOString()
  }
];

const SEED_PUC_LOGS = [
  {
    id: "puc-1",
    vehicle_id: "activa-123",
    entry_type: "puc",
    date: "2024-05-15",
    odometer: 11000,
    cost: 150,
    notes: "HP Petrol Pump, Viman Nagar",
    created_at: new Date().toISOString()
  },
  {
    id: "puc-2",
    vehicle_id: "activa-123",
    entry_type: "puc",
    date: "2023-11-16",
    odometer: 8500,
    cost: 150,
    notes: "Indian Oil, KP",
    created_at: new Date().toISOString()
  }
];

const SEED_DOCUMENTS = [
  {
    id: "doc-1",
    vehicle_id: "activa-123",
    name: "RC Book",
    file_url: "https://example.com/rc-book.pdf",
    file_type: "pdf",
    file_size: 102400,
    expiry_date: null,
    created_at: new Date().toISOString()
  },
  {
    id: "doc-2",
    vehicle_id: "activa-123",
    name: "Insurance",
    file_url: "https://example.com/insurance.pdf",
    file_type: "pdf",
    file_size: 204800,
    expiry_date: "2026-12-20",
    created_at: new Date().toISOString()
  },
  {
    id: "doc-3",
    vehicle_id: "activa-123",
    name: "PUC",
    file_url: "https://example.com/puc.pdf",
    file_type: "pdf",
    file_size: 81920,
    expiry_date: "2026-06-26",
    created_at: new Date().toISOString()
  }
];

const SEED_MILEAGE_LOGS = [
  {
    id: "mil-1",
    vehicle_id: "activa-123",
    date: "2023-10-12",
    odometer: 12450,
    fuel_litres: 5.2,
    is_full_tank: true,
    mileage_kml: null,
    created_at: new Date().toISOString()
  },
  {
    id: "mil-2",
    vehicle_id: "activa-123",
    date: "2023-10-26",
    odometer: 12656,
    fuel_litres: 5.0,
    is_full_tank: true,
    mileage_kml: 41.2,
    created_at: new Date().toISOString()
  }
];

// LocalStorage Helper
const getLocalData = (key, seed = []) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

const setLocalData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Mock Query Builder
class MockQueryBuilder {
  constructor(table) {
    this.table = table;
    this.keyMap = {
      vehicles: "vaahan_vehicles",
      service_logs: "vaahan_service_logs",
      mileage_logs: "vaahan_mileage_logs",
      document_vault: "vaahan_documents",
      profiles: "vaahan_profiles"
    };
    const USE_MOCK_DATA = localStorage.getItem("vaahan_use_mock_data") === "true";
    this.seedMap = {
      vehicles: USE_MOCK_DATA ? SEED_VEHICLES : [],
      service_logs: USE_MOCK_DATA ? [...SEED_SERVICE_LOGS, ...SEED_PUC_LOGS] : [],
      mileage_logs: USE_MOCK_DATA ? SEED_MILEAGE_LOGS : [],
      document_vault: USE_MOCK_DATA ? SEED_DOCUMENTS : [],
      profiles: [{ id: "mock-user", full_name: "Yash Kukreja", email: "yash.k@example.com", phone: "+91 98765 43210" }]
    };
    
    this.storeKey = this.keyMap[table] || `vaahan_${table}`;
    this.seed = this.seedMap[table] || [];
  }

  _get() {
    return getLocalData(this.storeKey, this.seed);
  }

  _set(data) {
    setLocalData(this.storeKey, data);
  }

  select(columns = "*") {
    this.data = this._get();
    return this;
  }

  eq(column, value) {
    if (this.data) {
      this.data = this.data.filter(item => item[column] === value);
    }
    return this;
  }

  order(column, { ascending = true } = {}) {
    if (this.data) {
      this.data.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (typeof valA === 'string') {
          return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return ascending ? valA - valB : valB - valA;
      });
    }
    return this;
  }

  limit(num) {
    if (this.data) {
      this.data = this.data.slice(0, num);
    }
    return this;
  }

  async insert(rows) {
    const current = this._get();
    const toInsert = Array.isArray(rows) ? rows : [rows];
    const inserted = toInsert.map(row => ({
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      ...row
    }));
    
    this._set([...current, ...inserted]);
    return { data: Array.isArray(rows) ? inserted : inserted[0], error: null };
  }

  async update(values) {
    const current = this._get();
    // Assuming filters are applied before update. For mock simplicity, we update elements matching existing this.data filter
    let updated = [];
    const idsToUpdate = new Set(this.data ? this.data.map(d => d.id) : []);
    
    const next = current.map(item => {
      if (idsToUpdate.has(item.id)) {
        const newItem = { ...item, ...values };
        updated.push(newItem);
        return newItem;
      }
      return item;
    });

    this._set(next);
    return { data: updated, error: null };
  }

  async delete() {
    const current = this._get();
    const idsToDelete = new Set(this.data ? this.data.map(d => d.id) : []);
    const next = current.filter(item => !idsToDelete.has(item.id));
    this._set(next);
    return { data: this.data, error: null };
  }

  // Then handles promise resolution
  then(onfulfilled) {
    onfulfilled({ data: this.data, error: null });
  }
}

// Mock Supabase Auth
const mockAuth = {
  session: {
    user: {
      id: "mock-user",
      email: "yash.k@example.com",
      phone: "+919876543210",
      user_metadata: {
        full_name: "Yash Kukreja"
      }
    }
  },

  async getSession() {
    const active = localStorage.getItem("vaahan_session");
    if (active === "true" || active === null) { // default to signed in
      return { data: { session: this.session }, error: null };
    }
    return { data: { session: null }, error: null };
  },

  async signInWithOtp({ phone }) {
    console.log("Mock OTP sent to:", phone);
    return { data: {}, error: null };
  },

  async verifyOtp({ phone, token }) {
    if (token === "123456" || token === "1234" || true) { // allow any mock token
      localStorage.setItem("vaahan_session", "true");
      return { data: { session: this.session }, error: null };
    }
    return { data: null, error: { message: "Invalid OTP code" } };
  },

  async signInWithOAuth({ provider }) {
    console.log("Mock OAuth with provider:", provider);
    localStorage.setItem("vaahan_session", "true");
    return { data: {}, error: null };
  },

  async signOut() {
    localStorage.setItem("vaahan_session", "false");
    return { error: null };
  },

  onAuthStateChange(callback) {
    // Return unsubscribe mock
    return { data: { subscription: { unsubscribe() {} } } };
  }
};

const mockSupabase = {
  auth: mockAuth,
  from(table) {
    return new MockQueryBuilder(table);
  },
  storage: {
    from() {
      return {
        async upload(path, file) {
          // Mock upload, return a mock URL
          return { data: { path }, error: null };
        },
        getPublicUrl(path) {
          return { data: { publicUrl: `https://mockstorage.supabase.co/object/public/documents/${path}` } };
        }
      };
    }
  }
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase;

export default supabase;
