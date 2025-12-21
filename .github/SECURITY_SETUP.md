# Security Scanning Setup

This repository uses automated security scanning to detect and patch vulnerabilities.

## What's Configured

### 1. Dependabot (`.github/dependabot.yml`)
- **Scans:** npm packages, Docker images, GitHub Actions
- **Schedule:** Every Monday at 9am UTC
- **Action:** Creates pull requests with version updates
- **Grouping:**
  - Patch updates grouped together (e.g., 1.2.3 → 1.2.4)
  - Dev dependencies grouped separately

### 2. Security Scan Workflow (`.github/workflows/security-scan.yml`)
- **Triggers:**
  - Every push to main
  - Every pull request
  - Every Monday at 9am UTC
  - Manual trigger via workflow_dispatch
- **Checks:**
  - npm audit on all dependencies (moderate severity)
  - npm audit on production dependencies (high severity - BLOCKS if fails)
  - Lists outdated packages
  - Uploads detailed audit report as artifact

### 3. Pre-Build Security Check (`.github/workflows/docker-publish.yml`)
- **Runs:** Before every Docker build
- **Checks:**
  - npm audit on production dependencies (high severity)
  - npm run build (ensures app still builds)
- **Behavior:** Deployment is BLOCKED if high/critical vulnerabilities found

## How to Verify It's Working

### Immediately After Setup (First Commit)

1. **Push these changes to GitHub:**
   ```bash
   git add .github/
   git commit -m "Add Dependabot and security scanning workflows"
   git push
   ```

2. **Check GitHub Actions:**
   - Go to: https://github.com/jayepolo/codenames/actions
   - You should see "Security Scan" workflow running
   - Click on it to see real-time npm audit results

3. **Check Dependabot:**
   - Go to: https://github.com/jayepolo/codenames/security/dependabot
   - Within 1-2 hours, Dependabot will scan and may create PRs if updates are available
   - Check the "Insights" → "Dependency graph" → "Dependabot" tab

### Within 24 Hours

4. **Dependabot Pull Requests:**
   - Check: https://github.com/jayepolo/codenames/pulls
   - Look for PRs from `dependabot[bot]`
   - PRs will have labels: `dependencies`, `automated`
   - Each PR shows:
     - What package is being updated
     - Release notes and changelog
     - Compatibility score
     - Security vulnerabilities fixed (if any)

### Weekly (Every Monday)

5. **Scheduled Security Scan:**
   - Go to: https://github.com/jayepolo/codenames/actions
   - Look for scheduled "Security Scan" runs
   - Download the "security-audit-report" artifact for detailed JSON report

### When You Push Code

6. **Automatic Security Check:**
   - Every push triggers security scan
   - Every push to main runs audit before Docker build
   - If vulnerabilities found, you'll see it in the Actions tab

## What to Do When Issues Are Found

### High/Critical Vulnerabilities in Production Dependencies
- **Deployment is BLOCKED automatically**
- Review the audit output in GitHub Actions
- Check for Dependabot PRs that fix the issue
- Merge the Dependabot PR, which will trigger a new deployment

### Moderate Vulnerabilities
- Review the Security Scan results
- Check if Dependabot has created a PR
- If no PR exists, manually update: `npm update <package>`

### Dependabot PRs
- **Patch updates (1.2.3 → 1.2.4):** Generally safe to merge after CI passes
- **Minor updates (1.2.0 → 1.3.0):** Review changelog, test locally if needed
- **Major updates (1.0.0 → 2.0.0):** Review breaking changes, test thoroughly

## Manual Security Commands

Run locally anytime:

```bash
# Check for vulnerabilities
npm audit

# Check production dependencies only
npm audit --production

# Automatically fix vulnerabilities (use with caution)
npm audit fix

# See outdated packages
npm outdated

# Update a specific package
npm update <package-name>
```

## Monitoring

### GitHub Security Tab
- https://github.com/jayepolo/codenames/security
- Shows Dependabot alerts
- Shows security advisories
- Shows dependency graph

### Email Notifications
- Dependabot will email you when PRs are created
- Configure in: GitHub Settings → Notifications → Dependabot alerts

### Summary in PR Comments
- Dependabot PRs include automatic security impact analysis
- Dependency Review action comments on PRs with security findings

---

**Last Updated:** 2025-12-21
