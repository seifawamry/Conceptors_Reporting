-- =============================================================================
-- CONCEPTORS ANIMAL HEALTH LLC - SUPABASE POSTGRESQL MASTER DATABASE MIGRATION
-- Project: conceptors-rep-crm (pywtpdnhomommitlidqo)
-- Distribution: Catalysis Spain, BARD Czech, Vitasigna, Ringbio across UAE
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. DROP EXISTING VIEWS & TABLES (SAFE IDEMPOTENT TEARDOWN)
-- =============================================================================
DROP VIEW IF EXISTS v_territory_summaries CASCADE;
DROP VIEW IF EXISTS v_unvisited_clinics CASCADE;
DROP VIEW IF EXISTS v_rep_monthly_kpis CASCADE;

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS manager_settings CASCADE;
DROP TABLE IF EXISTS stock_requests CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS monthly_plans CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS reps CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- 2. CREATE MASTER TABLES
-- =============================================================================

-- A. USERS (Authentication & Role Scope)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT 'rep1',
    name TEXT NOT NULL,
    title TEXT,
    role TEXT NOT NULL CHECK (role IN ('rep_t1', 'rep_t2', 'manager')),
    territory TEXT NOT NULL CHECK (territory IN ('T1', 'T2', 'ALL')),
    email TEXT,
    phone TEXT,
    avatar TEXT DEFAULT 'SH',
    color TEXT DEFAULT '#38bdf8',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- B. REPS (Medical Representative Territory Profiles & Targets)
