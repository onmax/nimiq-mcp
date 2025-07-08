# Cloudflare Workers Deployment Guide

This guide walks you through deploying the Nimiq MCP server to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js 18+**: Required for development and deployment
3. **pnpm**: Package manager used by this project

## Local Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo-url>
   cd nimiq-mcp
   pnpm install
   ```

2. **Build the Project**
   ```bash
   pnpm run build
   ```

3. **Test Locally with Wrangler**
   ```bash
   pnpm run dev:worker
   ```

## Cloudflare Account Setup

### 1. Get Your Account ID

1. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Copy your **Account ID** from the right sidebar on any page

### 2. Create an API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Use the **"Custom Token"** template with these permissions:
   - **Account**: `Cloudflare Workers:Edit`
   - **Zone**: `Zone:Read` (if you plan to use custom domains)
4. Set **Account Resources**: Include your account
5. Copy the generated token securely

## Environment Configuration

### Production Environment Variables

Configure these secrets in your Cloudflare Worker:

| Variable | Description | Required |
|----------|-------------|----------|
| `NIMIQ_RPC_URL` | Custom Nimiq RPC endpoint URL | No* |
| `NIMIQ_RPC_USERNAME` | RPC username for authentication | No |
| `NIMIQ_RPC_PASSWORD` | RPC password for authentication | No |

*If not provided, defaults to `https://rpc.nimiqwatch.com`

### Setting Secrets

Use Wrangler CLI to set production secrets:

```bash
# Set custom RPC URL (optional)
echo "https://your-nimiq-node.com" | wrangler secret put NIMIQ_RPC_URL

# Set RPC authentication (optional, for private nodes)
echo "your-username" | wrangler secret put NIMIQ_RPC_USERNAME
echo "your-password" | wrangler secret put NIMIQ_RPC_PASSWORD
```

## Manual Deployment

### 1. Authenticate Wrangler

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 2. Deploy

```bash
# Deploy to production
pnpm run deploy

# Or deploy with custom name
wrangler deploy --name nimiq-mcp-production
```

### 3. Test Deployment

```bash
# Test health endpoint
curl https://nimiq-mcp-server.your-account.workers.dev/health

# Test info endpoint  
curl https://nimiq-mcp-server.your-account.workers.dev/info
```

## Automatic Deployment with GitHub Actions

### 1. Set Repository Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Value | Description |
|-------------|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token | For deployment authentication |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | For targeting correct account |

### 2. Configure Production Secrets

After the first deployment, set your production secrets:

```bash
# Using the deployed worker URL, set secrets
wrangler secret put NIMIQ_RPC_URL --env production
wrangler secret put NIMIQ_RPC_USERNAME --env production  
wrangler secret put NIMIQ_RPC_PASSWORD --env production
```

### 3. Deploy on Push

The GitHub Action will automatically deploy when you push to the `main` branch:

```bash
git add .
git commit -m "Deploy Nimiq MCP server"
git push origin main
```

## Custom Domain Setup (Optional)

### 1. Add Custom Domain

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Select your worker
3. Go to **Settings → Triggers**
4. Click **Add Custom Domain**
5. Enter your domain (e.g., `mcp-api.yourdomain.com`)

### 2. Update DNS

Cloudflare will automatically create the necessary DNS records.

## Security Best Practices

### 1. Environment Variables

- **Never commit secrets** to your repository
- Use Cloudflare Workers secrets for sensitive data
- Regularly rotate API tokens and passwords

### 2. Access Control

For production deployments:

```bash
# Consider restricting access by IP or adding authentication
# This can be implemented in the worker code or via Cloudflare Access
```

### 3. Rate Limiting

The default Cloudflare Workers plan includes:
- 100,000 requests per day (free tier)
- 10ms CPU time per request (free tier)

Monitor usage in the Cloudflare Dashboard.

## Monitoring and Debugging

### 1. View Logs

```bash
# Stream real-time logs
wrangler tail

# View specific deployment logs
wrangler tail --environment production
```

### 2. Monitor Performance

1. Go to **Cloudflare Dashboard → Workers & Pages**
2. Select your worker
3. View **Analytics** for performance metrics

### 3. Debug Issues

Check these endpoints for debugging:

- `https://your-worker.workers.dev/health` - Health check
- `https://your-worker.workers.dev/info` - Server information
- `https://your-worker.workers.dev/` - Web interface with documentation

## Troubleshooting

### Common Issues

1. **"Error 1101: Worker threw exception"**
   - Check wrangler logs: `wrangler tail`
   - Verify all environment variables are set
   - Ensure RPC endpoint is accessible

2. **"Module not found" errors**
   - Run `pnpm install` and `pnpm run build`
   - Check `wrangler.toml` configuration

3. **RPC connection failures**
   - Verify `NIMIQ_RPC_URL` is accessible from Cloudflare
   - Check authentication credentials
   - Test RPC endpoint manually

### Getting Help

- Check the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- Review [MCP specification](https://modelcontextprotocol.io/)
- Open an issue in this repository

## Cost Considerations

### Cloudflare Workers Pricing

- **Free Tier**: 100,000 requests/day, 10ms CPU time
- **Paid Tier**: $5/month for 10M requests, 50ms CPU time

### Nimiq RPC Costs

- **Public RPC** (`rpc.nimiqwatch.com`): Free with rate limits
- **Private Node**: Your hosting costs
- **Hosted Services**: Varies by provider

Monitor your usage and upgrade plans as needed for production workloads.