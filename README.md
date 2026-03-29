# 💸 Reimbursement Management System

## 🚀 Overview
This project is a **Reimbursement Management System** designed to streamline expense submission, approval workflows, and reimbursement processes within organizations.

It eliminates manual processes and introduces:
- Automation ⚙️  
- Transparency 👁️  
- Flexibility 🔁  

---

## 🎯 Features

### 🔐 Authentication & User Management
- Role-based access: Admin, Manager, Employee
- Secure login/signup using JWT
- Admin can create users and assign roles
- Manager hierarchy (employee → manager mapping)

---

### 💸 Expense Submission
- Employees can:
  - Submit expenses (amount, category, description, date)
  - Upload receipts
  - View status (pending, approved, rejected)

---

### 🔁 Approval Workflow
- Multi-level approval system
- Sequential approval flow
- Configurable workflow steps

---

### 🧠 Rule Engine
- Percentage-based approvals
- Specific approver override (e.g., CFO)
- Hybrid rules (AND / OR logic)

---

### 🌍 Currency Handling
- Multi-currency support
- Conversion to company default currency

---

### 🧾 OCR Integration (Optional)
- Extract data from receipts:
  - Amount
  - Date
  - Vendor

---

## 🧩 Tech Stack

### Frontend
- React.js
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL

### ORM
- Prisma

### Authentication
- JWT (JSON Web Tokens)

---

## 🌍 External APIs

### 🌎 Country & Currency API
- Endpoint: [Rest Countries API](https://restcountries.com/v3.1/all?fields=name,currencies)
- Purpose:
- Fetch country names and currencies
- Set default company currency

---

### 💱 Currency Conversion API
- Endpoint: [Exchange Rate API](https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY})
- Purpose:
- Convert expense currency → company currency

---

## 🏗️ System Architecture
React (Frontend)
↓
Node.js + Express (Backend)
↓
Prisma ORM
↓
PostgreSQL Database
↓
External APIs (Currency + OCR)

---

## 🗄️ Database Schema

### 🏢 Companies
- id (PK)
- name
- country
- currency_code
- created_at

---

### 👥 Users
- id (PK)
- company_id (FK)
- name
- email (UNIQUE)
- password
- role (ADMIN, MANAGER, EMPLOYEE)
- manager_id (self-reference)
- created_at

---

### 💰 Expenses
- id (PK)
- user_id (FK)
- company_id (FK)
- amount
- currency
- category
- description
- expense_date
- status (PENDING, APPROVED, REJECTED)
- created_at

---

### 🧾 Expense Items
- id (PK)
- expense_id (FK)
- item_name
- amount

---

### 🔄 Approval Workflows
- id (PK)
- company_id (FK)
- step_order
- role
- is_mandatory

---

### ✅ Expense Approvals
- id (PK)
- expense_id (FK)
- approver_id (FK)
- step_order
- status (PENDING, APPROVED, REJECTED)
- comment
- action_date

---

### 🧠 Approval Rules
- id (PK)
- company_id (FK)
- rule_type (PERCENTAGE, SPECIFIC, HYBRID)
- percentage
- specific_approver_id (FK)
- created_at

---

### 🌍 Currencies
- code (PK)
- name
- symbol

---

### 📷 Receipts (OCR)
- id (PK)
- expense_id (FK)
- file_url
- extracted_data (JSONB)

---

### 📊 Audit Logs
- id (PK)
- user_id
- action
- timestamp

---

## 🔁 Workflow Logic

1. Employee submits expense  
2. Workflow steps are assigned  
3. Approvers act sequentially  
4. Rule engine evaluates conditions  
5. Final status is updated  

---

## 🧠 Rule Engine Logic

### Percentage Rule
- Approved if required % approvals are met

### Specific Approver Rule
- Approved if a specific user approves

### Hybrid Rule
- Combination of percentage + specific (AND / OR)

---

## 👥 User Roles

### Admin
- Manage users
- Configure workflows
- Define rules
- View all expenses

---

### Manager
- Approve/reject expenses
- View team expenses

---

### Employee
- Submit expenses
- Track approval status

---

## 📌 API Endpoints (Sample)

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`

---

### Expenses
- `POST /api/expenses`
- `GET /api/expenses`

---

### Approvals
- `POST /api/approvals/:id/action`

---

### Admin
- `POST /api/users`
- `POST /api/workflows`
- `POST /api/rules`

---

## 🚀 Future Enhancements
- Notification system 🔔  
- Mobile application 📱  
- Analytics dashboard 📊  

---

## 🎯 Conclusion

This system provides a scalable and flexible solution for managing reimbursements with automated workflows, intelligent rule processing, and modern full-stack architecture.
