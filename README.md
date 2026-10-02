# CampusPro — Training & Placement Management Platform

CampusPro is a full-stack MERN application designed to streamline campus placements, eligibility verification, mock testing, interview preparation, and corporate drive tracking.

---

## 🏗️ Project Architecture

```text
TNP/
├── client/                     # Frontend SPA (React + Vite + Tailwind CSS)
│   ├── src/                    # UI Components, Contexts, Pages, Services
│   ├── public/                 # Static assets
│   └── package.json            # Client dependencies & scripts
│
├── server/                     # Backend API & Workers (Node.js + Express + BullMQ)
│   ├── config/                 # Database, Redis, Cloudinary, & JWT configs
│   ├── controllers/            # API Route Controllers
│   ├── middleware/             # Auth, RBAC, File Upload, Sanitize, Rate Limit
│   ├── models/                 # Mongoose Data Schemas
│   ├── routes/                 # Express API Endpoints
│   ├── services/               # Eligibility, Cloudinary, Email & AI Services
│   ├── queues/                 # BullMQ Job Queues (Email, Notification, Export)
│   ├── workers/                # Background Queue Workers
│   ├── seed/                   # Development Seeding Scripts (Production-Guarded)
│   ├── utils/                  # Pagination, Filtering, Indexing utilities
│   ├── package.json            # Server dependencies & scripts
│   └── .env.example            # Canonical environment variable template
│
├── .gitignore                  # Git ignore rules for secrets, builds, & uploads
└── README.md                   # System documentation & deployment guide
```

---

## 🔐 Environment Configuration

Before launching the server, copy `server/.env.example` to `server/.env` and supply environment values:

```bash
cp server/.env.example server/.env
```

### Essential Environment Variables

| Variable | Description | Required in Production |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP listening port (e.g. `5000`) | Optional (defaults to 5000) |
| `NODE_ENV` | Environment mode (`development` / `production`) | **Yes** |
| `MONGO_URI` | Production MongoDB connection string | **Yes** (Local fallback blocked in production) |
| `JWT_SECRET` | Cryptographically secure secret key (min 32 chars) | **Yes** (Weak / default keys blocked in production) |
| `CLIENT_URL` | Frontend origin for CORS and email links | **Yes** |
| `REDIS_HOST` | Redis host for BullMQ queues | Optional (defaults to 127.0.0.1) |
| `REDIS_PORT` | Redis port | Optional (defaults to 6379) |
| `REDIS_PASSWORD` | Redis authentication password | Conditional |
| `SMTP_HOST` | Outgoing SMTP mail server | Conditional |
| `SMTP_USER` | SMTP username | Conditional |
| `SMTP_PASS` | SMTP application-specific password | Conditional |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary storage cloud name | **Yes** (Local fallback blocked in production) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | **Yes** |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | **Yes** (Server-only) |

> ⚠️ **SECURITY WARNING:**
> Never commit `server/.env` into version control. Ensure all production credentials are supplied securely through deployment environment configurations or secret management vaults.

---

## 🚀 Deployment Instructions

### 1. Database Index Synchronization
```bash
cd server
npm ci --omit=dev
npm run sync-indexes
```

### 2. Backend API Service
```bash
cd server
npm start
```

### 3. Background Worker Service
```bash
cd server
npm run worker
```

### 4. Frontend Build
```bash
cd client
npm ci
npm run build
```
Deploy the generated `client/dist/` assets to a static hosting provider (e.g., Cloudflare Pages, Vercel, S3/CloudFront, or Nginx).

---

## 🛡️ Production Security & Seed Protection

1. **Seed Script Disabled in Production:**
   Running `npm run seed` or `npm run seed:load-test` in `NODE_ENV=production` is strictly blocked by runtime security assertions to prevent accidental database purges.
2. **Development Seed Accounts:**
   Default seed accounts (`admin@campuspro.com`, `faculty@campuspro.com`, `student@campuspro.com`) exist **only** for development and local testing. They are not created in production.
3. **Redis Architecture:**
   The `redis/` directory in the repository contains Windows binaries for local development convenience only. Production deployments must connect to an independently managed Redis instance (e.g. AWS ElastiCache, Redis Cloud, Upstash, or a dedicated Linux Redis daemon) specified via `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`.
4. **Runtime Storage Directories:**
   `server/uploads/` subdirectories (`resumes/`, `jds/`, `exports/`) are runtime directories and must not contain committed personal data. Folder structures are preserved using `.gitkeep`.
