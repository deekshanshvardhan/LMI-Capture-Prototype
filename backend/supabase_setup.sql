-- Create the lmi_captures table for storing LMI capture data
CREATE TABLE IF NOT EXISTS lmi_captures (
    id BIGSERIAL PRIMARY KEY,
    bin_id VARCHAR(50) NOT NULL,
    scan_value VARCHAR(100) NOT NULL,
    scan_type VARCHAR(10) NOT NULL,
    fsn VARCHAR(50),
    product_name VARCHAR(255),
    offer VARCHAR(100),
    mfg_date DATE,
    expiry_date DATE,
    shelf_life_value INTEGER,
    shelf_life_uom VARCHAR(10),
    shelf_life_days INTEGER,
    mrp DECIMAL(10, 2),
    month_year_mode BOOLEAN DEFAULT FALSE,
    operator_id VARCHAR(50) DEFAULT 'OP-001',
    time_taken_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lmi_captures_created_at ON lmi_captures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lmi_captures_bin_id ON lmi_captures(bin_id);
CREATE INDEX IF NOT EXISTS idx_lmi_captures_scan_value ON lmi_captures(scan_value);

-- Enable Row Level Security (optional - disabled for prototype)
-- ALTER TABLE lmi_captures ENABLE ROW LEVEL SECURITY;

-- Grant access to service role (already has full access)
COMMENT ON TABLE lmi_captures IS 'Stores LMI (Lot Management Information) captures from prototype testing';
