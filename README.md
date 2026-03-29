# 💸 Reimbursement Management System

## 🚀 Overview
A production-ready, multi-company expense reimbursement platform designed to streamline expense submission, approval workflows, and reimbursement processes within organizations.

It eliminates manual processes and introduces:
- **Automation** ⚙️ (OCR Integration)
- **Transparency** 👁️ (Audit Logs)
- **Flexibility** 🔁 (Configurable Workflows)

---

## 🏗️ System Architecture

```
├── database/          PostgreSQL schema with ENUMs, triggers, indexes
├── backend/           Node.js + Express REST API (using pg driver)
│   └── src/
│       ├── config/    Database connection
│       ├── controllers/  Route handlers
│       ├── middleware/   JWT auth & role-based authorization
│       ├── routes/       API route definitions
│       └── services/     Workflow engine & audit logging
└── frontend/          React SPA (Vite + Tailwind CSS)
    └── src/
        ├── components/  Navbar, ProtectedRoute
        ├── context/     AuthContext (JWT management)
        ├── pages/       Login, Register, Dashboard, Approvals, Admin
        └── services/    Axios API client
```

---

## 🎯 Features

### 🔐 Authentication & User Management
- Role-based access: **Admin, Manager, Employee**
- Secure login/signup using JWT
- Admin can create users and assign roles (Strict: 1 Admin per company)

### 💸 Expense Submission & OCR
- Employees can submit expenses with title, category, description, date
- **OCR Integration** (Tesseract.js) extracts:
  - Merchant/Vendor 🏪
  - Date 📅
  - Amount & Currency ($ € £ ₹) 💰
- **Itemized Breakdown**: Auto-populate editable line items from receipt

### 🔁 Approval Workflow
- Multi-level sequential approval system
- **Admin Override**: Administrators can forcefully approve or reject any expense
- Visual indicator for overridden expenses

### 📊 Monitoring & Audit
- **Audit Logs**: Every action tracked with user, entity, and timestamp
- **Dashboards**: Statistics for total, pending, approved, and rejected expenses

---

## 🛠️ Setup Instructions

### 1. Database
```bash
createdb reimbursement_db
psql -d reimbursement_db -f database/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
# Configure .env with DB credentials, JWT_SECRET, and PORT (default 5000)
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🧩 Tech Stack

- **Frontend**: React.js, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (pg driver)
- **OCR**: Tesseract.js
- **Auth**: JWT (bcryptjs for hashing)

---

## 📌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register company + admin |
| POST | /api/auth/login | No | Login, get JWT |
| POST | /api/expenses | Yes | Submit expense |
| POST | /api/ocr/extract | Yes | Extract receipt data |
| GET | /api/approvals/pending| Yes | Pending approvals for user |
| POST | /api/approvals/:id | Yes | Approve/Reject |
| PUT | /api/approvals/:id/override | Admin | Force action (Overide) |
| GET | /api/audit | Admin | Audit logs |

---

## 🚀 Future Enhancements
- Notification system (Email/Slack) 🔔  
- Mobile application (React Native) 📱  
- Advanced Analytics Dashboard 📊  

---

## 🎯 Conclusion
This system provides a scalable solution for managing reimbursements with automated workflows, intelligent OCR processing, and robust administrative control.


## 🎯 Conclusion

This system provides a scalable and flexible solution for managing reimbursements with automated workflows, intelligent rule processing, and modern full-stack architecture.
>>>>>>> d626948ad3df460351c9c44ec28bb96aadd9af4f
