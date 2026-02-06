# Secrets

This folder contains sensitive credentials that are **not committed to git**.

## GitHub App Private Key

For local development, place your GitHub App private key here:

```
secrets/github-app.pem
```

### How to get the key:

1. Go to your GitHub App settings: https://github.com/settings/apps
2. Select your app → "Private keys" section
3. Click "Generate a private key"
4. Save the downloaded `.pem` file as `secrets/github-app.pem`

### For Vercel deployment:

The private key is loaded from the `GITHUB_APP_PRIVATE_KEY` environment variable instead.
Paste the full contents of the `.pem` file (including BEGIN/END lines) directly into Vercel's dashboard.
