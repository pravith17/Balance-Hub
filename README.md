# BalanceHub

BalanceHub is a full-stack personal lending and repayment tracker for friends, family, and trusted contacts. It helps users record who gave or took money, confirm or dispute loan entries, track repayments with proof uploads, view balances by contact, and export account statements.

The project is built as a Node.js/Express API with MongoDB persistence and a static HTML/CSS/JavaScript frontend. The default deployment pattern serves the frontend on Vercel and the backend API on Render, with Vercel rewrites proxying `/api` and `/uploads` requests to the Render service.

---

## Table of Contents

- [Core Features](#core-features)
- [Application Functionality](#application-functionality)
- [User Flows](#user-flows)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [How the Application Works](#how-the-application-works)
- [API Overview](#api-overview)
- [Data Models](#data-models)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Known Operational Notes](#known-operational-notes)

---

## Core Features

### Account and Authentication

- User registration with first name, middle name, last name, email, phone number, date of birth, username, and password.
- Email OTP verification for new accounts.
- Login with email or phone number plus password.
- JWT-based authenticated sessions.
- Forgot-password flow with email OTP and new password submission.
- Password hashing with `bcrypt`.
- Audit logging for key authentication actions.

### Lending and Borrowing Records

- Create a loan entry as either:
  - **Lent**: the current user lent money to another user/contact.
  - **Borrowed**: the current user borrowed money from another user/contact.
- Prevents a user from creating a loan with themselves.
- Supports amount, description, and tags.
- Every new loan starts as `UNCONFIRMED` until the other party confirms it.
- The other party can confirm or dispute a loan.
- Confirmed loans contribute to live balance calculations.

### Repayment Tracking

- Create repayment records against confirmed parent loans.
- Supports partial repayments.
- Prevents repayment amounts from exceeding the remaining balance, including already pending repayments.
- Allows repayment proof uploads as image or PDF files.
- Repayments start as `UNCONFIRMED` and require confirmation by the other party.
- Automatically marks a parent loan as `SETTLED` once confirmed repayments cover the full amount.

### Dashboard and Analytics

- Dashboard totals for:
  - Total Given
  - Total Taken
  - Pending Given
  - Pending Taken
- Given-vs-taken chart visualization.
- Recent activity list.
- People/contact cards with net balances.
- Contact-level balance summaries.

### Contact and People Management

- Search users by username, phone number, or first name.
- Add external contacts who are not yet registered users.
- External contacts can later register using the same phone number and become full users.
- View people with whom the user has transactions and their net balance.

### Transaction History and Chat-Style View

- Transaction table listing loans and repayments involving the current user.
- Status labels for unconfirmed, confirmed, disputed, and settled transactions.
- Contact-specific chat/history view showing transaction activity between two users.
- Visual direction indicators for sent/received loan and repayment activity.

### Statements and Exporting

- Statements view for transaction history.
- Filter statements by month.
- Filter statements by status.
- Export statements to PDF.
- Export statements to Excel.

### Notifications

- In-app notification list for the authenticated user.
- Notification badge in the UI.
- Mark notifications as read.
- Email notifications through Brevo for OTPs and important transaction updates.
- Mock email output in development when a real Brevo API key is not configured.

### Profile Management

- View profile details.
- Update profile fields such as name and date of birth.
- Upload a profile photo.
- Automatically generated account number for each user.

### UI and User Experience

- Static responsive frontend in `public/`.
- Login, registration, OTP, forgot-password, dashboard, transactions, statements, and profile views.
- Dark mode toggle.
- Toast notifications for user feedback.
- Uses browser `localStorage` for token and user session persistence.

---

## Application Functionality

BalanceHub is intended for personal peer-to-peer balance tracking. Example use cases include:

- Tracking money lent to friends or family.
- Recording money borrowed from another person.
- Confirming that both parties agree on a loan entry.
- Disputing incorrect loan requests.
- Tracking partial repayments over time.
- Uploading repayment evidence, such as a screenshot or PDF receipt.
- Checking how much each contact owes or is owed.
- Exporting a monthly statement for personal records.
- Receiving email and in-app alerts when action is required.

---

## User Flows

### 1. Registration

1. A user submits their registration details.
2. The backend checks whether the email, phone number, or username already exists.
3. The password is hashed.
4. A 6-digit OTP is generated, hashed, and stored temporarily.
5. The OTP is emailed through Brevo or logged as a mock email in development.
6. The user submits the OTP.
7. On success, the account is verified and a JWT is returned.

### 2. Login

1. A user logs in with email or phone number and password.
2. The backend validates the password and checks that the account is verified.
3. A JWT is returned and saved by the frontend.
4. Authenticated frontend requests include the token as a bearer token.

### 3. Creating a Loan

1. The user selects another registered user or external contact.
2. The user enters amount, description, tags, and whether the money was lent or borrowed.
3. The backend creates an `UNCONFIRMED` loan.
4. The other party receives an in-app/email notification.
5. The other party can confirm or dispute the entry.

### 4. Making a Repayment

1. A user opens a confirmed parent loan.
2. The user enters a repayment amount and optional proof file.
3. The backend validates the remaining balance.
4. A repayment transaction is created as `UNCONFIRMED`.
5. The other party confirms the repayment.
6. If confirmed repayments cover the parent loan, the parent loan is marked `SETTLED`.

### 5. Viewing Balances and Statements

1. Dashboard statistics are calculated from the user's transactions.
2. Contact balances are grouped by other party.
3. Statements can be filtered by month/status.
4. Statement data can be exported to PDF or Excel from the browser.

---

## Technology Stack

### Backend

- **Node.js** runtime.
- **Express 5** web framework.
- **MongoDB Atlas** or any MongoDB-compatible database.
- **Mongoose** for schemas and database access.
- **JWT** for authentication.
- **bcrypt** for password and OTP hashing.
- **Multer** for profile/proof upload parsing.
- **Helmet** for HTTP security headers.
- **CORS** for cross-origin support.
- **express-rate-limit** for API rate limiting.
- **Brevo Transactional Email SDK** for OTP and notification emails.
- **node-cron** service file for scheduled reminder support.

### Frontend

- Static **HTML**, **CSS**, and vanilla **JavaScript**.
- Browser Fetch API for backend communication.
- `localStorage` for frontend session persistence.
- Material Symbols icons.
- Client-side PDF and Excel exports through CDN libraries.
- Chart rendering for dashboard visualizations.

### Deployment

- **Render** for the Node.js backend service.
- **Vercel** for the static frontend.
- Vercel rewrites forward API and upload requests to Render.

---

## Project Structure

```text
Balance-Hub/
├── controllers/              # Request handlers for auth, users, and transactions
├── middleware/               # JWT protection and upload middleware
├── models/                   # Mongoose models
├── public/                   # Static frontend assets
│   ├── index.html            # App shell and views
│   ├── script.js             # Frontend state, API calls, and UI logic
│   ├── style.css             # App styling
│   └── logo.PNG              # Application logo
├── routes/                   # Express route definitions
├── services/                 # Email and scheduled-job services
├── package.json              # Node.js dependencies and scripts
├── package-lock.json         # Locked npm dependency versions
├── render.yaml               # Render backend blueprint
├── server.js                 # Express app entry point
├── vercel.json               # Vercel static deployment and rewrites
└── README.md                 # Project documentation
```

---

## How the Application Works

1. `server.js` loads environment variables and creates the Express app.
2. Security, CORS, JSON parsing, URL-encoded body parsing, and rate-limiting middleware are applied.
3. Static frontend files are served from `public/` when running the backend directly.
4. The server connects to MongoDB through `MONGODB_URI`.
5. API routes are mounted under:
   - `/api/auth`
   - `/api/users`
   - `/api/transactions`
   - `/api/notifications`
6. The frontend calls these API routes using relative `/api/...` paths.
7. In production on Vercel, `vercel.json` rewrites those relative API paths to the Render backend.
8. MongoDB stores users, transactions, notifications, and audit logs.
9. Brevo sends OTP and notification emails when configured.

---

## API Overview

### Auth Routes

Base path: `/api/auth`

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/register` | Start registration and send verification OTP. |
| `POST` | `/verify-registration` | Verify registration OTP and return JWT. |
| `POST` | `/login` | Authenticate user and return JWT. |
| `POST` | `/forgot-password` | Send password reset OTP. |
| `POST` | `/reset-password` | Verify reset OTP and update password. |

### User Routes

Base path: `/api/users`
Authentication required.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/profile` | Fetch authenticated user's profile. |
| `PUT` | `/profile` | Update profile and optional profile photo. |
| `GET` | `/search?query=...` | Search registered/existing users. |
| `POST` | `/external` | Add an external contact. |

### Transaction Routes

Base path: `/api/transactions`
Authentication required.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | List all visible transactions involving the user. |
| `POST` | `/` | Create a new loan entry. |
| `GET` | `/dashboard` | Get dashboard totals. |
| `GET` | `/contacts` | Get contacts with net balances. |
| `GET` | `/chat/:userId` | Get transaction history with one contact. |
| `PUT` | `/:id/confirm` | Confirm a loan or repayment. |
| `PUT` | `/:id/dispute` | Dispute a transaction. |
| `POST` | `/:id/repay` | Create a repayment for a confirmed loan. |

### Notification Routes

Base path: `/api/notifications`
Authentication required.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Fetch latest notifications for the user. |
| `PUT` | `/:id/read` | Mark a notification as read. |

---

## Data Models

### User

Stores identity, contact, authentication, account, profile, verification, and reset-password data.

Important fields include:

- `firstName`, `middleName`, `lastName`
- `email`, `phone`, `username`
- `password`
- `accountNumber`
- `profilePhoto`
- `isRegistered`, `isVerified`
- OTP and OTP expiry fields

### Transaction

Stores both loan and repayment records.

Important fields include:

- `createdBy`
- `fromUser`
- `toUser`
- `amount`
- `description`
- `tags`
- `status`: `UNCONFIRMED`, `CONFIRMED`, `DISPUTED`, or `SETTLED`
- `type`: `LOAN` or `REPAYMENT`
- `parentLoanId`
- `proofOfPayment`
- `isSoftDeleted`

### Notification

Stores in-app alerts.

Important fields include:

- `userId`
- `message`
- `type`: `INFO`, `WARNING`, `SUCCESS`, or `ERROR`
- `isRead`
- `relatedTransaction`

### AuditLog

Stores key system actions for traceability.

Important fields include:

- `userId`
- `action`
- `details`
- `ipAddress`

---

## Local Development

### Prerequisites

- Node.js 18+ recommended.
- npm.
- MongoDB Atlas connection string or local MongoDB instance.
- Optional Brevo account/API key for real email delivery.

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the repository root:

   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/balancehub
   JWT_SECRET=replace_with_a_long_random_secret
   BREVO_API_KEY=your_brevo_api_key_here
   BREVO_SENDER_EMAIL=your_verified_sender@example.com
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the app:

   ```text
   http://localhost:3000
   ```

### Production-like Local Run

```bash
npm start
```

---

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Recommended | Runtime environment, for example `development` or `production`. |
| `PORT` | Optional | API server port. Defaults to `3000`. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWTs. Use a long random value. |
| `BREVO_API_KEY` | Optional for local, recommended for production | Enables real transactional emails. If omitted or set to the placeholder value, emails are mocked in logs. |
| `BREVO_SENDER_EMAIL` | Recommended | Sender address for Brevo emails. Must be allowed by your Brevo account. |

> Do not commit real database credentials, API keys, or JWT secrets to the repository.

---

## Deployment

The repository is configured for a two-service deployment:

- Backend API: Render web service from `render.yaml`.
- Frontend static site: Vercel project from `vercel.json`.

### 1. Deploy the Backend on Render

1. Create or sign in to a Render account.
2. Connect the GitHub repository.
3. Create a new **Blueprint** from the repository.
4. Render reads `render.yaml` and creates a Node web service named `balancehub-api`.
5. Configure the required secret environment variables in Render:
   - `MONGODB_URI`
   - `BREVO_API_KEY`
6. Render can generate `JWT_SECRET` automatically from the blueprint.
7. Deploy the service.
8. Copy the Render service URL, for example:

   ```text
   https://your-balancehub-api.onrender.com
   ```

### 2. Configure the Frontend Proxy

Update `vercel.json` so both rewrite destinations point to your Render backend:

```json
{
  "rewrites": [
    {
      "source": "/api/:match*",
      "destination": "https://your-balancehub-api.onrender.com/api/:match*"
    },
    {
      "source": "/uploads/:match*",
      "destination": "https://your-balancehub-api.onrender.com/uploads/:match*"
    }
  ]
}
```

Commit and push the updated `vercel.json`.

### 3. Deploy the Frontend on Vercel

1. Create or sign in to a Vercel account.
2. Import the GitHub repository as a new project.
3. Vercel reads `vercel.json`.
4. The configured output directory is `public`.
5. Deploy the project.
6. Share the Vercel URL with users.

### Deployment Request Flow

```text
Browser
  ↓
Vercel static frontend
  ↓ /api/* rewrite
Render Express API
  ↓
MongoDB Atlas

Render Express API
  ↓
Brevo transactional email service
```

---

## Security Notes

- JWT authentication protects user, transaction, and notification routes.
- Passwords and OTP values are hashed before storage.
- API requests are rate-limited under `/api/`.
- Helmet sets security-focused HTTP headers and a content security policy.
- File uploads are limited to JPEG, JPG, PNG, and PDF files up to 5 MB.
- Real secrets must be stored in hosting-provider environment variables, not in source control.
- Review CORS and content security policy settings before production use with custom domains.

---

## Known Operational Notes

- The configured npm test script is currently a placeholder and does not run an automated test suite.
- Uploaded profile photos and repayment proofs are converted to Base64 data URIs and stored in MongoDB fields.
- The cron reminder service exists in `services/cronService.js`, but it must be explicitly started from the server entry point if scheduled reminders are required in production.
- If Brevo is not configured, email messages are mocked to server logs, which is useful for local development but not suitable for production OTP delivery.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Express server with Node. |
| `npm run dev` | Start the server with Nodemon for local development. |
| `npm test` | Placeholder test command currently exits with an error. |
