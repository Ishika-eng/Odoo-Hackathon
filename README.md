# Reimbursement Management System

A production-ready, multi-company expense reimbursement platform with multi-level approval workflows.

## Architecture

```
├── database/          PostgreSQL schema with ENUMs, triggers, indexes
├── backend/           Node.js + Express REST API
│   └── src/
│       ├── config/    Database connection
│       ├── controllers/  Route handlers
│       ├── middleware/   JWT auth & role-based authorization
│       ├── routes/       API route definitions
│       └── services/     Workflow engine & audit logging
└── frontend/          React SPA
    └── src/
        ├── components/  Navbar, ProtectedRoute
        ├── context/     AuthContext (JWT management)
        ├── pages/       Login, Register, Dashboard, Approvals, Admin
        └── services/    Axios API client
```

## Setup

### 1. Database
```bash
createdb reimbursement_db
psql -d reimbursement_db -f database/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
# Edit .env with your DB credentials and JWT_SECRET
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

## Features

- **Multi-company** — each company gets isolated data, workflows, categories
- **Role-based access** — ADMIN, MANAGER, EMPLOYEE with route protection
- **Expense submission** — with categories, amounts, currencies
- **Multi-step workflow engine** — configurable approval chains
- **Approval rule engine** — PERCENTAGE, SPECIFIC, HYBRID rule types
- **Audit logging** — every action tracked with user, entity, timestamp
- **JWT authentication** — secure token-based auth with bcrypt password hashing

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register company + admin |
| POST | /api/auth/login | No | Login, get JWT |
| POST | /api/expenses | Yes | Submit expense |
| GET | /api/expenses/mine | Yes | My expenses |
| GET | /api/expenses/all | Admin | All company expenses |
| GET | /api/approvals/pending | Yes | Pending approvals for user |
| POST | /api/approvals/:id/act | Yes | Approve/Reject |
| GET | /api/workflows | Yes | List workflows |
| PUT | /api/workflows/:id | Admin | Update workflow |
| POST | /api/users | Admin | Create user |
| GET | /api/users | Yes | List company users |
| GET | /api/categories | Yes | List categories |
| GET | /api/audit | Admin | Audit logs |

## Workflow Flow

1. Employee submits expense → auto-assigned to default workflow
2. Step 1 approvals created (Manager)
3. Manager approves → rule engine evaluates → advances to Step 2
4. Step 2 approvals created (Admin/Finance)
5. Final approval → expense marked APPROVED
6. Any rejection → immediately marks expense REJECTED
