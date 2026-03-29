-- ============================================
-- Reimbursement Management System - Schema
-- ============================================

-- ENUMs
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
CREATE TYPE expense_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE rule_type AS ENUM ('PERCENTAGE', 'SPECIFIC', 'HYBRID');
CREATE TYPE audit_action AS ENUM ('CREATE_EXPENSE', 'APPROVE', 'REJECT', 'CREATE_USER', 'UPDATE_WORKFLOW');

-- Companies
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'EMPLOYEE',
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_manager ON users(manager_id);

-- Expense Categories
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_categories_company ON expense_categories(company_id);

-- Expenses
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    receipt_url TEXT,
    status expense_status DEFAULT 'PENDING',
    submitted_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Workflows
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_workflows_company ON workflows(company_id);

-- Workflow Steps
CREATE TABLE workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    approver_role user_role NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(workflow_id, step_order)
);
CREATE INDEX idx_steps_workflow ON workflow_steps(workflow_id);

-- Expense Workflow (links expense to workflow instance)
CREATE TABLE expense_workflow (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_ew_expense ON expense_workflow(expense_id);

-- Approvals
CREATE TABLE approvals (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    workflow_step_id INTEGER NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status approval_status DEFAULT 'PENDING',
    comments TEXT,
    acted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_approvals_expense ON approvals(expense_id);
CREATE INDEX idx_approvals_approver ON approvals(approver_id);
CREATE INDEX idx_approvals_status ON approvals(status);

-- Approval Rules
CREATE TABLE approval_rules (
    id SERIAL PRIMARY KEY,
    workflow_step_id INTEGER NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    rule_type rule_type NOT NULL DEFAULT 'PERCENTAGE',
    percentage_required DECIMAL(5, 2) CHECK (percentage_required >= 0 AND percentage_required <= 100),
    specific_approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_rules_step ON approval_rules(workflow_step_id);

-- Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_company ON audit_logs(company_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Seed default workflow for new companies (trigger)
CREATE OR REPLACE FUNCTION create_default_workflow()
RETURNS TRIGGER AS $$
DECLARE
    wf_id INTEGER;
BEGIN
    INSERT INTO workflows (company_id, name, is_default)
    VALUES (NEW.id, 'Default Approval Workflow', TRUE)
    RETURNING id INTO wf_id;

    INSERT INTO workflow_steps (workflow_id, step_order, approver_role, step_name)
    VALUES
        (wf_id, 1, 'MANAGER', 'Manager Approval'),
        (wf_id, 2, 'ADMIN', 'Admin/Finance Approval');

    -- Default rules: 100% approval needed
    INSERT INTO approval_rules (workflow_step_id, rule_type, percentage_required)
    SELECT ws.id, 'PERCENTAGE', 100
    FROM workflow_steps ws WHERE ws.workflow_id = wf_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_default_workflow
    AFTER INSERT ON companies
    FOR EACH ROW EXECUTE FUNCTION create_default_workflow();

-- Default categories trigger
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO expense_categories (company_id, name, description)
    VALUES
        (NEW.id, 'Travel', 'Travel and transportation expenses'),
        (NEW.id, 'Meals', 'Food and dining expenses'),
        (NEW.id, 'Office Supplies', 'Office equipment and supplies'),
        (NEW.id, 'Software', 'Software licenses and subscriptions'),
        (NEW.id, 'Other', 'Miscellaneous expenses');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_default_categories
    AFTER INSERT ON companies
    FOR EACH ROW EXECUTE FUNCTION create_default_categories();
