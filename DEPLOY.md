# Deploying to Google Cloud Run

This guide walks you through deploying the Denmark Ecosystem Map to Google Cloud Run.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud SDK (gcloud)** installed: [Install Guide](https://cloud.google.com/sdk/docs/install)
3. **Docker** installed (optional, for local testing)

## Quick Deploy (Recommended)

### Step 1: Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Enable Required APIs
```bash
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

### Step 3: Deploy
```bash
gcloud run deploy denmark-ecosystem \
  --source . \
  --region europe-north1 \
  --allow-unauthenticated
```

This command:
- Builds the Docker image using Cloud Build
- Pushes it to Google Container Registry
- Deploys to Cloud Run

### Step 4: Get Your URL
After deployment, you'll see:
```
Service URL: https://denmark-ecosystem-xxxxx-xx.a.run.app
```

## Optional: Local Testing

Before deploying, you can test the production build locally:

```bash
# Build the Docker image
docker build -t denmark-ecosystem .

# Run locally
docker run -p 8080:8080 denmark-ecosystem

# Visit http://localhost:8080
```

## Configuration Options

### Custom Domain
```bash
gcloud run domain-mappings create --service denmark-ecosystem --domain your-domain.com
```

### Environment Variables
Set via Cloud Console or:
```bash
gcloud run services update denmark-ecosystem --set-env-vars "KEY=VALUE"
```

## Costs

Cloud Run pricing (as of 2024):
- **Free tier**: 2 million requests/month
- **After free tier**: ~$0.00002400 per request
- Typical small site: **$0-5/month**

## Troubleshooting

### Build fails
Check Cloud Build logs:
```bash
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### App crashes
Check Cloud Run logs:
```bash
gcloud run services logs read denmark-ecosystem --region europe-north1
```
