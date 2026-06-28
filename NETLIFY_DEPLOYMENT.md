# Netlify Deployment Guide - วัดท่าวัด Digital Archive

## ✓ Setup Complete - การตั้งค่าเสร็จสิ้น

### Files Created/Modified:
1. **netlify.toml** - Netlify configuration for static site deployment
2. **public/index.js** - Updated with fallback logic for loading artifacts
3. **package.json** - Updated build script
4. **.netlifyignore** - Exclude unnecessary files from deployment

### Deployment Steps:

#### Step 1: Push to GitHub (if using GitHub)
```bash
git add .
git commit -m "Configure for Netlify deployment"
git push
```

#### Step 2: Connect to Netlify

**Option A: Via Netlify Dashboard**
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select GitHub and authorize
4. Choose this repository
5. Click "Deploy"

**Option B: Via Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Step 3: Verify Configuration

After deployment, check these:
1. ✓ The site loads without 404 errors
2. ✓ Artifacts load from `/assets/artifacts.json`
3. ✓ All images and models display correctly
4. ✓ No console errors

### Key Configuration Details:

**netlify.toml settings:**
- `publish = "public"` - Deploy only the public folder
- `from = "/*"` to `to = "/index.html"` - Handles SPA routing
- Cache headers for static assets
- CORS headers for API requests

**How artifacts load:**
1. First tries: `/api/artifacts` (for local Node.js server)
2. Falls back to: `/assets/artifacts.json` (for Netlify static hosting)
3. Shows error if both fail

### Troubleshooting:

**If you still get 404 error:**
- Clear browser cache (Ctrl+Shift+Del)
- Check Netlify build logs
- Verify `public/` folder is not nested in build output

**If artifacts don't load:**
- Check browser console for fetch errors
- Verify `/assets/artifacts.json` exists
- Check that all image paths start with `/assets/`

### Support:
- Netlify Docs: https://docs.netlify.com
- Project runs as static site (no backend needed)
- All data comes from `public/assets/artifacts.json`
