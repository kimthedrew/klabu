# Fix: Koyeb Can't Detect Application

## The Problem

Koyeb is trying to auto-detect your application but failing because:
- Your repository is a **monorepo** with apps in `backend/` and `web/` subdirectories
- There's no `package.json` or other detection files at the root
- Koyeb's auto-detection only works for single-app repositories at the root

## The Solution

You need to **manually configure Koyeb to use Dockerfile-based deployment** instead of auto-detection.

## Step-by-Step Fix

### Option 1: Deploy via Koyeb Dashboard (Recommended)

#### For Backend Service:

1. Go to Koyeb Dashboard → **Services** → **Create Service**
2. Connect your GitHub repository
3. **IMPORTANT**: In the **Build & Deploy** section:
   - **Build Type**: Select **"Docker"** (NOT "Auto-detect" or "Buildpack")
   - **Dockerfile Path**: Enter `backend/Dockerfile`
   - **Dockerfile Context**: Enter `.` (dot - root of repository)
   - **Port**: `5000`

4. Configure environment variables (see `KOYEB_DEPLOYMENT.md`)

5. Click **Deploy**

#### For Frontend Service:

1. Create a **new service** in Koyeb Dashboard
2. Connect the **same GitHub repository**
3. **IMPORTANT**: In the **Build & Deploy** section:
   - **Build Type**: Select **"Docker"** (NOT "Auto-detect" or "Buildpack")
   - **Dockerfile Path**: Enter `web/Dockerfile`
   - **Dockerfile Context**: Enter `.` (dot - root of repository)
   - **Port**: `3000`

4. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://klabu-backend-xxxxx.koyeb.app`)

5. Click **Deploy**

### Option 2: Deploy via Koyeb CLI

```bash
# Install Koyeb CLI (if not installed)
curl -fsSL https://www.koyeb.com/cli | sh

# Login
koyeb login

# Deploy Backend
koyeb service create klabu-backend \
  --dockerfile backend/Dockerfile \
  --dockerfile-context . \
  --ports 5000:http \
  --git github.com/yourusername/klabu \
  --git-branch main

# Deploy Frontend
koyeb service create klabu-frontend \
  --dockerfile web/Dockerfile \
  --dockerfile-context . \
  --ports 3000:http \
  --git github.com/yourusername/klabu \
  --git-branch main \
  --env NEXT_PUBLIC_API_URL="https://klabu-backend-xxxxx.koyeb.app"
```

### Option 3: Use Koyeb's Service Configuration File

If Koyeb supports service configuration files, you can create services using the `koyeb.yaml` file, but you'll need to configure the Dockerfile paths correctly in the dashboard first.

## Key Points

1. **Always select "Docker" as build type** - Don't rely on auto-detection for monorepos
2. **Dockerfile Path**: Points to the Dockerfile location relative to repo root
   - Backend: `backend/Dockerfile`
   - Frontend: `web/Dockerfile`
3. **Dockerfile Context**: Always use `.` (root) because Dockerfiles reference files relative to repo root
4. **Deploy as separate services** - One for backend, one for frontend

## Verification

After deployment, check:
- Backend health: `https://your-backend.koyeb.app/api/health`
- Frontend loads: `https://your-frontend.koyeb.app`
- Check build logs in Koyeb dashboard to ensure Docker build succeeded

## Troubleshooting

### Still getting "application type could not be identified"
- Make sure you selected **"Docker"** build type, not "Auto-detect"
- Verify Dockerfile paths are correct
- Check that Dockerfiles exist in the repository

### Build fails
- Check build logs in Koyeb dashboard
- Verify Dockerfile syntax is correct
- Ensure all required files are in the repository (not in .gitignore)

### Service won't start
- Check service logs in Koyeb dashboard
- Verify environment variables are set correctly
- Ensure database is accessible from Koyeb

## Next Steps

After fixing the deployment:
1. Set up environment variables (see `KOYEB_DEPLOYMENT.md`)
2. Configure database connection
3. Update domain names in environment variables
4. Test the deployed services