CREATE TABLE reps (
    id TEXT PRIMARY KEY, -- 'T1', 'T2'
    name TEXT NOT NULL,
    title TEXT,
    territory TEXT NOT NULL,
    emirates TEXT[] NOT NULL DEFAULT '{}',
    phone TEXT,
    email TEXT,
    monthly_target_calls INTEGER NOT NULL DEFAULT 100,
    color TEXT DEFAULT '#38bdf8',
    avatar TEXT DEFAULT 'SH',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- C. PRODUCTS (Commercial Catalog & Stock Ledger)
CREATE TABLE products (
    code TEXT PRIMARY KEY, -- e.g. 'AS030'
    sku_id TEXT, -- e.g. 'CAT-01'
    brand TEXT NOT NULL, -- 'CATALYSIS', 'BARD', 'VITASIGNA', 'RINGBIO'
    name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    current_stock INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- D. CUSTOMERS (Clinic Profiles & Territory Accounts Roster)
CREATE TABLE customers (
    code TEXT PRIMARY KEY, -- e.g. 'DC0678'
    name TEXT NOT NULL,
    location TEXT NOT NULL, -- Emirate / City: 'Dubai', 'Abu Dhabi', 'Al Ain', etc.
    territory TEXT NOT NULL CHECK (territory IN ('T1', 'T2')),
    rep_id TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'Silver' CHECK (tier IN ('VIP Platinum', 'VIP Gold', 'Silver')),
    contact_person TEXT DEFAULT 'Lead Veterinarian',
    phone TEXT DEFAULT '+971 4 000 0000',
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customers_territory ON customers(territory);
CREATE INDEX idx_customers_location ON customers(location);
CREATE INDEX idx_customers_tier ON customers(tier);

-- E. MONTHLY_PLANS (Territory Targets, Scheduling & Manager Approvals)
CREATE TABLE monthly_plans (
    id TEXT PRIMARY KEY, -- e.g. 'PLAN-2026-09-T1'
    rep_id TEXT NOT NULL,
    rep_name TEXT NOT NULL,
    year INTEGER NOT NULL,
    month TEXT NOT NULL, -- 'JAN', 'FEB', ..., 'SEP', 'OCT'
    target_visits INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    manager_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_rep_plan_period UNIQUE (rep_id, year, month)
);

CREATE INDEX idx_monthly_plans_period ON monthly_plans(year, month);

-- F. VISITS (Planned and Executed Field Detailing Visits)
CREATE TABLE visits (
    id TEXT PRIMARY KEY, -- e.g. 'VIS-2026-0901-01'
    rep_id TEXT NOT NULL,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    location TEXT NOT NULL,
    date DATE NOT NULL,
    time_slot TEXT DEFAULT 'Morning Round (09:00 - 12:00)',
    visit_category TEXT NOT NULL CHECK (visit_category IN ('Planned', 'Unplanned')),
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Completed', 'Missed', 'Cancelled')),
    doctor_name TEXT,
    doctor_role TEXT,
    products_detailed TEXT[] DEFAULT '{}',
    doctor_sentiment TEXT DEFAULT 'Pending' CHECK (doctor_sentiment IN ('Enthusiastic', 'Positive', 'Neutral', 'Price Sensitive', 'Brand Loyal', 'Pending')),
    samples_dropped INTEGER DEFAULT 0,
    sample_product TEXT,
    order_placed BOOLEAN DEFAULT false,
    order_ref TEXT DEFAULT '',
    order_value_aed NUMERIC(10, 2) DEFAULT 0.00,
    purpose TEXT,
    unplanned_reason TEXT,
    outcome TEXT,
    missed_reason TEXT,
    next_follow_up DATE,
    next_follow_up_purpose TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_visits_date ON visits(date);
CREATE INDEX idx_visits_rep_id ON visits(rep_id);
CREATE INDEX idx_visits_client_code ON visits(client_code);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_category ON visits(visit_category);

-- G. ORDERS (Commercial Field Sales Orders)
CREATE TABLE orders (
    invoice_number TEXT PRIMARY KEY, -- e.g. 'ORD-2026-0901'
    date DATE NOT NULL,
    rep_id TEXT NOT NULL,
    rep_name TEXT NOT NULL,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    location TEXT NOT NULL,
    territory TEXT NOT NULL CHECK (territory IN ('T1', 'T2')),
    approval_status TEXT NOT NULL DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    payment_terms TEXT NOT NULL DEFAULT '30 Days Credit',
    delivery_urgency TEXT NOT NULL DEFAULT 'Normal (48h)',
    subtotal_exc_vat NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_inc_vat NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_date ON orders(date);
CREATE INDEX idx_orders_rep ON orders(rep_id);
CREATE INDEX idx_orders_approval ON orders(approval_status);

-- H. ORDER_ITEMS (Itemized Products & FOC Bonus Lines)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sales_qty INTEGER NOT NULL DEFAULT 0,
    foc_qty INTEGER NOT NULL DEFAULT 0,
    line_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_number);
CREATE INDEX idx_order_items_product ON order_items(product_code);

-- I. STOCK_REQUESTS (Sample & Trunk Stock Replenishment Requisitions)
CREATE TABLE stock_requests (
    id TEXT PRIMARY KEY, -- e.g. 'STK-REQ-001'
    rep_id TEXT NOT NULL,
    rep_name TEXT NOT NULL,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    request_type TEXT NOT NULL DEFAULT 'Sample Request',
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Fulfilled', 'Rejected')),
    reason TEXT,
    requested_date DATE DEFAULT CURRENT_DATE,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- J. NOTIFICATIONS (Senior Manager Real-Time Alerts & Outbox)
CREATE TABLE notifications (
    id TEXT PRIMARY KEY, -- e.g. 'NOTIF-001'
    type TEXT NOT NULL DEFAULT 'ORDER_SUBMITTED',
    title TEXT NOT NULL,
    order_number TEXT,
    rep_id TEXT NOT NULL,
    rep_name TEXT NOT NULL,
    client_code TEXT,
    client_name TEXT,
    location TEXT,
    total_exc_vat NUMERIC(10, 2) DEFAULT 0.00,
    total_inc_vat NUMERIC(10, 2) DEFAULT 0.00,
    timestamp TIMESTAMPTZ DEFAULT now(),
    read BOOLEAN DEFAULT false,
    approval_status TEXT DEFAULT 'Pending',
    items_summary TEXT,
    payment_terms TEXT,
    delivery_urgency TEXT,
    items_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_read ON notifications(read);

-- K. MANAGER_SETTINGS (Configuration & Alert Preferences)
CREATE TABLE manager_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    manager_emails TEXT NOT NULL DEFAULT 'sameh.ageez@conceptors.ae, gm@conceptors.ae',
    sound_alert BOOLEAN NOT NULL DEFAULT true,
    toast_alert BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 3. VIEWS: UNVISITED CLINICS & TERRITORY SUMMARIES
-- =============================================================================

CREATE OR REPLACE VIEW v_unvisited_clinics AS
SELECT 
    c.code,
    c.name,
    c.location,
    c.territory,
    c.rep_id,
    c.tier,
    c.contact_person,
    c.phone,
    MAX(v.date) AS last_visit_date,
    COUNT(CASE 
        WHEN v.status = 'Completed' 
             AND EXTRACT(YEAR FROM v.date) = EXTRACT(YEAR FROM CURRENT_DATE) 
             AND EXTRACT(MONTH FROM v.date) = EXTRACT(MONTH FROM CURRENT_DATE) 
        THEN 1 
    END) AS current_month_completed_visits,
    CASE 
        WHEN COUNT(CASE 
            WHEN v.status = 'Completed' 
                 AND EXTRACT(YEAR FROM v.date) = EXTRACT(YEAR FROM CURRENT_DATE) 
                 AND EXTRACT(MONTH FROM v.date) = EXTRACT(MONTH FROM CURRENT_DATE) 
            THEN 1 
        END) = 0 THEN true 
        ELSE false 
    END AS is_unvisited_this_month
FROM customers c
LEFT JOIN visits v ON c.code = v.client_code
GROUP BY c.code, c.name, c.location, c.territory, c.rep_id, c.tier, c.contact_person, c.phone;

CREATE OR REPLACE VIEW v_territory_summaries AS
SELECT 
    r.id AS territory_id,
    r.name AS rep_name,
    r.title AS rep_title,
    r.monthly_target_calls,
    COUNT(DISTINCT c.code) AS total_assigned_clinics,
    COUNT(CASE WHEN v.status = 'Completed' THEN 1 END) AS total_completed_visits,
    COUNT(CASE WHEN v.visit_category = 'Planned' AND v.status = 'Completed' THEN 1 END) AS completed_planned_visits,
    COUNT(CASE WHEN v.visit_category = 'Unplanned' AND v.status = 'Completed' THEN 1 END) AS completed_unplanned_visits,
    COUNT(CASE WHEN v.status = 'Planned' THEN 1 END) AS pending_planned_visits,
    COUNT(CASE WHEN v.status = 'Missed' THEN 1 END) AS missed_visits,
    ROUND(
        (COUNT(CASE WHEN v.status = 'Completed' THEN 1 END)::numeric / NULLIF(r.monthly_target_calls, 0)::numeric) * 100, 
        1
    ) AS target_achievement_pct,
    COALESCE(SUM(o.total_inc_vat), 0.00) AS total_orders_val_inc_vat,
    COALESCE(SUM(o.subtotal_exc_vat), 0.00) AS total_orders_val_exc_vat,
    COUNT(DISTINCT o.invoice_number) AS total_orders_count
FROM reps r
LEFT JOIN customers c ON r.id = c.rep_id
LEFT JOIN visits v ON r.id = v.rep_id
LEFT JOIN orders o ON r.id = o.rep_id AND o.approval_status = 'Approved'
GROUP BY r.id, r.name, r.title, r.monthly_target_calls;

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read/write users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write reps" ON reps FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write products" ON products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write customers" ON customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write monthly_plans" ON monthly_plans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write visits" ON visits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write orders" ON orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write order_items" ON order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write stock_requests" ON stock_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write notifications" ON notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write manager_settings" ON manager_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE visits, orders, order_items, monthly_plans, customers, notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END
$$;

-- =============================================================================
-- 5. SEED DATA (INITIAL MASTER CATALOG & HISTORICAL DATA)
-- =============================================================================

-- 5.1 SEED USERS
INSERT INTO users (username, password_hash, name, title, role, territory, email, phone, avatar, color) VALUES
('shaimaa.t1', 'rep1', 'Dr. Shaimaa', 'Medical Representative - Territory 1', 'rep_t1', 'T1', 'shaimaa.t1@conceptors.ae', '+971 50 123 4567', 'SH', '#38bdf8'),
('ahmed.t1', 'rep1', 'Dr. Shaimaa', 'Medical Representative - Territory 1', 'rep_t1', 'T1', 'shaimaa.t1@conceptors.ae', '+971 50 123 4567', 'SH', '#38bdf8'),
('marsel.t2', 'rep2', 'Dr. Marsel', 'Medical Representative - Territory 2', 'rep_t2', 'T2', 'marsel.t2@conceptors.ae', '+971 55 987 6543', 'MR', '#c084fc'),
('youssef.t2', 'rep2', 'Dr. Marsel', 'Medical Representative - Territory 2', 'rep_t2', 'T2', 'marsel.t2@conceptors.ae', '+971 55 987 6543', 'MR', '#c084fc'),
('sameh.ageez', 'admin', 'Dr. Sameh Ageez', 'Senior Sales Manager UAE', 'manager', 'ALL', 'sameh.ageez@conceptors.ae', '+971 50 888 9900', 'SA', '#10b981'),
('manager', 'admin', 'Dr. Sameh Ageez', 'Senior Sales Manager UAE', 'manager', 'ALL', 'sameh.ageez@conceptors.ae', '+971 50 888 9900', 'SA', '#10b981')
ON CONFLICT (username) DO NOTHING;

-- 5.2 SEED REPS
INSERT INTO reps (id, name, title, territory, emirates, phone, email, monthly_target_calls, color, avatar) VALUES
('T1', 'Shaimaa', 'Medical Representative - Territory 1', 'T1', '{"Dubai","Abu Dhabi","Al Ain"}', '+971 50 123 4567', 'shaimaa.t1@conceptors.ae', 100, '#38bdf8', 'SH'),
('T2', 'Marsel', 'Medical Representative - Territory 2', 'T2', '{"Sharjah","Ajman","Ras al- Khaimah","Fujairah","Umm al- Quwain"}', '+971 55 987 6543', 'marsel.t2@conceptors.ae', 100, '#c084fc', 'MR')
ON CONFLICT (id) DO NOTHING;

-- 5.3 SEED PRODUCTS
INSERT INTO products (code, sku_id, brand, name, unit_price, current_stock, category) VALUES
('AS030', 'CAT-01', 'CATALYSIS', 'ASBRIP 30 ml', 32, 4279, 'Respiratory / Immunity'),
('AS150', 'CAT-02', 'CATALYSIS', 'ASBRIP 150 ml', 104, 190, 'Respiratory / Immunity'),
('CA030', 'CAT-03', 'CATALYSIS', 'CARMINAL 30 ml', 38, 1260, 'Gastrointestinal'),
('CA150', 'CAT-04', 'CATALYSIS', 'CARMINAL 150 ml', 118, 78, 'Gastrointestinal'),
('KR030', 'CAT-05', 'CATALYSIS', 'KARDIOLI 30 ml', 34, 116, 'Cardiovascular'),
('KR150', 'CAT-06', 'CATALYSIS', 'KARDIOLI 150 ml', 114, 31, 'Cardiovascular'),
('FO030', 'CAT-07', 'CATALYSIS', 'FOLREX 30 ml', 32, 320, 'Joints / Mobility'),
('FO150', 'CAT-08', 'CATALYSIS', 'FOLREX 150 ml', 112, 44, 'Joints / Mobility'),
('KA030', 'CAT-09', 'CATALYSIS', 'KALSIS 30 ml', 32, 307, 'Bone & Calcium'),
('KA150', 'CAT-10', 'CATALYSIS', 'KALSIS 150 ml', 104, 32, 'Bone & Calcium'),
('OB030', 'CAT-11', 'CATALYSIS', 'OBEX 30 ml', 38, 328, 'Metabolism / Weight'),
('OB150', 'CAT-12', 'CATALYSIS', 'OBEX 150 ml', 125, 17, 'Metabolism / Weight'),
('RE030', 'CAT-13', 'CATALYSIS', 'RENALOF 30 ml', 32, 1961, 'Renal / Urinary'),
('RE150', 'CAT-14', 'CATALYSIS', 'RENALOF 150 ml', 104, 278, 'Renal / Urinary'),
('VP030', 'CAT-15', 'CATALYSIS', 'VIUSID 30 ml', 40, 2676, 'Immunostimulant & Antiviral'),
('VP150', 'CAT-16', 'CATALYSIS', 'VIUSID 150 ml', 115, 235, 'Immunostimulant & Antiviral'),
('OC030', 'CAT-17', 'CATALYSIS', 'OCOXIN 30 ml', 42, 259, 'Oncology / Antioxidant'),
('OC150', 'CAT-18', 'CATALYSIS', 'OCOXIN 150 ml', 131, 12, 'Oncology / Antioxidant'),
('VA030', 'CAT-19', 'CATALYSIS', 'VUISID AVIS 30 ml', 40, 293, 'Avian Immunity'),
('VA150', 'CAT-20', 'CATALYSIS', 'VUISID AVIS 150 ml', 110, 39, 'Avian Immunity'),
('VD030', 'CAT-21', 'CATALYSIS', 'VUISID DETOX 30 ml', 40, 599, 'Hepatic Detox'),
('VD150', 'CAT-22', 'CATALYSIS', 'VIUSID DETOX 150 ml', 115, 48, 'Hepatic Detox'),
('BC150', 'CAT-23', 'CATALYSIS', 'BLUE CAP SHAMPOO PETS 150 ml', 55, 324, 'Dermatology'),
('BC400', 'CAT-24', 'CATALYSIS', 'BLUE CAP SHAMPOO PETS 400 ml', 110, 43, 'Dermatology'),
('BE005', 'BRD-01', 'BARD', 'BARD Clever Fungus Ecosin 5x3g', 77, 656, 'Antifungal / Derm'),
('BD0100', 'BRD-02', 'BARD', 'BARD Clever Fungus Dermasine 100ml', 76, 351, 'Antifungal / Derm'),
('BVO50', 'BRD-03', 'BARD', 'BARD Pythie Pets vet ointment 50ml', 58, 463, 'Dermatology'),
('BFB00', 'BRD-04', 'BARD', 'BARD Pythie Pets Fresh Breath', 53, 365, 'Oral Care'),
('BPE00', 'BRD-05', 'BARD', 'BARD Pythie Pets Ear cleaner', 58, 317, 'Ear Care'),
('VR030', 'VIT-01', 'VITASIGNA', 'VIRULYS Paste 30ml', 33, 2039, 'Feline Lysine / Immunity'),
('TOX015', 'RING-01', 'RINGBIO', 'Toxoplasma Antibody Rapid 15 Test Card', 270, 45, 'Diagnostics'),
('CPV015', 'RING-02', 'RINGBIO', 'Canine Parvovirus (CPV) 15 Test Card', 225, 60, 'Diagnostics'),
('FPV015', 'RING-03', 'RINGBIO', 'Feline Panleukopenia Virus (FPV) 15 Test Card', 225, 55, 'Diagnostics')
ON CONFLICT (code) DO NOTHING;

-- 5.4 SEED CLINICS / CUSTOMERS (All 260 Accounts across UAE)
INSERT INTO customers (code, name, location, territory, rep_id, tier, contact_person, phone) VALUES
('AC0550', 'CAPITAL VET CLINIC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Dr. Fatima Al-Hosani', '+971 2 000 0550'),
('AC0720', 'GERMAN VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Dr. Katja Lang', '+971 2 000 0720'),
('SC0215', 'AL SHAMS VETERINARY PHARMACY', 'Sharjah', 'T2', 'T2', 'Silver', 'Dr. Bilal Qasim', '+971 6 000 0215'),
('JC0312', 'AJMAN PET HOSPITAL', 'Ajman', 'T2', 'T2', 'VIP Gold', 'Dr. Ziad Al-Khouly', '+971 6 000 0312'),
('DC0678', 'PRIME PAWS VET CLINIC', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0277', 'ANIMAL SPECIALIST CLINIC', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0339', 'DOCTOR DOLITTLE VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0615', 'INTERVET VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0835', 'PETS REPUBLIC VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0870', 'HAPPY PETS VETERINARY CLINIC', 'Al Ain', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0321', 'HEALTH AND CARE VETERINARY CLINIC', 'Al Ain', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0636', 'THE CITY VET CLINIC MEYDAN BR.', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0721', 'TOP CARE VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0618', 'PERFECT DOSE VET CLINIC', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0892', 'EUROGULF ANIMAL AND BIRDS FOOD TRADING', 'Abu Dhabi', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0681', 'THE HILLS VET CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0406', 'JABAL ALADHAM VETERINARY CLINIC', 'Al Ain', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0551', 'THE CITY VET CLINIC AL WARQA', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0767', 'PET STREET VET CLINIC', 'Al Ain', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0411', 'JVC EXPRESS VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0630', 'Liberty veterinary clinic', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0310', 'CANADIAN VETRINARY CLINIC - AL MEENA', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0658', 'SWISS VETERINARY CLINIC LLC O.P.C', 'Abu Dhabi', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0322', 'CLOUD 9 PET HOTEL AND CARE', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0478', 'PETS HEALTH VETERINARY CLINIC FZE', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0050', 'AL FALAH VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0494', 'PURE LIFE VET TREATMENT', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0631', 'Majestic vet clinic', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0626', '2FEET4PAWS (& EXOTICS) VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0885', 'PAWBULANCE VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0738', 'Eleven Eleven Vet Clinic', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0620', 'AMORE VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0460', 'NEW VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0550', 'THE CITY VET CLINIC (JVT BRANCH)', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('NP0231', 'ALNASR VETERINARY EST', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0427', 'MARINA VET CLINIC L.L.C', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0304', 'BRITISH VETERINARY CENTRE LLC KHALIFA CITY', 'Abu Dhabi', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0880', 'KINGS VET CLINIC', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0771', 'SKY VET CLINIC', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0648', 'LIFE LINE VET CLINIC', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0910', 'MARSHAL VET CLINIC', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0908', 'MYPETSFIRST VETERINARY CLINIC L.L.C', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0871', 'MIKE''S VET', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0289', 'BAGHDAD VETERINARY MEDICINE ESTABLISHMENT- BRANCH 1', 'Abu Dhabi', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0616', 'PET YARD VET CLINIC', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0584', 'VETS FUR PETS VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0575', 'VET VETERINARY CLINIC TOWN SQ', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0650', 'ANUBIS VET CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0918', 'SAFE CARE VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0657', 'VETS IN THE CITY', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0920', 'THE ARK ANIMAL CLINIC - FZCO', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0549', 'THE CITY VET CLINIC (AL BARSHA BRANCH)', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0905', 'TOP VET VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0506', 'ROYAL VETERINARY CENTRE', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000')
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, location, territory, rep_id, tier, contact_person, phone) VALUES
('DC0922', 'MYPETSFIRST VETERINARY CLINIC (BR)', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0553', 'THE CITY VET CLINIC MIRDIF', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0482', 'PETS OASIS VET CLINIC AUH', 'Abu Dhabi', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0800', 'PETOLOGY VET CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0925', 'CATS MEDICAL CENTER VETERINARY CLINIC L.L.C', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0319', 'CITY VET VETERINERY CLINIC AL AIN', 'Al Ain', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0926', 'VETS FOR PETS L.L.C', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0705', 'AL RAHA FOR VETERIANRY TREATMENT', 'Abu Dhabi', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0883', 'KARE VETERINARY CLINIC LLC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0617', 'PET AVENUE JVC CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0714', 'PET PAVILLON', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0931', 'PETLAND WELLNESS VETERINARY CLINIC L.L.C', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0932', 'TERRITORY VETERINARY CLINIC L.L.C', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0574', 'VET VETERINARY CLINIC L.L.C', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0935', 'WELLPET VETERINARY CLINIC. L.L.C -O.P.C', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0139', 'AL RAWDAH VETERINARY CLINIC', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0823', 'AL FALAH VETERINARY CLINIC AL MEENA BRANCH', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0878', 'PURE LIFE VET TREATMENT DUBAI BRANCH', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0778', 'PETS SOCIETY VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0937', 'ALEX VETERINARY CLINIC - L.L.C - O.P.C', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0938', 'FAMILY VETERINARY CLINIC - L.L.C - O.P.C', 'Al Ain', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0484', 'PETZONE VETERINARY CLINIC L.L.C', 'Dubai', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0468', 'PAWS AND CLAWS VETERINARY CLINIC', 'Al Ain', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0729', 'PAWS & CLAWS VET CLINIC JVC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0941', 'HILAL VETERINARY CENTER - L.L.C - S.P.C', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0940', 'FAIRY TAIL VETERINARY CLINIC L.L.C.', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0942', 'VIP VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0773', 'BAYT AL TYOOR VET PH', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0459', 'NATIONAL VETERINARY CLINIC L.L.C', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0660', 'AL RAHA VET CLINIC', 'Abu Dhabi', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0825', 'CARDIOVET VETERINARY CLINIC LLC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0945', 'R P C VETERINARY CLINIC LLC', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0623', 'PETS HAVEN VET CLINIC', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0711', 'AL TUHAMY VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0306', 'BU HAREB VETRINARY MEDICINE ESTAB', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0147', 'AL REHAB VETERINARY PHARMACY', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0833', 'AL GHAZAL VETERINARY PHARMACY', 'Abu Dhabi', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0890', 'F3 FALCON FOR ANIMAL AND BIRDS FOOD TRADING', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0949', 'MATYT ALSABOOQ FOR VETERINARY MEDICINE AND EQUIPMENT - L.L.C -O.P.C', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0743', 'AL FATEH VET CLINIC', 'Al Ain', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0455', 'NAJM SUHAIL VETERINERY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0308', 'CANADIAN VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NP761', 'AL FALAH VET - L.L.C - S.P.C - BRANCH', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0955', 'AL QEMMA ANIMAL AND POULTRY FOOD - L.L.C - S.P.C', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0957', 'Kings Veterinary Clinic L.L.C', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0708', 'WELLFARE VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0958', 'PAWSITIVE VIBES VETERINARY CLINIC LLC- S.P.C', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0961', 'Animal Planet Veterinary Clinic', 'Al Ain', 'T1', 'T1', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0775', 'AL JOOD PH', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0278', 'ANIMALIA VETERINARIAN TREATMENT L.L.C', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000')
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, location, territory, rep_id, tier, contact_person, phone) VALUES
('AC0747', 'HOPE VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0765', 'PETS OASIS', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC0963', 'Soul Veterinary Clinic - Al Ain Branch', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0461', 'NOBLE VETERINARY CLINIC DIP', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0972', 'PET WELL VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0897', 'PET BOND VETERINARY CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0974', 'CASTLE VETERINARY CENTER -  L.L.C - S.P.C', 'Abu Dhabi', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0900', 'AL FURJAN VET CLINIC', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0978', 'BULBIN ANIMAL AND POULTRY FOOD LLC - SPC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NP0048', 'AL FALAH VET. EST AL AIN', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0959', 'Aleef Veterinary Clinic - AUH', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AP0121', 'AL NAWADIR VET PHARMACY AUH CENTER', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0988', 'CIRCLE VET VETERINARY CLINIC - FZE', 'Dubai', 'T1', 'T1', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0984', 'PROVETEX VETERINARY CLINIC L.L.C', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0991', 'PET PLANET VETERINARY CLINIC L.L.C', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0983', 'HORUS VETERINARY TREATMENT', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0996', 'VET POINT VETERINARY CLINIC L.L.C S.O.C', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0998', 'ALPHAPET VETERINARY CLINIC LLC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0637', 'VET PLUS MARINA', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC1001', 'ZOOVET VETERING CLINIC', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('NC1002', 'FIT PAWS PETS CLINIC', 'Al Ain', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0689', 'PET FIRST VET CLINIC', 'Dubai', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('AC0992', 'AL REEM VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'T1', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0852', 'LOVELY PET CLINIC', 'Fujairah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0826', 'AL FERSAN VETERINARY CLINIC', 'Ajman', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('RP0236', 'ALNOOR VETERINARY CLINIC', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('JP0199', 'ALAADYAT VETERINARY MEDICINE', 'Ajman', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0072', 'AL HAYAT VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0889', 'EASYVET VETERINARY CLINIC L.L.C', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DP0642', 'VETERINARIAN FOR VETERINARY MEDICINES', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0312', 'CANARY PET HUB CLINIC', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('UC0162', 'AL SALAMA VETERINARY CLINIC', 'Umm al- Quwain', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0340', 'DR SAMIR VET CLINIC', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0471', 'PET CARE CLINIC', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0629', 'WINTERFELL VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0621', 'PET LAND VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0541', 'SYNERGY VETERINARY CLINIC LLC', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0611', 'HAPPY TAILS VETERINARY CLINIC', 'Ajman', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0821', 'Petflix Veterinary Clinic LLC', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0624', 'Happy paws vet clinic', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0661', 'THE MOON VET CLINIC', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0856', 'PET JOY VETERINARY CLINIC - FZCO', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0609', 'HUB VET CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0576', 'VETCARE VETRINARY MEDICAL CENTER', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0544', 'TAG VETERINARY CLINIC', 'Ras al- Khaimah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0749', 'ALALAMIA VETERINARY CLINIC', 'Ajman', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('RP0896', 'SHAMAL VETERINARY PHARMACY', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('FP0704', 'AL KAYAN VET PHARMACY', 'Fujairah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0022', 'AL ASIFAH VETERINARY CLINIC LLC', 'Ras al- Khaimah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0809', 'AL AMAL VET CLINIC', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000')
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, location, territory, rep_id, tier, contact_person, phone) VALUES
('JC0805', 'PET LIFE VET CLINIC', 'Ajman', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0481', 'PETS OASIS VET CLINIC LLC, RAS AL KHAIMAH, UAE', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0613', 'AL JUBAIL VET CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0886', 'AL HEKMAH VET MEDICINES LLC', 'Sharjah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0497', 'RAS AL KHAIMAH VETERINARY CENTER', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0895', 'THE GREEN LINE VET CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0265', 'AL WATANYA VET CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0703', 'AL RAHMA VET CLINIC', 'Ajman', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0307', 'CANADIAN VETERINARIAN CLINIC SHJ', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0806', 'CORNICHE VET CLINIC', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0903', 'THE PET DOCTOR CENTER', 'Sharjah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0633', 'ROYAL PETS VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('RP0115', 'AL NAWADIR VET PHARMACY RAK', 'Ras al- Khaimah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0901', 'THE PEARL VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0917', 'SUPER VET PET CLINIC LLC', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0887', 'ALEF & ANEQ VETERINARY CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0122', 'AL NAWADIR VETRINARY MEDICINES & EQUIPMENT L.L.C', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0921', 'AL UMARA VETERINARIAN CLINIC L.L.C. SP', 'Sharjah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0840', 'AL-RAYAH AL-BAYDAA VET CLINIC', 'Fujairah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0077', 'AL JAWAREH VET CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0912', 'ALRAYAH ALBAYDAA VET. CLINIC BR. 1', 'Fujairah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SP0228', 'ALMUMTAZ VET. MEDICINE', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0632', 'DEIRA VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0819', 'PET PALACE VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0766', 'AL RAYAN VET CLINIC LLC', 'Ajman', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0445', 'MODERN VET L.L.C (JVC BR.)', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0737', 'CUTE CAT VETERINARY CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0475', 'PET LOVERS VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0483', 'PETS,N US VETERINARY CLINIC', 'Fujairah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0927', 'JUNGLE VETERINARY CLINIC L.L.C', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0928', 'PET PULSE EMERGENCY VETERINARY CLINIC - FZCO', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0929', 'ZOKO VETERINARY CLINIC L.L.C', 'Ajman', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0930', 'SUKAR PETS CARE AND VET', 'Ajman', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0644', 'ZAD VET CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('JP0843', 'VET LIFE PHARMACY', 'Ajman', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0911', 'CUTE PAWS VETERINARY CLINIC LLC', 'Fujairah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0849', 'DAR AL WAAD VET CLINIC', 'Fujairah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0735', 'AL MALAKIYA VET CLINIC', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0820', 'CROWN VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0933', 'PETS VETERINARY CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0836', 'ALEEF VETERINARY CLINIC', 'Fujairah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0888', 'AL ANAMIL AL THAHABIA VET CLINIC', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0936', 'DR. JIMMY VET CLINIC', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0939', 'PETBOOK VETERINARY CLINIC L.L.C', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0324', 'CREATURES WORLD VET CENTER', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0572', 'VET PLUS VET CENTER SHJ', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0943', 'AFDHAL VET.CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0639', 'MODERN VET DOWNTOWN', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0401', 'HARMONY VET CLINIC L.L.C', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0485', 'PHOENIX VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000')
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, location, territory, rep_id, tier, contact_person, phone) VALUES
('JC0638', 'SOUL VET CLINIC', 'Ajman', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0947', 'AL AMIRAT CLINIC PETS CARE (S.P.S - L.L.C)', 'Ajman', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0582', 'VETS24 VETERINARY CLINIC LLC', 'Ras al- Khaimah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0804', 'FLUFFY VETERINARY CLINIC FOR PETS', 'Ajman', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0946', 'ANIMALIA VETERINARY CLINIC L.L.C', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0948', 'Eurogulf Animal & Birds Food Trading', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0951', 'PURR AND BARK PET VETERINARY CLINIC L.L.C', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DP0950', 'SINJAR VETERINARY MEDICINES TRADING', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('RP0248', 'ALRAWAH VETERINARY PHARMACY', 'Ras al- Khaimah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0881', 'Sharjah Falconers Club Clinic', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0952', 'Fluffy Cats Veterinary Clinic LLC - SPC', 'Fujairah', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0452', 'NAD AL SHIBA VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0764', 'PETS HEALTH CARE VET CLINIC', 'Fujairah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0953', 'PAWS FAMILY VETERINARY CLINIC L.L.C', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0651', 'Pet Wellness vet clinic', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0875', 'AL TAREEK VET CLINIC', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0954', 'TURKISH VET.CLINIC', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0944', 'TERRITORY VETERINARY CLINIC L.L.C (BRANCH)', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0907', 'SHARJAH FALCON CLINIC LLC SOLE  PROPRIETORSHIP', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0956', 'PAW PRINTS VETERINARY CLINIC L.L.C', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0610', 'AlHayat Vetrinary Clinic', 'Ajman', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0855', 'VET CARE VET CLINIC', 'Fujairah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0587', 'VILLAGE VET LLC AL HAMRA MALL', 'Ras al- Khaimah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0476', 'PET POINT VETERINARY CLINIC FZCO', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0313', 'CANARY VET. CLINIC', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0858', 'RAK ANIMAL WELFARE CENTER', 'Ras al- Khaimah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0906', 'PAWS SISTERS VETERINARY CLINIC LLC', 'Dubai', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0628', 'DUBAI MUNICIPALITY VET CLINIC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0964', 'ALENAYA PET CENTER', 'Ajman', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0828', 'THE PET VET - VETERINARY', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DP0508', 'RUKAN ALZAJEL VETERINARY MEDICINES', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SP0117', 'AL NAWADIR MEDICINE AND VET. EQUIP SHJ', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0181', 'AL TAREK VETERINARY CLINIC L.L.C', 'Ajman', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0087', 'AL MAHA VET CLINIC', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('sc0307', 'CANADIAN VETERINARIAN CLINIC SHJ', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0971', 'CURE VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0969', 'CREEKSIDE VETERINARY CLINIC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0608', 'PUBLIC HEALTH DEPARTMENT THE VETERINARY CLINIC', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DP0975', 'MODERN VET HOSPITAL LLC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0968', 'ELITE VET. CLINIC L.L.C', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0731', 'AL ASIFAH VET CLINIC SHJ', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0727', 'CITY PET VET CLINIC', 'Ajman', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0976', 'Europets Care Veterinary Clinic LLC', 'Dubai', 'T2', 'T2', 'VIP Platinum', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0977', 'FOREVER PET CARE CLINIC', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0979', 'EXPRESS VETERINARY CLINIC L.L.C', 'Ajman', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0980', 'AL HAMRA VET CLINIC LLC. SP', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0981', 'AL HUDHUD VET CLINIC', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('DC0982', 'DUBAI EQUINE HOSPITAL', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SP0831', 'VET PLUS MAIN OFFICE', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('dc0906', 'PAWS SISTERS VETERINARY CLINIC LLC', 'Dubai', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000')
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, location, territory, rep_id, tier, contact_person, phone) VALUES
('SC0985', 'FLUFFY VETERINARY CLINIC L L C - SHJ. BR 1', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0989', 'AL HAYAH PET CARE Clinic', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('JC0986', 'PET PARADISE VETERINARY CLINIC L.L.C', 'Ajman', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SP0990', 'SAHAM AL SHIFA VETERINARY MEDICINE TR LLC', 'Sharjah', 'T2', 'T2', 'VIP Gold', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0994', 'Al MAHA VETERINARY CLINIC RAK', 'Ras al- Khaimah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('RC0993', 'JOLLY VET CLINIC', 'Ras al- Khaimah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0997', 'Kayan vet clinic', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('FC0999', 'Al Khoor Veterinary Clinic LLC', 'Fujairah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('SC0356', 'EURO PETS CLINIC', 'Sharjah', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000'),
('UC0479', 'PETS OASIS VETERINARY CLINIC - UAQ', 'Umm al- Quwain', 'T2', 'T2', 'Silver', 'Lead Veterinarian', '+971 4 000 0000')
ON CONFLICT (code) DO NOTHING;

-- 5.5 SEED MONTHLY PLANS
INSERT INTO monthly_plans (id, rep_id, rep_name, year, month, target_visits, status, submitted_at, approved_at, approved_by, manager_notes) VALUES
('PLAN-2026-09-T1', 'T1', 'Shaimaa', 2026, 'SEP', 100, 'Approved', '2026-08-28T09:15:00Z', '2026-08-29T14:30:00Z', 'Dr. Sameh Ageez (Senior Sales Manager)', 'Approved. Focus heavily on Virulys 30ml feline launch and Renalof 150ml clinical clinic packs.'),
('PLAN-2026-09-T2', 'T2', 'Marsel', 2026, 'SEP', 100, 'Approved', '2026-08-27T11:00:00Z', '2026-08-28T16:00:00Z', 'Dr. Sameh Ageez (Senior Sales Manager)', 'Approved. High coverage of BARD Dermasine across Sharjah and RAK.'),
('PLAN-2026-10-T1', 'T1', 'Shaimaa', 2026, 'OCT', 100, 'Submitted', '2026-09-08T10:00:00Z', NULL, NULL, 'Submitted for Q4 commercial campaign review.'),
('PLAN-2026-10-T2', 'T2', 'Marsel', 2026, 'OCT', 100, 'Draft', NULL, NULL, NULL, '')
ON CONFLICT (id) DO NOTHING;

-- 5.6 SEED VISITS
INSERT INTO visits (id, rep_id, client_code, client_name, location, date, time_slot, visit_category, status, doctor_name, doctor_role, products_detailed, doctor_sentiment, samples_dropped, sample_product, order_placed, order_ref, order_value_aed, purpose, unplanned_reason, outcome, missed_reason, next_follow_up, next_follow_up_purpose) VALUES
('VIS-2026-0901-01', 'T1', 'DC0340', 'DR SAMIR VET CLINIC', 'Dubai', '2026-09-01', 'Morning Round (09:00 - 10:30)', 'Planned', 'Completed', 'Dr. Samir Al-Khatib', 'Lead Veterinarian & Director', '{"VIRULYS Paste 30ml","VIUSID 30 ml"}', 'Positive', 1, 'VIRULYS Paste 30ml', false, '', 0, 'Initial introduction of Virulys feline respiratory paste formulation', '', 'Introduced formulation data. Doctor requested small clinic trial before commercial order.', '', '2026-09-09', 'Review trial feedback'),
('VIS-2026-0901-02', 'T1', 'DC0461', 'NOBLE VETERINARY CLINIC DIP', 'Dubai', '2026-09-01', 'Midday (11:30 - 13:00)', 'Planned', 'Completed', 'Dr. Tariq Al-Hashimi', 'Clinical Director', '{"RENALOF 150 ml","ASBRIP 150 ml"}', 'Enthusiastic', 2, 'RENALOF 150 ml', false, '', 0, 'Promote 150ml clinical surgery packs for hospitalized nephrology canine patients', '', 'Presented clinical trial results. Dr. Tariq agreed to evaluate with inpatient ward team.', '', '2026-09-08', 'Collect surgery feedback'),
('VIS-2026-0902-01', 'T1', 'DC0623', 'PETS HAVEN VET CLINIC', 'Dubai', '2026-09-02', 'Morning (10:00 - 11:30)', 'Planned', 'Completed', 'Dr. Chloe Bennett', 'Senior Vet Surgeon', '{"VIUSID 30 ml","ASBRIP 30 ml"}', 'Enthusiastic', 2, 'VIUSID 30 ml', true, 'ORD-2026-0903-HIST', 850, 'Seasonal immunity campaign detailing for post-boarding recovery animals', '', 'Doctor placed immediate stocking order for 15 Viusid + 3 FOC and 10 Asbrip 30ml.', '', '2026-09-22', 'Routine stock review'),
('VIS-2026-0902-02-UNP', 'T1', 'DC0931', 'PETLAND WELLNESS VETERINARY CLINIC', 'Dubai', '2026-09-02', 'Afternoon Spontaneous (14:00 - 15:00)', 'Unplanned', 'Completed', 'Dr. Marcus Vance', 'Head Veterinarian', '{"CARMINAL 30 ml"}', 'Positive', 1, 'CARMINAL 30 ml', false, '', 0, 'Unplanned visit on route to introduce activated anti-spasmodic veterinary portfolio', 'Spontaneous Nearby Drop-in', 'Dr. Marcus interested in chronic gastritis clinical cases. Sample accepted for outpatient trial.', '', '2026-09-20', 'Check patient response'),
('VIS-2026-0903-01', 'T1', 'AC0310', 'CANADIAN VETERINARY CLINIC - AL MEENA', 'Abu Dhabi', '2026-09-03', 'Morning Round (10:30 - 12:00)', 'Planned', 'Completed', 'Dr. Andrew Clarke', 'Chief Veterinary Officer', '{"VIRULYS Paste 30ml","RENALOF 30 ml"}', 'Positive', 2, 'VIRULYS Paste 30ml', false, '', 0, 'VIRULYS introduction and renal oxalate dissolution detailing', '', 'Constructive discussion. Dr. Andrew scheduled second round with senior feline ward nurses.', '', '2026-09-08', 'Ward team demo'),
('VIS-2026-0903-02', 'T1', 'AC0550', 'CAPITAL VET CLINIC', 'Abu Dhabi', '2026-09-03', 'Afternoon (14:30 - 16:00)', 'Planned', 'Completed', 'Dr. Fatima Al-Hosani', 'Managing Partner', '{"ASBRIP 30 ml","VIUSID 30 ml"}', 'Neutral', 1, 'ASBRIP 30 ml', false, '', 0, 'Present cough relief and viral bronchitis recovery portfolio', '', 'Doctor requested comparative study with conventional ambroxol syrups.', '', '2026-09-24', 'Deliver comparative papers'),
('VIS-2026-0904-01', 'T1', 'AC0720', 'GERMAN VETERINARY CLINIC', 'Abu Dhabi', '2026-09-04', 'Morning (10:00 - 11:30)', 'Planned', 'Completed', 'Dr. Katja Lang', 'Senior Surgeon & Director', '{"VIRULYS Paste 30ml","ASBRIP 150 ml"}', 'Enthusiastic', 1, 'VIRULYS Paste 30ml', true, 'ORD-2026-0904-HIST', 1200, 'Feline upper respiratory tract infections clinical protocol detailing', '', 'High acceptance. Dr. Katja authorized clinical clinic package order of 20 Virulys + 10 Asbrip 150ml.', '', '2026-09-25', 'Clinical case study collection'),
('VIS-2026-0907-01', 'T1', 'NC1001', 'ZOOVET VETERINARY CLINIC', 'Al Ain', '2026-09-07', 'Morning (10:30 - 12:00)', 'Planned', 'Completed', 'Dr. Khalid Mansoor', 'Lead Veterinarian', '{"VIUSID 30 ml","CARMINAL 30 ml"}', 'Positive', 1, 'VIUSID 30 ml', false, '', 0, 'Al Ain territory field day: introduce activated antioxidant range', '', 'Presented clinical benefits of molecular activation. Doctor scheduled formal order review for end of month.', '', '2026-09-28', 'End of month booking'),
('VIS-2026-0907-02-UNP', 'T1', 'NC0406', 'JABAL ALADHAM VETERINARY CLINIC', 'Al Ain', '2026-09-07', 'Afternoon Spontaneous (13:30 - 14:45)', 'Unplanned', 'Completed', 'Dr. Sultan Al-Ketbi', 'Clinic Owner', '{"VIRULYS Paste 30ml","BARD Clever Fungus Dermasine 100ml"}', 'Enthusiastic', 1, 'BARD Clever Fungus Dermasine 100ml', false, '', 0, 'Spontaneous call following Zoovet visit to expand Al Ain clinic reach', 'Spontaneous Nearby Drop-in', 'Excellent response from Dr. Sultan. High demand for skin and dermatological natural solutions.', '', '2026-09-28', 'Follow up with pharmacy manager'),
('VIS-2026-0908-01', 'T1', 'DC0461', 'NOBLE VETERINARY CLINIC DIP', 'Dubai', '2026-09-08', 'Morning Follow-up (09:30 - 11:00)', 'Planned', 'Completed', 'Dr. Tariq Al-Hashimi', 'Clinical Director', '{"RENALOF 30 ml","VIRULYS Paste 30ml"}', 'Enthusiastic', 0, '', true, 'ORD-2026-0908-HIST', 940, 'Second planned cycle call following September 1st hospital trial', '', 'Follow-up success. Inpatient ward team approved Renalof protocol. Booked 15 Renalof 30ml + 10 Virulys.', '', '2026-09-29', 'Monthly re-order review'),
('VIS-2026-0908-02', 'T1', 'AC0310', 'CANADIAN VETERINARY CLINIC - AL MEENA', 'Abu Dhabi', '2026-09-08', 'Afternoon Round (14:00 - 15:30)', 'Planned', 'Completed', 'Dr. Andrew Clarke', 'Chief Veterinary Officer', '{"VIUSID 30 ml","VIRULYS Paste 30ml"}', 'Positive', 1, 'VIUSID 30 ml', false, '', 0, 'Second cycle call to deliver promised clinical trials to veterinary nursing department', '', 'Nurses briefed on Virulys palatability in hospitalized cats. Order expected in October cycle.', '', '2026-10-06', 'October monthly order'),
('VIS-2026-0901-03', 'T2', 'FC0852', 'LOVELY PET CLINIC', 'Sharjah', '2026-09-01', 'Morning (10:00 - 11:30)', 'Planned', 'Completed', 'Dr. Maria Santos', 'Senior Vet Surgeon', '{"VIRULYS Paste 30ml","BARD Clever Fungus Dermasine 100ml"}', 'Positive', 2, 'VIRULYS Paste 30ml', false, '', 0, 'Kick-off September cycle: introduce feline herpes protocol and BARD biological spray', '', 'Dr. Maria requested clinical feedback from other clinics in UAE before adopting.', '', '2026-09-06', 'Follow-up with Dubai equine & small animal testimonials'),
('VIS-2026-0902-03', 'T2', 'SC0933', 'PETS VETERINARY CLINIC', 'Sharjah', '2026-09-02', 'Morning (10:30 - 12:00)', 'Planned', 'Completed', 'Dr. Samah Mansi', 'Director', '{"ASBRIP 30 ml","VIUSID 30 ml"}', 'Enthusiastic', 1, 'ASBRIP 30 ml', true, 'ORD-2026-0902-T2', 720, 'Discuss respiratory support in juvenile kittens and boarding animals', '', 'Placed order for 12 Asbrip 30ml + 2 FOC and 5 Viusid 30ml.', '', '2026-09-23', 'Check inventory turnover'),
('VIS-2026-0903-03', 'T2', 'RP0236', 'ALNOOR VETERINARY CLINIC', 'Ras al- Khaimah', '2026-09-03', 'Morning (10:00 - 11:30)', 'Planned', 'Completed', 'Dr. Tariq Al-Nuaimi', 'Chief Vet Surgeon', '{"VIRULYS Paste 30ml","RENALOF 30 ml"}', 'Positive', 1, 'VIRULYS Paste 30ml', false, '', 0, 'Detailing Virulys and Renalof to RAK lead veterinary hospital', '', 'Dr. Tariq accepted sample for inpatient clinic ward trial.', '', '2026-09-07', 'Review trial results'),
('VIS-2026-0903-04-UNP', 'T2', 'RP0896', 'SHAMAL VETERINARY PHARMACY', 'Ras al- Khaimah', '2026-09-03', 'Afternoon Spontaneous (13:30 - 14:30)', 'Unplanned', 'Completed', 'Dr. Faisal Al-Zahrani', 'Pharmacy Manager', '{"BARD Pythie Pets Ear cleaner","CARMINAL 30 ml"}', 'Positive', 1, 'BARD Pythie Pets Ear cleaner', false, '', 0, 'Spontaneous call at nearby pharmacy after Alnoor Clinic visit', 'Spontaneous Nearby Drop-in', 'Introduced Pythium oligandrum biological ear hygiene. Pharmacy manager agreed to stock upon doctor demand.', '', '2026-09-24', 'Generate clinic pull-through'),
('VIS-2026-0904-02', 'T2', 'JC0804', 'FLUFFY VETERINARY CLINIC FOR PETS', 'Ajman', '2026-09-04', 'Morning (11:00 - 12:30)', 'Planned', 'Completed', 'Dr. Nour Al-Hassan', 'Managing Director', '{"VIRULYS Paste 30ml","VIUSID 30 ml"}', 'Positive', 2, 'VIRULYS Paste 30ml', false, '', 0, 'Initial introduction to Dr. Nour for Virulys palatability and efficacy in Persian cats', '', 'Dr. Nour started testing on shelter rescues with chronic rhinitis.', '', '2026-09-09', 'Evaluate rescue cat improvements & secure commercial order'),
('VIS-2026-0906-01', 'T2', 'FC0852', 'LOVELY PET CLINIC', 'Sharjah', '2026-09-06', 'Morning Follow-up (10:00 - 11:15)', 'Planned', 'Completed', 'Dr. Maria Santos', 'Senior Vet Surgeon', '{"BARD Clever Fungus Dermasine 100ml","VIRULYS Paste 30ml"}', 'Enthusiastic', 1, 'BARD Clever Fungus Dermasine 100ml', true, 'ORD-2026-0906-T2', 825, 'Second cycle call to present clinic testimonials from Dubai and review trial progress', '', 'Dr. Maria confirmed trial success on stubborn ringworm case. Placed initial booking of 10 Dermasine + 15 Virulys.', '', '2026-09-27', 'Review re-orders'),
('VIS-2026-0907-03', 'T2', 'RP0236', 'ALNOOR VETERINARY CLINIC', 'Ras al- Khaimah', '2026-09-07', 'Morning Follow-up (10:00 - 11:30)', 'Planned', 'Completed', 'Dr. Tariq Al-Nuaimi', 'Chief Vet Surgeon', '{"ASBRIP 150 ml","RENALOF 150 ml"}', 'Positive', 0, '', false, '', 0, 'Second cycle visit to review inpatient feline trial and present 150ml clinical surgery packs', '', 'Positive feedback on feline tolerance. Dr. Tariq preparing quarterly purchase requisition.', '', '2026-09-28', 'Collect purchase requisition'),
('VIS-2026-0907-04-UNP', 'T2', 'SC0215', 'AL SHAMS VETERINARY PHARMACY', 'Sharjah', '2026-09-07', 'Afternoon Spontaneous (14:30 - 15:30)', 'Unplanned', 'Completed', 'Dr. Bilal Qasim', 'Lead Pharmacist', '{"CARMINAL 30 ml","VIUSID 30 ml"}', 'Positive', 1, 'CARMINAL 30 ml', false, '', 0, 'Unplanned pharmacy stop while in Sharjah Rolla district', 'Spontaneous Nearby Drop-in', 'Presented Carminal anti-spasmodic veterinary portfolio. Doctor accepted brochure and product sample.', '', '2026-09-29', 'Check pharmacy prescription demand'),
('VIS-2026-0908-03', 'T2', 'JC0312', 'AJMAN PET HOSPITAL', 'Ajman', '2026-09-08', 'Morning (10:30 - 12:00)', 'Planned', 'Completed', 'Dr. Ziad Al-Khouly', 'Senior Vet Surgeon', '{"VIUSID 30 ml","ASBRIP 30 ml"}', 'Positive', 1, 'VIUSID 30 ml', false, '', 0, 'Detailed Viusid antioxidant and Asbrip oral suspension for kennel cough seasonal outbreak', '', 'Doctor interested in post-surgical recovery applications. Trial sample left.', '', '2026-09-09', 'Check unplanned follow-up on BARD Ear cleaner'),
('VIS-2026-0909-01', 'T1', 'DC0340', 'DR SAMIR VET CLINIC', 'Dubai', '2026-09-09', 'Morning Round (09:30 - 11:30)', 'Planned', 'Completed', 'Dr. Samir Al-Khatib', 'Lead Veterinarian & Director', '{"VIRULYS Paste 30ml","VIUSID 30 ml","RENALOF 30 ml"}', 'Enthusiastic', 2, 'VIRULYS Paste 30ml', true, 'ORD-2026-0901', 1953, 'VIRULYS launch detailing & clinical comparison with competitor lysine pastes', '', 'Dr. Samir trial was extremely positive. Booked 25 units Asbrip + 5 FOC, 10 Viusid + 2 FOC, and 20 Virulys + 4 FOC.', '', '2026-09-23', 'Review feline viral conjunctivitis case responses'),
('VIS-2026-0909-02', 'T1', 'DC0821', 'Petflix Veterinary Clinic LLC', 'Dubai', '2026-09-09', 'Afternoon Round (14:00 - 16:00)', 'Planned', 'Planned', 'Dr. Elena Rostova', 'Senior Vet Surgeon', '{"ASBRIP 150 ml","RENALOF 150 ml"}', 'Pending', 0, '', false, '', 0, 'Present 150ml clinical clinic packs for high-volume boarding dogs & post-op wards', '', '', '', NULL, ''),
('VIS-2026-0909-03-UNP', 'T1', 'DC0050', 'AL FALAH VETERINARY CLINIC', 'Dubai', '2026-09-09', 'Midday Spontaneous (12:30 - 13:30)', 'Unplanned', 'Completed', 'Dr. Tariq Mansoor', 'Clinic Director / Owner', '{"CARMINAL 30 ml","VIUSID 30 ml"}', 'Positive', 1, 'CARMINAL 30 ml', true, 'ORD-2026-0902', 644.7, 'Nearby opportunistic drop-in while in Deira area between scheduled clinic visits', 'Spontaneous Nearby Drop-in', 'Detailed Carminal activated formulation. Doctor placed order for 13 units Carminal + 2 FOC and 3 Viusid.', '', '2026-09-25', 'Check clinical improvement in canine gastritis cohort'),
('VIS-2026-0909-04', 'T2', 'JC0804', 'FLUFFY VETERINARY CLINIC FOR PETS', 'Ajman', '2026-09-09', 'Morning Round (10:00 - 11:30)', 'Planned', 'Completed', 'Dr. Nour Al-Hassan', 'Managing Director', '{"VIRULYS Paste 30ml","BARD Clever Fungus Dermasine 100ml"}', 'Enthusiastic', 2, 'BARD Clever Fungus Dermasine 100ml', true, 'ORD-2026-0905', 1664.25, 'Review Virulys monthly movement and introduce BARD biological antifungal protocol', '', 'Very strong reception. Booked 25 units Virulys + 5 FOC and 10 units Dermasine 100ml + 2 FOC.', '', '2026-09-23', 'Deliver Arabic patient client guides'),
('VIS-2026-0909-05-UNP', 'T2', 'JC0312', 'AJMAN PET HOSPITAL', 'Ajman', '2026-09-09', 'Afternoon Spontaneous (14:30 - 15:30)', 'Unplanned', 'Completed', 'Dr. Ziad Al-Khouly', 'Senior Vet Surgeon', '{"BARD Pythie Pets Ear cleaner","ASBRIP 30 ml"}', 'Positive', 1, 'BARD Pythie Pets Ear cleaner', false, '', 0, 'Unplanned drop-in across the street after leaving Fluffy Vet Clinic', 'Spontaneous Nearby Drop-in', 'Met Dr. Ziad between surgeries. Introduced BARD Ear Cleaner bio-action. Doctor accepted trial sample.', '', '2026-09-24', 'Check otitis externa patient results'),
('VIS-2026-0910-01', 'T1', 'DC0678', 'PRIME PAWS VET CLINIC', 'Dubai', '2026-09-10', 'Morning Round (09:30 - 11:00)', 'Planned', 'Completed', 'Dr. Ahmed El-Sayed', 'Lead Veterinarian', '{"ASBRIP 30 ml","VIRULYS Paste 30ml"}', 'Enthusiastic', 2, 'ASBRIP 30 ml', true, 'ORD-2026-0910-01', 1420, 'Scheduled seasonal detailing for respiratory and immune therapy', '', 'Dr. Ahmed confirmed high feline respiratory caseload. Booked 20 Asbrip + 4 FOC and 15 Virulys.', '', '2026-09-24', 'Check clinic stock movement'),
('VIS-2026-0910-02', 'T1', 'DC0277', 'ANIMAL SPECIALIST CLINIC', 'Dubai', '2026-09-10', 'Midday Round (11:30 - 13:00)', 'Planned', 'Completed', 'Dr. Sarah Al-Nuaimi', 'Managing Specialist', '{"RENALOF 150 ml","CARMINAL 30 ml"}', 'Positive', 1, 'RENALOF 150 ml', false, '', 0, 'Detailing molecular activation therapy for chronic kidney and gastro cases', '', 'Presented clinical documentation on calcium oxalate dissolution. Doctor evaluating with surgery ward.', '', '2026-09-25', 'Review ward trial outcomes'),
('VIS-2026-0910-03', 'T1', 'DC0339', 'DOCTOR DOLITTLE VETERINARY CLINIC', 'Dubai', '2026-09-10', 'Afternoon Round (15:00 - 16:30)', 'Planned', 'Planned', 'Dr. John Henderson', 'Director & Chief Surgeon', '{"VIUSID 30 ml","BARD Clever Fungus Ecosin 5x3g"}', 'Pending', 0, '', false, '', 0, 'Scheduled quarterly review and fungal management presentation', '', 'Doctor in emergency surgery; visit pending execution / rescheduled.', '', NULL, ''),
('VIS-2026-0910-04-UNP', 'T1', 'DC0618', 'PERFECT DOSE VET CLINIC', 'Dubai', '2026-09-10', 'Late Afternoon Spontaneous (16:45 - 17:30)', 'Unplanned', 'Completed', 'Dr. Layla Mansour', 'Consulting Veterinarian', '{"VIUSID DETOX 30 ml","VIRULYS Paste 30ml"}', 'Positive', 1, 'VIUSID DETOX 30 ml', true, 'ORD-2026-0910-02', 630, 'Spontaneous nearby visit following Doctor Dolittle surgery delay', 'Spontaneous Nearby Drop-in', 'Detailed Viusid Detox for canine hepatic recovery. Booked 12 bottles + 2 FOC.', '', '2026-09-28', 'Review patient liver profile results'),
('VIS-2026-0910-05', 'T2', 'SC0933', 'PETS VETERINARY CLINIC', 'Sharjah', '2026-09-10', 'Morning (10:00 - 11:30)', 'Planned', 'Completed', 'Dr. Samah Mansi', 'Clinical Director', '{"BARD Pythie Pets Ear cleaner","VIUSID 30 ml"}', 'Enthusiastic', 1, 'BARD Pythie Pets Ear cleaner', true, 'ORD-2026-0910-03', 915, 'Follow-up on juvenile animal immune therapy and biological hygiene', '', 'Doctor placed repeat stocking order for 15 Viusid + 3 FOC and 8 BARD Ear Cleaner.', '', '2026-09-26', 'Routine stock check'),
('VIS-2026-0910-06', 'T2', 'FC0852', 'LOVELY PET CLINIC', 'Sharjah', '2026-09-10', 'Afternoon (14:30 - 16:00)', 'Planned', 'Planned', 'Dr. Maria Santos', 'Senior Vet Surgeon', '{"CARMINAL 30 ml","ASBRIP 150 ml"}', 'Pending', 0, '', false, '', 0, 'Scheduled cycle visit to evaluate surgical pack adoption', '', 'Clinic closed for afternoon disinfection; call unvisited and pending.', '', NULL, ''),
('VIS-2026-0910-07-UNP', 'T2', 'SC0215', 'AL SHAMS VETERINARY PHARMACY', 'Sharjah', '2026-09-10', 'Midday Spontaneous (12:30 - 13:30)', 'Unplanned', 'Completed', 'Dr. Bilal Qasim', 'Lead Pharmacist', '{"VIRULYS Paste 30ml"}', 'Positive', 1, 'VIRULYS Paste 30ml', false, '', 0, 'Spontaneous pharmacy call while in Rolla district', 'Spontaneous Nearby Drop-in', 'Delivered sample and point-of-sale display materials for Virulys.', '', '2026-09-27', 'Follow-up on OTC prescription sales'),
('VIS-2026-0911-01', 'T1', 'AC0835', 'PETS REPUBLIC VETERINARY CLINIC', 'Abu Dhabi', '2026-09-11', 'Morning Round (10:00 - 11:30)', 'Planned', 'Completed', 'Dr. Tarek Al-Hajj', 'Director & Lead Surgeon', '{"VIRULYS Paste 30ml","VIUSID 30 ml"}', 'Enthusiastic', 2, 'VIRULYS Paste 30ml', true, 'ORD-2026-0911-01', 1140, 'Present feline herpes antiviral protocol and molecular activation benefits', '', 'Strong endorsement. Booked initial clinic order of 20 Virulys + 4 FOC and 10 Viusid 30ml.', '', '2026-09-25', 'Review inpatient response'),
('VIS-2026-0911-02', 'T1', 'AC0721', 'TOP CARE VETERINARY CLINIC', 'Abu Dhabi', '2026-09-11', 'Afternoon Round (14:30 - 16:00)', 'Planned', 'Planned', 'Dr. Mona Al-Hosani', 'Senior Vet Surgeon', '{"ASBRIP 150 ml","RENALOF 30 ml"}', 'Pending', 0, '', false, '', 0, 'Scheduled presentation on veterinary oxalate urolithiasis dissolution', '', 'Pending scheduled execution for afternoon session.', '', NULL, ''),
('VIS-2026-0911-03-UNP', 'T1', 'AP0892', 'EUROGULF ANIMAL AND BIRDS FOOD TRADING', 'Abu Dhabi', '2026-09-11', 'Midday Spontaneous (12:15 - 13:15)', 'Unplanned', 'Completed', 'Dr. Gamal Radwan', 'Technical Consultant', '{"CARMINAL 30 ml","VUISID AVIS 30 ml"}', 'Positive', 1, 'CARMINAL 30 ml', true, 'ORD-2026-0911-02', 760, 'Spontaneous visit while in Abu Dhabi Mina port area', 'Spontaneous Nearby Drop-in', 'Introduced avian immunity and companion animal GI line. Order booked for 20 units Carminal.', '', '2026-09-28', 'Falcon and avian line expansion review'),
('VIS-2026-0911-04', 'T2', 'JC0312', 'AJMAN PET HOSPITAL', 'Ajman', '2026-09-11', 'Morning Round (10:00 - 11:30)', 'Planned', 'Completed', 'Dr. Ziad Al-Khouly', 'Senior Vet Surgeon', '{"VIUSID 30 ml","ASBRIP 30 ml"}', 'Positive', 1, 'VIUSID 30 ml', true, 'ORD-2026-0911-03', 880, 'Scheduled cycle call on post-surgical immune recovery', '', 'Doctor placed repeat order for 15 Viusid + 3 FOC and 8 Asbrip 30ml.', '', '2026-09-29', 'Surgery ward stock check'),
('VIS-2026-0911-05', 'T2', 'JC0804', 'FLUFFY VETERINARY CLINIC FOR PETS', 'Ajman', '2026-09-11', 'Afternoon Round (15:00 - 16:30)', 'Planned', 'Planned', 'Dr. Nour Al-Hassan', 'Managing Director', '{"VIRULYS Paste 30ml","BARD Pythie Pets vet ointment 50ml"}', 'Pending', 0, '', false, '', 0, 'Scheduled afternoon review of shelter rescue cats and dermatological ointment trials', '', 'Scheduled for afternoon session; pending execution.', '', NULL, ''),
('VIS-2026-0911-06-UNP', 'T2', 'RP0896', 'SHAMAL VETERINARY PHARMACY', 'Ras al- Khaimah', '2026-09-11', 'Midday Spontaneous (12:45 - 13:45)', 'Unplanned', 'Completed', 'Dr. Faisal Al-Zahrani', 'Pharmacy Manager', '{"BARD Pythie Pets Ear cleaner","CARMINAL 30 ml"}', 'Positive', 1, 'BARD Pythie Pets Ear cleaner', false, '', 0, 'Spontaneous drop-in while driving along RAK highway', 'Spontaneous Nearby Drop-in', 'Delivered brochures and sample. Pharmacist agreed to recommend upon customer ear hygiene inquiry.', '', '2026-09-30', 'Check OTC customer uptake')
ON CONFLICT (id) DO NOTHING;

-- 5.7 SEED ORDERS & ORDER ITEMS
INSERT INTO orders (invoice_number, date, rep_id, rep_name, client_code, client_name, location, territory, approval_status, approved_by, approved_at, payment_terms, delivery_urgency, subtotal_exc_vat, vat_amount, total_inc_vat) VALUES
('ORD-2026-0901', '2026-09-09', 'T1', 'Shaimaa', 'DC0340', 'DR SAMIR VET CLINIC', 'Dubai', 'T1', 'Approved', 'Dr. Sameh Ageez (Senior Sales Manager)', '2026-09-09T10:15:00Z', '30 Days Credit', 'Normal (48h)', 1860, 93, 1953),
('ORD-2026-0902', '2026-09-09', 'T1', 'Shaimaa', 'DC0050', 'AL FALAH VETERINARY CLINIC', 'Dubai', 'T1', 'Pending', NULL, NULL, 'Cash on Delivery (COD)', 'Express (24h)', 614, 30.7, 644.7),
('ORD-2026-0905', '2026-09-09', 'T2', 'Marsel', 'JC0804', 'FLUFFY VETERINARY CLINIC FOR PETS', 'Ajman', 'T2', 'Pending', NULL, NULL, '30 Days Credit', 'Normal (48h)', 1585, 79.25, 1664.25),
('ORD-2026-0910-01', '2026-09-10', 'T1', 'Shaimaa', 'DC0678', 'PRIME PAWS VET CLINIC', 'Dubai', 'T1', 'Approved', 'Dr. Sameh Ageez', '2026-09-10T11:45:00Z', '30 Days Credit', 'Normal (48h)', 1135, 56.75, 1420),
('ORD-2026-0910-02', '2026-09-10', 'T1', 'Shaimaa', 'DC0618', 'PERFECT DOSE VET CLINIC', 'Dubai', 'T1', 'Pending', NULL, NULL, 'Cash on Delivery (COD)', 'Express (24h)', 480, 24, 630),
('ORD-2026-0910-03', '2026-09-10', 'T2', 'Marsel', 'SC0933', 'PETS VETERINARY CLINIC', 'Sharjah', 'T2', 'Approved', 'Dr. Sameh Ageez', '2026-09-10T12:30:00Z', '30 Days Credit', 'Normal (48h)', 1064, 53.2, 915),
('ORD-2026-0911-01', '2026-09-11', 'T1', 'Shaimaa', 'AC0835', 'PETS REPUBLIC VETERINARY CLINIC', 'Abu Dhabi', 'T1', 'Pending', NULL, NULL, '30 Days Credit', 'Normal (48h)', 1060, 53, 1140),
('ORD-2026-0911-02', '2026-09-11', 'T1', 'Shaimaa', 'AP0892', 'EUROGULF ANIMAL AND BIRDS FOOD TRADING', 'Abu Dhabi', 'T1', 'Pending', NULL, NULL, 'Cash on Delivery (COD)', 'Express (24h)', 760, 38, 760),
('ORD-2026-0911-03', '2026-09-11', 'T2', 'Marsel', 'JC0312', 'AJMAN PET HOSPITAL', 'Ajman', 'T2', 'Approved', 'Dr. Sameh Ageez', '2026-09-11T12:00:00Z', '30 Days Credit', 'Normal (48h)', 856, 42.8, 880)
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO order_items (order_number, product_code, product_name, unit_price, sales_qty, foc_qty, line_total) VALUES
('ORD-2026-0901', 'AS030', 'ASBRIP 30 ml', 32, 25, 5, 800),
('ORD-2026-0901', 'VP030', 'VIUSID 30 ml', 40, 10, 2, 400),
('ORD-2026-0901', 'VR030', 'VIRULYS Paste 30ml', 33, 20, 4, 660),
('ORD-2026-0902', 'CA030', 'CARMINAL 30 ml', 38, 13, 2, 494),
('ORD-2026-0902', 'VP030', 'VIUSID 30 ml', 40, 3, 0, 120),
('ORD-2026-0905', 'VR030', 'VIRULYS Paste 30ml', 33, 25, 5, 825),
('ORD-2026-0905', 'BD0100', 'BARD Clever Fungus Dermasine 100ml', 76, 10, 2, 760),
('ORD-2026-0910-01', 'AS030', 'ASBRIP 30 ml', 32, 20, 4, 640),
('ORD-2026-0910-01', 'VR030', 'VIRULYS Paste 30ml', 33, 15, 3, 495),
('ORD-2026-0910-02', 'VD030', 'VIUSID DETOX 30 ml', 40, 12, 2, 480),
('ORD-2026-0910-03', 'VP030', 'VIUSID 30 ml', 40, 15, 3, 600),
('ORD-2026-0910-03', 'BPE00', 'BARD Pythie Pets Ear cleaner', 58, 8, 1, 464),
('ORD-2026-0911-01', 'VR030', 'VIRULYS Paste 30ml', 33, 20, 4, 660),
('ORD-2026-0911-01', 'VP030', 'VIUSID 30 ml', 40, 10, 2, 400),
('ORD-2026-0911-02', 'CA030', 'CARMINAL 30 ml', 38, 20, 3, 760),
('ORD-2026-0911-03', 'VP030', 'VIUSID 30 ml', 40, 15, 3, 600),
('ORD-2026-0911-03', 'AS030', 'ASBRIP 30 ml', 32, 8, 1, 256);

-- 5.8 SEED NOTIFICATIONS
INSERT INTO notifications (id, type, title, order_number, rep_id, rep_name, client_code, client_name, location, total_exc_vat, total_inc_vat, timestamp, read, approval_status, items_summary, payment_terms, delivery_urgency, items_json) VALUES
('NOTIF-001', 'ORDER_SUBMITTED', 'New Field Sales Order Submitted', 'ORD-2026-0902', 'T1', 'Shaimaa', 'DC0050', 'AL FALAH VETERINARY CLINIC', 'Dubai', 614, 644.7, '2026-09-09T13:35:00Z', false, 'Pending', 'CARMINAL 30 ml (13 Sls + 2 FOC), VIUSID 30 ml (3 Sls)', 'Cash on Delivery (COD)', 'Express (24h)', '[{"productCode":"CA030","productName":"CARMINAL 30 ml","unitPrice":38,"salesQty":13,"focQty":2,"total":494},{"productCode":"VP030","productName":"VIUSID 30 ml","unitPrice":40,"salesQty":3,"focQty":0,"total":120}]'::jsonb),
('NOTIF-002', 'ORDER_SUBMITTED', 'New Field Sales Order Submitted', 'ORD-2026-0905', 'T2', 'Marsel', 'JC0804', 'FLUFFY VETERINARY CLINIC FOR PETS', 'Ajman', 1585, 1664.25, '2026-09-09T11:40:00Z', false, 'Pending', 'VIRULYS Paste 30ml (25 Sls + 5 FOC), BARD Clever Fungus Dermasine 100ml (10 Sls + 2 FOC)', '30 Days Credit', 'Normal (48h)', '[{"productCode":"VR030","productName":"VIRULYS Paste 30ml","unitPrice":33,"salesQty":25,"focQty":5,"total":825},{"productCode":"BD0100","productName":"BARD Clever Fungus Dermasine 100ml","unitPrice":76,"salesQty":10,"focQty":2,"total":760}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5.9 SEED MANAGER SETTINGS
INSERT INTO manager_settings (id, manager_emails, sound_alert, toast_alert) VALUES
('default', 'sameh.ageez@conceptors.ae, gm@conceptors.ae', true, true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE: All tables, views, RLS policies & master seed data ready.
-- =============================================================================



