# Cloudflare Tunnel Setup for Build Engine

This guide will help you expose your local build engine (running on `http://localhost:3001`) to the internet via a Cloudflare Tunnel, so the Vercel frontend at https://build-same.vercel.app/ can connect to it.

## Prerequisites
- Cloudflare account (you have one)
- `cloudflared` installed on your Windows machine
- Your build engine running locally on port 3001

## Step 1: Verify Your Tunnel Exists

Your tunnel ID is: `7588de77-9d75-4dab-8512-8fc2c4ec57fc`

List your tunnels to confirm:
```powershell
cloudflared tunnel list
```

You should see:
- ID: `7588de77-9d75-4dab-8512-8fc2c4ec57fc`
- Name: `build-engine` (if you created it with that name)

## Step 2: Configure the Tunnel

Create or edit the config file at: `C:\Users\viren\.cloudflared\config.yml`

```yaml
tunnel: 7588de77-9d75-4dab-8512-8fc2c4ec57fc
credentials-file: C:\Users\viren\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: ""  # Leave empty for quick tunnel
    service: http://localhost:3001
  - service: http_status:404
```

> **Note**: If you want a stable URL, you can configure a public hostname instead (requires your domain on Cloudflare). For quick testing, leave hostname empty and cloudflared will generate a `*.trycloudflare.com` URL.

## Step 3: Start Your Local Build Engine

In one terminal:
```powershell
cd C:\Users\viren\OneDrive\Desktop\build-same-engine
npx tsx src/server.ts
```

Verify it's running:
```powershell
curl http://localhost:3001/api/health
```
Should return: `{"status":"ok",...}`

## Step 4: Run the Tunnel

In a **separate terminal** (keep it running):
```powershell
cloudflared tunnel run build-engine
```

You will see output like:
```
2025-XX-XX INF Starting tunnel tunnelID=7588de77-9d75-4dab-8512-8fc2c4ec57fc
2025-XX-XX INF Registered tunnel connection
2025-XX-XX INF Your quick Tunnel has been created! Visit it at:
https://build-engine.trycloudflare.com
```

**Copy the URL** (e.g., `https://build-engine.trycloudflare.com`)

## Step 5: Test the Tunnel Locally

```powershell
curl https://build-engine.trycloudflare.com/api/health
```
Should return: `{"status":"ok",...}`

## Step 6: Update Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your `build-same` project
3. Go to **Settings → Environment Variables**
4. Find or create: `ENGINE_URL`
5. Set value to: `https://build-engine.trycloudflare.com` (your tunnel URL)
6. Click **Save**
7. Go to **Deployments** → Click the three dots on the latest deployment → **Redeploy**

## Step 7: Test End-to-End

1. Visit https://build-same.vercel.app/
2. Enter a business description (e.g., "Indian supplement wholesalers")
3. Click **Build**
4. Wait for progress to reach **Complete** (60-120 seconds)
5. Click **Preview** to see your generated site

## Troubleshooting

### Tunnel not starting?
- Verify `cloudflared` is installed: `cloudflared --version`
- Check the config file syntax
- Ensure the tunnel ID matches in config.yml and the credentials file exists

### Vercel still shows 502 errors?
- Check Vercel function logs for the actual error
- Verify `ENGINE_URL` is set correctly (no trailing slash)
- Ensure the tunnel is still running on your machine
- Try redeploying the frontend after setting the env var

### Need a stable URL?
Configure a public hostname in the Cloudflare dashboard:
1. Go to **Networking → Tunnels** → Click your tunnel
2. **Public Hostname** tab → **Add a public hostname**
3. Subdomain: `engine` (or your choice)
4. Domain: Select your domain
5. Service: `http://localhost:3001`
6. Save

Then use the stable URL (e.g., `https://engine.yourdomain.com`) in Vercel.

## Important Notes
- Keep **both terminals running** (engine + cloudflared)
- Quick tunnel URLs (`*.trycloudflare.com`) change on restart - for stable testing, use a public hostname
- The engine must be running on port 3001 for the tunnel to forward correctly