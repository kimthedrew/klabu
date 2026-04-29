# Koyeb Deployment Guide for Klabu

This guide will help you deploy the Klabu food delivery platform to Koyeb.

## Prerequisites

1. A Koyeb account (sign up at https://www.koyeb.com)
2. A PostgreSQL database (Koyeb provides managed databases, or use external like Supabase, Neon, etc.)
3. GitHub repository with your code
4. M-Pesa API credentials (for payment processing)
5. Cloudinary account (for image uploads)

## Step 1: Fix GitHub Push Issue

Before deploying, you need to remove the large files from your Git history:

```bash
# Remove node_modules from Git tracking
git rm -r --cached backend/node_modules web/node_modules

# Commit the changes
git commit -m "Remove node_modules from Git tracking"

# If you've already pushed, you may need to clean history
# WARNING: This rewrites history - coordinate with your team
git filter-branch --tree-filter 'rm -rf backend/node_modules web/node_modules' HEAD
git push origin --force --all
```

Alternatively, if you haven't pushed yet, just commit the `.gitignore` file:

```bash
git add .gitignore
git commit -m "Add .gitignore to exclude node_modules"
git push
```

## Step 2: Set Up PostgreSQL Database

1. **Option A: Use Koyeb Database**
   - Go to Koyeb dashboard → Databases
   - Create a new PostgreSQL database
   - Note the connection string

2. **Option B: Use External Database (Supabase, Neon, etc.)**
   - Create a PostgreSQL database
   - Get the connection string (format: `postgresql://user:password@host:port/database`)

3. **Update Prisma Schema** (if using PostgreSQL):
   - The schema currently uses SQLite for development
   - For production, ensure your `DATABASE_URL` points to PostgreSQL
   - Prisma will automatically use the correct provider based on the connection string

## Step 3: Configure Environment Variables

### Backend Environment Variables

Set these in Koyeb dashboard for the `klabu-backend` service:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - A strong random string for JWT token signing
- `FRONTEND_URL` - Your frontend domain (e.g., `https://klabu-frontend.koyeb.app`)

**M-Pesa Configuration:**
- `MPESA_SHORTCODE` - Your M-Pesa business shortcode
- `MPESA_CONSUMER_KEY` - M-Pesa API consumer key
- `MPESA_CONSUMER_SECRET` - M-Pesa API consumer secret
- `MPESA_PASSKEY` - M-Pesa passkey
- `MPESA_BASE_URL` - Use `https://sandbox.safaricom.co.ke` for testing or `https://api.safaricom.co.ke` for production
- `MPESA_CALLBACK_URL` - `https://your-backend-domain.koyeb.app/api/payments/stk-callback`
- `BACKEND_URL` - Your backend domain (e.g., `https://klabu-backend.koyeb.app`)

**Cloudinary Configuration:**
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

### Frontend Environment Variables

Set these in Koyeb dashboard for the `klabu-frontend` service:

- `NEXT_PUBLIC_API_URL` - Your backend API URL (e.g., `https://klabu-backend.koyeb.app`)

## Step 4: Deploy to Koyeb

### Option A: Deploy via Koyeb Dashboard

1. Go to Koyeb dashboard → Services → Create Service
2. Connect your GitHub repository
3. For Backend:
   - Service name: `klabu-backend`
   - Build command: (leave empty, using Dockerfile)
   - Dockerfile path: `backend/Dockerfile`
   - Dockerfile context: `.` (root of repository)
   - Port: `5000`
   - Add all environment variables listed above

4. For Frontend:
   - Service name: `klabu-frontend`
   - Build command: (leave empty, using Dockerfile)
   - Dockerfile path: `web/Dockerfile`
   - Dockerfile context: `.` (root of repository)
   - Port: `3000`
   - Add environment variables listed above

### Option B: Deploy via Koyeb CLI

1. Install Koyeb CLI:
   ```bash
   curl -fsSL https://www.koyeb.com/cli | sh
   ```

2. Login to Koyeb:
   ```bash
   koyeb login
   ```

3. Deploy backend:
   ```bash
   koyeb service create klabu-backend \
     --dockerfile backend/Dockerfile \
     --dockerfile-context . \
     --ports 5000:http \
     --env DATABASE_URL="your-database-url" \
     --env JWT_SECRET="your-jwt-secret" \
     --env FRONTEND_URL="https://klabu-frontend.koyeb.app" \
     --env MPESA_SHORTCODE="your-shortcode" \
     --env MPESA_CONSUMER_KEY="your-key" \
     --env MPESA_CONSUMER_SECRET="your-secret" \
     --env MPESA_PASSKEY="your-passkey" \
     --env MPESA_BASE_URL="https://api.safaricom.co.ke" \
     --env MPESA_CALLBACK_URL="https://klabu-backend.koyeb.app/api/payments/stk-callback" \
     --env BACKEND_URL="https://klabu-backend.koyeb.app" \
     --env CLOUDINARY_CLOUD_NAME="your-cloud-name" \
     --env CLOUDINARY_API_KEY="your-api-key" \
     --env CLOUDINARY_API_SECRET="your-api-secret"
   ```

4. Deploy frontend:
   ```bash
   koyeb service create klabu-frontend \
     --dockerfile web/Dockerfile \
     --dockerfile-context . \
     --ports 3000:http \
     --env NEXT_PUBLIC_API_URL="https://klabu-backend.koyeb.app"
   ```

### Option C: Use koyeb.yaml (Recommended)

1. Update `koyeb.yaml` with your actual domain names and secrets
2. Deploy using:
   ```bash
   koyeb service create --config koyeb.yaml
   ```

## Step 5: Run Database Migrations

After the backend service is deployed, run Prisma migrations:

1. Connect to your backend service via Koyeb dashboard → Service → Shell
2. Or use Koyeb CLI:
   ```bash
   koyeb service exec klabu-backend -- npx prisma migrate deploy
   ```

Alternatively, the Dockerfile includes automatic migration on startup.

## Step 6: Seed Database (Optional)

If you want to seed the database with initial data:

```bash
koyeb service exec klabu-backend -- npm run db:seed
```

## Step 7: Update Domain Names

After deployment, update the environment variables with the actual Koyeb domains:

1. Backend service will get a domain like: `klabu-backend-xxxxx.koyeb.app`
2. Frontend service will get a domain like: `klabu-frontend-xxxxx.koyeb.app`
3. Update `FRONTEND_URL` in backend service
4. Update `NEXT_PUBLIC_API_URL` in frontend service
5. Update `MPESA_CALLBACK_URL` and `BACKEND_URL` in backend service

## Step 8: Custom Domains (Optional)

1. Go to Koyeb dashboard → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update environment variables with custom domains

## Troubleshooting

### Backend Issues

- **Database connection errors**: Verify `DATABASE_URL` is correct and database is accessible
- **Prisma errors**: Ensure Prisma Client is generated (included in Dockerfile)
- **Port errors**: Ensure PORT environment variable is set to 5000

### Frontend Issues

- **API connection errors**: Verify `NEXT_PUBLIC_API_URL` points to correct backend URL
- **Build errors**: Check Next.js build logs in Koyeb dashboard
- **CORS errors**: Ensure `FRONTEND_URL` in backend matches frontend domain

### General Issues

- **Service won't start**: Check logs in Koyeb dashboard → Service → Logs
- **Environment variables not working**: Ensure variables are set as secrets when needed
- **Health check failures**: Verify health check paths are correct (`/api/health` for backend, `/` for frontend)

## Monitoring

- View logs: Koyeb dashboard → Service → Logs
- Monitor metrics: Koyeb dashboard → Service → Metrics
- Set up alerts: Koyeb dashboard → Service → Alerts

## Continuous Deployment

Koyeb automatically deploys when you push to your connected GitHub branch. To configure:

1. Go to Service → Settings → Git
2. Select branch (usually `main` or `master`)
3. Enable auto-deploy

## Support

- Koyeb Documentation: https://www.koyeb.com/docs
- Koyeb Community: https://www.koyeb.com/community
- Koyeb Support: support@koyeb.com
