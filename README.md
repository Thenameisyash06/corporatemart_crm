# CorporateMart CRM — Enterprise Desktop Edition

A multi-department desktop CRM application built for corporate compliance and business setup services, strictly enforcing a **9-stage verification & execution lifecycle**.

---

## 🚀 Quick Start Guide

### 1. Start the System (Server + Client)
Open a terminal in the root folder and run:
```powershell
npm run dev
```
- **Backend API:** `http://localhost:4000`
- **Web / Desktop Client:** `http://localhost:5173`

### 2. Launch Native Desktop App (Electron)
In a second terminal window (or with dev server running):
```powershell
npm run desktop
```
This opens the native Windows desktop application window.

---

## 🏢 Department Roles & Test Accounts

You can switch between any department with one click using the **"Test as" bar** in the top navigation:

| Department | Email | Default Password | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **BDM (Sales)** | `bdm@corporatemart.com` | `bdm123` | Create deal, attach clients & directors, upload KYC & payment proof, submit to Accounts. |
| **Accounts** | `accounts@corporatemart.com` | `accounts123` | Match bank credit, verify total vs received amount, approve or reject back to BDM. |
| **Legal** | `legal@corporatemart.com` | `legal123` | Scrutinize documents, check name consistency, clear compliance or raise deficiencies. |
| **Operations** | `ops@corporatemart.com` | `ops123` | Process filings (MCA/GST), track SRN/Govt reference numbers, upload final certificates. |
| **RM (Success)** | `rm@corporatemart.com` | `rm123` | Confirm client handover, schedule recurring annual renewals, close workflow. |
| **Admin** | `admin@corporatemart.com` | `admin123` | Master control over all departments, audit trails, and financial analytics. |

---

## 🔄 Deal & Service Operational Workflow

1. **01. Deal Creation & Documents:** BDM enters client, directors, services, payments, and KYC documents, directly routing file to Accounts verification.
2. **04. Accounts Verification:** Accounts verifies the bank receipt. If approved, file moves to Legal. If discrepancy found, file returns to BDM with a mandatory note.
5. **05. Legal Verification:** Legal verifies KYC and corporate documentation. Cleared files move to Operations; deficiencies return to BDM/Client.
6. **06. Operations Processing:** Operations initiates filing on government portals, tracks application/SRN numbers, and logs milestone status.
7. **07. Service Completed:** Operations confirms service outcome and uploads the final deliverable certificate.
8. **08. Final Documents Delivered:** Deliverables shared with client. Part-payment safeguard prevents dispatch if balance is pending.
9. **09. RM Handover & Closure:** Relationship Manager confirms receipt, sets renewal reminders (ROC, GST, Trademark), and closes the CRM workflow.

---

## 🗄️ Architecture & Tech Stack

- **Desktop Shell:** Electron
- **Frontend:** React 19, Tailwind CSS, Lucide Icons, Vite
- **Backend API:** Node.js, Express, REST API
- **Database:** PostgreSQL (Hosted on Supabase) via Prisma ORM
- **Object Storage:** Supabase Storage (Private bucket `crm-documents` with temporary signed preview URLs)
- **Security:** JWT authentication, Role-Based Access Control (RBAC), and immutable audit logs
