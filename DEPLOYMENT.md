# Defense AI Analyst - Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Defense AI Analyst system to production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment Options](#deployment-options)
- [Security Checklist](#security-checklist)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services
1. **Anthropic API Account**
   - Sign up at: https://console.anthropic.com/
   - Billing enabled (pay-as-you-go)
   - API key with access to Claude Haiku 4.5

2. **PostgreSQL Database**
   - PostgreSQL 14+ (recommended: 15 or 16)
   - Suggested providers:
     - **Neon** (serverless, auto-scaling): https://neon.tech/
     - **Railway**: https://railway.app/
     - **Supabase**: https://supabase.com/
     - **AWS RDS**: https://aws.amazon.com/rds/
   - Minimum specs: 1GB RAM, 10GB storage

3. **Node.js Runtime**
   - Node.js 18.x or higher
   - pnpm package manager

### Local Development Tools
```bash
node --version    # Should be 18.x or higher
pnpm --version    # Should be 8.x or higher
```

---

## Environment Variables

### Step 1: Copy Template
```bash
cd apps/web
cp .env.example .env
```

### Step 2: Configure Required Variables

#### 1. ANTHROPIC_API_KEY (REQUIRED)
```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
**How to get it:**
1. Go to https://console.anthropic.com/
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `sk-ant-api03-`)

**Security Note:** Never commit this key to version control or share publicly.

#### 2. DATABASE_URL (REQUIRED)
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

**Format breakdown:**
- `user`: Your database username
- `password`: Your database password
- `host`: Database server hostname
- `port`: Database port (usually 5432)
- `database`: Database name
- `?sslmode=require`: Force SSL connection (important for security)

**Examples:**

**Neon (Recommended for serverless):**
```env
DATABASE_URL=postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Local PostgreSQL (Development only):**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/defense_ai
```

**Railway:**
```env
DATABASE_URL=postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway?sslmode=require
```

#### 3. NODE_ENV (OPTIONAL but RECOMMENDED)
```env
NODE_ENV=production
```

**Impact:**
- `production`:
  - Enables strict SSL certificate validation
  - Hides detailed error messages from API responses
  - Optimizes React and Next.js for performance

- `development`:
  - Allows self-signed SSL certificates
  - Shows detailed error messages
  - Enables React DevTools

**For production deployments, ALWAYS set to `production`.**

---

## Database Setup

### Step 1: Create Database
If using Neon, Railway, or Supabase, the database is created automatically. For self-hosted:

```sql
CREATE DATABASE defense_ai;
```

### Step 2: Run Migrations
The application uses Drizzle ORM. Migrations run automatically on first connection, but you can run them manually:

```bash
cd apps/web
pnpm drizzle-kit push:pg
```

### Step 3: Verify Schema
Your database should have these tables after migration:
- `documents` - Stores uploaded documents
- `entities` - Knowledge graph nodes
- `relationships` - Knowledge graph edges

**SQL to verify:**
```sql
\dt  -- List all tables
SELECT COUNT(*) FROM entities;
SELECT COUNT(*) FROM relationships;
SELECT COUNT(*) FROM documents;
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Pros:**
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Generous free tier

**Steps:**
1. Push code to GitHub repository
2. Go to https://vercel.com/
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables:
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL`
   - `NODE_ENV=production`
6. Click "Deploy"

**Vercel-specific notes:**
- Serverless functions have 10-second timeout on free tier (upgrade for 30s)
- 10MB body size limit is pre-configured

### Option 2: Self-Hosted (Docker/Node)

#### Build for Production
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build web application
cd apps/web
pnpm build
```

#### Run Production Server
```bash
cd apps/web
NODE_ENV=production pnpm start
```

The server runs on port 3000 by default.

#### Using PM2 (Process Manager)
```bash
# Install PM2
npm install -g pm2

# Start application
cd apps/web
pm2 start npm --name "defense-ai" -- start

# Enable auto-restart on reboot
pm2 startup
pm2 save
```

#### Using Docker (Optional)
Create `Dockerfile` in project root:
```dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Build stage
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t defense-ai-analyst .
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your_key \
  -e DATABASE_URL=your_db_url \
  -e NODE_ENV=production \
  defense-ai-analyst
```

### Option 3: Railway

**Pros:**
- Simple deployment
- Includes PostgreSQL database
- Automatic HTTPS

**Steps:**
1. Go to https://railway.app/
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Add PostgreSQL service
5. Set environment variables:
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (auto-populated from PostgreSQL service)
   - `NODE_ENV=production`
6. Deploy

---

## Security Checklist

Before going to production, verify:

### ✅ Environment Security
- [ ] `NODE_ENV=production` is set
- [ ] `.env` file is NOT committed to git
- [ ] API keys are stored securely (environment variables only)
- [ ] Database uses SSL (`?sslmode=require` in connection string)

### ✅ Database Security
- [ ] Database has strong password (16+ characters, mixed case, numbers, symbols)
- [ ] Database is not publicly accessible (whitelist IPs if possible)
- [ ] Regular backups are configured
- [ ] Connection pooling is enabled

### ✅ Application Security
- [ ] File upload validation is enabled (implemented)
- [ ] Input size limits enforced (10MB max)
- [ ] Error messages don't expose internal details (implemented)
- [ ] No test data in production database

### ⚠️ Known Security Limitations
**Not implemented in MVP (add before production):**
- [ ] Authentication/Authorization (no user login)
- [ ] Rate limiting (unlimited API calls)
- [ ] CORS configuration
- [ ] API key rotation policy
- [ ] Audit logging
- [ ] Request signing/verification

**Recommendation:** Add authentication layer (NextAuth.js) before public deployment.

---

## Post-Deployment

### 1. Verify Application is Running
```bash
curl https://your-domain.com/api/stats
```

Expected response:
```json
{
  "stats": {
    "totalEntities": 0,
    "totalRelations": 0,
    "orphanCount": 0
  },
  ...
}
```

### 2. Test Document Ingestion
1. Navigate to your deployed URL
2. Upload a sample defense document
3. Verify triples are extracted
4. Check database for entities:
   ```sql
   SELECT COUNT(*) FROM entities;
   SELECT COUNT(*) FROM relationships;
   ```

### 3. Monitor Costs

**Anthropic API:**
- Claude Haiku 4.5 pricing: ~$0.25 per million input tokens
- Average document (5KB): ~$0.001 per ingestion
- Monitor usage: https://console.anthropic.com/settings/usage

**Database:**
- Neon free tier: 0.5GB storage, 3 projects
- Paid: Scales with usage

**Hosting:**
- Vercel: Free for hobby projects
- Railway: $5/month minimum

### 4. Set Up Monitoring

**Recommended tools:**
- **Sentry** (error tracking): https://sentry.io/
- **LogDNA/Datadog** (logging)
- **Uptime Robot** (uptime monitoring)

---

## Troubleshooting

### Issue: "ANTHROPIC_API_KEY not configured"
**Solution:** Verify environment variable is set correctly
```bash
echo $ANTHROPIC_API_KEY  # Should output your key
```

### Issue: "Database not initialized"
**Solution:** Check DATABASE_URL format and connectivity
```bash
# Test connection with psql
psql "$DATABASE_URL"
```

### Issue: "SSL connection error"
**Solution:**
- Add `?sslmode=require` to DATABASE_URL
- If using self-signed cert, set `NODE_ENV=development` (not recommended for production)

### Issue: "Request body too large"
**Solution:** Already configured to 10MB in `next.config.ts`. To increase:
```typescript
// apps/web/next.config.ts
experimental: {
  serverActions: {
    bodySizeLimit: "20mb"  // Increase limit
  }
}
```

### Issue: "Claude API rate limit exceeded"
**Solution:**
- Anthropic has rate limits based on tier
- Upgrade your Anthropic plan: https://console.anthropic.com/settings/plans
- Implement retry logic with exponential backoff

---

## Performance Optimization

### Database Indexes
For large datasets (10,000+ entities), add indexes:
```sql
CREATE INDEX idx_relationships_source ON relationships(source_entity);
CREATE INDEX idx_relationships_target ON relationships(target_entity);
CREATE INDEX idx_entities_type ON entities(type);
```

### Connection Pooling
For high-traffic deployments, configure pooling in `packages/graph-store/src/db.ts`:
```typescript
pool = new Pool({
  connectionString,
  max: 20,  // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Support & Resources

- **Documentation:** See `README.md` and `CLAUDE.md`
- **Issues:** Report bugs on GitHub
- **Anthropic Docs:** https://docs.anthropic.com/
- **Next.js Docs:** https://nextjs.org/docs
- **Drizzle ORM Docs:** https://orm.drizzle.team/

---

## Summary: Quick Start Checklist

1. ✅ Sign up for Anthropic API (get API key)
2. ✅ Set up PostgreSQL database (Neon recommended)
3. ✅ Copy `.env.example` to `.env`
4. ✅ Fill in `ANTHROPIC_API_KEY` and `DATABASE_URL`
5. ✅ Set `NODE_ENV=production`
6. ✅ Run `pnpm install && pnpm build`
7. ✅ Deploy to Vercel/Railway or run `pnpm start`
8. ✅ Test with sample document
9. ✅ Monitor costs and performance

**You're ready for production! 🚀**
