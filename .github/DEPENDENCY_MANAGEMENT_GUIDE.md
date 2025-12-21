# Dependency Management Guide

A practical guide for managing automated security scanning and dependency updates in your Next.js projects.

---

## Table of Contents

1. [Overview](#overview)
2. [How Automated Scanning Works](#how-automated-scanning-works)
3. [Understanding Dependabot Pull Requests](#understanding-dependabot-pull-requests)
4. [Risk Levels and Update Types](#risk-levels-and-update-types)
5. [Efficient Batching Strategy](#efficient-batching-strategy)
6. [Step-by-Step: Merging Pull Requests](#step-by-step-merging-pull-requests)
7. [Monitoring and Verification](#monitoring-and-verification)
8. [Troubleshooting](#troubleshooting)
9. [Weekly Maintenance Routine](#weekly-maintenance-routine)

---

## Overview

This repository uses automated security scanning to detect vulnerabilities and outdated dependencies. When issues are found, Dependabot automatically creates pull requests (PRs) with proposed updates.

### What's Automated

- **Weekly scans** of npm packages, Docker images, and GitHub Actions (every Monday 9am UTC)
- **Automatic PR creation** when updates are available
- **Security audits** run on every PR and push to main
- **Pre-deployment security checks** block builds if critical vulnerabilities exist

### Your Job

- **Review** Dependabot PRs weekly (~15 minutes)
- **Merge** safe updates in batches
- **Test** major version changes carefully
- **Monitor** GitHub Actions for deployment success

---

## How Automated Scanning Works

### Three Main Components

#### 1. Dependabot (`.github/dependabot.yml`)
- Scans dependencies weekly (Monday 9am UTC)
- Creates PRs when updates are available
- Groups patch updates to reduce noise
- Provides compatibility scores and changelogs

#### 2. Security Scan Workflow (`.github/workflows/security-scan.yml`)
**Runs on:**
- Every push to main
- Every pull request
- Weekly schedule (Monday 9am UTC)
- Manual trigger via Actions tab

**What it checks:**
- `npm audit` for all dependencies (moderate severity threshold)
- `npm audit --production` for production dependencies (high severity - BLOCKS if fails)
- Lists outdated packages
- Uploads detailed audit report as artifact

#### 3. Pre-Build Security Check (in `docker-publish.yml`)
**Runs before every Docker build:**
- npm audit on production dependencies (high severity)
- npm run build (ensures app compiles)
- **Blocks deployment** if high/critical vulnerabilities found

### How They Work Together

```
Dependabot scans weekly
    ↓
Creates PRs for updates
    ↓
Security Scan runs on PR (validates update is safe)
    ↓
You review and merge PR
    ↓
Push to main triggers deployment
    ↓
Pre-build security check runs
    ↓
If pass: Build → Deploy
If fail: Block deployment, notify you
```

---

## Understanding Dependabot Pull Requests

### What a Dependabot PR Contains

When Dependabot creates a PR, it includes:

1. **Title**: "Bump [package] from [old-version] to [new-version]"
2. **Compatibility Score**: Percentage confidence (higher = safer)
3. **Release Notes**: Links to changelog and release notes
4. **Security Fixes**: CVEs resolved (if any)
5. **Checks Status**: npm-audit and dependency-review results
6. **Commit Details**: Exactly what changed in package.json/package-lock.json

### Reading the PR

**Example:** "Bump next from 15.5.9 to 16.1.0"

```
Title:        Bump next from 15.5.9 to 16.1.0
Compatibility: 99%
Labels:       dependencies, automated

▶ Release notes
  Links to Next.js 16.0.0 and 16.1.0 release notes

▶ Commits
  Shows the exact version change

✅ Checks:
  ✅ Security Scan / npm-audit (passed)
  ✅ Security Scan / dependency-review (passed)
  ✅ No conflicts with base branch
```

### Check Status Meanings

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ Green checkmark | Passed | Safe to merge, no issues found |
| ❌ Red X | Failed | Problem detected, investigate before merging |
| 🟡 Yellow dot | In progress | Still running, wait for completion |
| ⚪ Gray circle | Queued | Waiting to start |

---

## Risk Levels and Update Types

### Understanding Semantic Versioning

Versions follow the pattern: **MAJOR.MINOR.PATCH** (e.g., 15.5.9)

```
15.5.9 → 15.5.10  =  PATCH update   (bug fixes only)
15.5.9 → 15.6.0   =  MINOR update   (new features, backward compatible)
15.5.9 → 16.0.0   =  MAJOR update   (breaking changes possible)
```

### Risk Assessment Matrix

| Update Type | Risk Level | Review Needed | Testing Required | Example |
|-------------|-----------|---------------|------------------|---------|
| **GitHub Actions** | 🟢 Very Low | Quick glance | No (auto-tested) | actions/checkout 4→6 |
| **TypeScript Types** | 🟢 Very Low | Quick glance | No (compile-time only) | @types/node 22→25 |
| **Patch Updates** | 🟢 Low | Quick glance | No (if checks pass) | next 15.5.9→15.5.10 |
| **Minor Updates** | 🟡 Medium | Read changelog | Optional | react 18.2→18.3 |
| **Docker Base Image** | 🟡 Medium | Check compatibility | Yes (watch build) | node 20→25 |
| **Major Framework** | 🔴 High | Read breaking changes | Yes (manual test) | next 15→16, tailwind 3→4 |

### Decision Guide

**Ask yourself:**

1. **What type of dependency is it?**
   - GitHub Actions → Merge freely
   - TypeScript types → Merge freely
   - App framework → Review carefully

2. **What's the version jump?**
   - Patch (x.x.X) → Usually safe
   - Minor (x.X.x) → Generally safe
   - Major (X.x.x) → Needs attention

3. **Did the security checks pass?**
   - ✅ All green → Proceed
   - ❌ Any red → Investigate first

4. **Are there security fixes?**
   - Yes → Prioritize merging
   - No → Can wait if unsure

---

## Efficient Batching Strategy

Don't merge PRs one-by-one and test between each. Instead, batch by risk level.

### Recommended Batching Approach

#### **Batch 1: GitHub Actions** (No Manual Testing)
**What:** Workflow dependencies only
**Why safe:** Only affects CI/CD pipeline, not your app
**Test method:** GitHub Actions auto-tests

**Typical PRs:**
- actions/checkout
- actions/setup-node
- actions/upload-artifact
- docker/build-push-action
- docker/login-action
- docker/metadata-action

**Process:**
1. Re-run any failed dependency-review checks
2. Wait for all to turn green ✅
3. Merge all of them back-to-back
4. Watch GitHub Actions build
5. If green ✅ → Done. If red ❌ → Investigate

---

#### **Batch 2: TypeScript Types** (No Manual Testing)
**What:** @types/* packages
**Why safe:** Only affect compile-time type checking
**Test method:** npm run build (runs automatically)

**Typical PRs:**
- @types/node
- @types/react
- @types/react-dom

**Process:**
1. Re-run failed checks if needed
2. Merge all together
3. Watch GitHub Actions build
4. TypeScript errors will show up in build logs

---

#### **Batch 3: Docker Base Images** (Watch Build)
**What:** Node.js Docker image versions
**Why careful:** Runtime environment change
**Test method:** Docker build + quick smoke test

**Typical PRs:**
- node from 20-alpine to 25-alpine

**Process:**
1. Merge one at a time (don't batch with others)
2. Watch GitHub Actions build closely
3. Verify deployment completes
4. Quick test: Visit site, click around

---

#### **Batch 4: Patch/Minor Updates** (Light Testing)
**What:** Small version bumps to app dependencies
**Why careful:** Could have subtle bugs
**Test method:** Watch build + light testing

**Typical PRs:**
- next 15.5.9 → 15.5.10 (patch)
- react 18.2.0 → 18.3.0 (minor)

**Process:**
1. Group by package (e.g., all React updates together)
2. Merge patches freely if checks pass
3. Review changelogs for minors
4. Test key features after deployment

---

#### **Batch 5: Major Updates** (Individual + Thorough Testing)
**What:** Breaking change updates
**Why careful:** Can break your app
**Test method:** Read docs, merge one at a time, test thoroughly

**Typical PRs:**
- next 15.x.x → 16.x.x
- tailwindcss 3.x.x → 4.x.x
- react 18.x.x → 19.x.x

**Process:**
1. Read release notes and migration guides
2. Merge ONE at a time
3. Watch build
4. Test entire application manually
5. If breaks, can easily identify which update caused it

---

### Example Batching Workflow

**You have 12 Dependabot PRs. Here's how to handle them efficiently:**

```
Phase 1 (5 min):
  ✅ Merge: actions/checkout, actions/setup-node, docker/build-push-action
  → Watch Actions build
  → Continue to Phase 2

Phase 2 (3 min):
  ✅ Merge: @types/node, @types/react
  → Watch Actions build
  → Continue to Phase 3

Phase 3 (10 min):
  ⚠️ Merge: node 20-alpine → 25-alpine
  → Watch Actions build
  → Test site: https://codenames.pololabs.io
  → Continue to Phase 4

Phase 4 (5 min):
  ✅ Merge: next 15.5.9 → 15.5.10 (patch)
  → Watch Actions build
  → Light test
  → Continue to Phase 5

Phase 5 (Schedule for later):
  🔴 Review: next 15.x → 16.x (major)
  🔴 Review: tailwindcss 3.x → 4.x (major)
  → Do these individually over next few days
  → Read migration guides first
```

---

## Step-by-Step: Merging Pull Requests

### Before You Start

1. **Go to Pull Requests tab:**
   - https://github.com/[your-username]/[repo-name]/pulls

2. **Identify which batch you're working on**
   - Use the risk matrix above

3. **Open multiple PRs in tabs** (for batching)
   - Right-click each PR → "Open in new tab"

### Merging a Single PR

**Step 1: Open the PR**
- Click on the PR title

**Step 2: Check the status**
- Look at the bottom for check results
- All should be ✅ green

**Step 3: If checks failed, re-run them**
- Click the three dots `...` next to failed check
- Click "Re-run jobs"
- Wait ~30 seconds for completion

**Step 4: Review the update**
- Glance at compatibility score (higher = safer)
- Click "Release notes" to see what changed
- Look for "Security" section for CVE fixes

**Step 5: Merge the PR**
- Scroll to the bottom of the PR page
- Click the green **"Merge pull request"** button
- Click **"Confirm merge"**
- Click **"Delete branch"** when prompted

**Done!** The update is now in your main branch.

### Merging Multiple PRs in Batch

**Step 1: Open PRs in tabs**
```
Tab 1: PR #2 - actions/setup-node
Tab 2: PR #3 - actions/checkout
Tab 3: PR #4 - docker/build-push-action
Tab 4: PR #8 - @types/node
```

**Step 2: Go through each tab quickly**
- Tab 1: Merge → Confirm → Delete branch
- Tab 2: Merge → Confirm → Delete branch
- Tab 3: Merge → Confirm → Delete branch
- Tab 4: Merge → Confirm → Delete branch

**Step 3: Watch GitHub Actions**
- Go to Actions tab
- Look for "Build and Push Docker Image" workflow starting
- It will process all changes together in one build

**Step 4: Verify deployment**
- Wait for green checkmark ✅
- Check that "Deployment complete!" appears
- Test your site

---

## Monitoring and Verification

### How to Know Things Are Working

#### 1. **Immediately After Merge (1-5 minutes)**

**Go to Actions tab:**
- https://github.com/[your-username]/[repo-name]/actions

**You should see:**
- 🟡 Yellow dot = "Build and Push Docker Image" running
- Timeline: ~2-3 minutes for build, ~1 minute for deploy

**Click on the running workflow to watch progress:**
```
✅ Checkout repository
✅ Setup Node.js
✅ Install dependencies
✅ Run security audit before build    ← Critical check
✅ Run build test                      ← Critical check
✅ Log in to GitHub Container Registry
✅ Build and push Docker image
✅ Pull latest image (on self-hosted runner)
✅ Restart containers
✅ Verify deployment
```

#### 2. **Build Success (Green Checkmark ✅)**

**What it means:**
- Security audit passed (no high/critical vulnerabilities)
- App compiles successfully
- Docker image built and pushed
- Deployed to your server
- Containers restarted

**What to do:**
- Visit your site (e.g., https://codenames.pololabs.io)
- Click around to verify basic functionality
- Check browser console for errors (F12 → Console tab)

#### 3. **Build Failure (Red X ❌)**

**What it means:**
- Something broke in the update

**What to do:**
1. Click on the failed workflow
2. Identify which step failed:
   - **"Run security audit"** → High/critical vulnerability introduced
   - **"Run build test"** → Code doesn't compile
   - **"Build and push Docker image"** → Docker build issue
3. Click on the failed step to see error details
4. Take a screenshot and investigate

**Common failures:**
- **npm audit fails:** A dependency has a vulnerability
  - Look for newer version of that package
  - Check if Dependabot has another PR fixing it
- **Build fails:** Breaking change in update
  - Read release notes for migration steps
  - May need code changes
- **Docker build fails:** Compatibility issue
  - Check Dockerfile configuration
  - Verify base image is correct

#### 4. **Weekly Verification**

**Every Monday after Dependabot runs:**

1. **Check Dependabot PRs:**
   - Go to Pull Requests tab
   - Look for new PRs from `dependabot[bot]`

2. **Check Security tab:**
   - https://github.com/[your-username]/[repo-name]/security
   - Look for Dependabot alerts
   - Review "Dependency graph" → "Dependabot" section

3. **Check Actions tab:**
   - Look for scheduled "Security Scan" workflow
   - Download "security-audit-report" artifact if you want details

---

## Troubleshooting

### Problem: PR Check is Failing

**Symptom:** Red X on "Security Scan / dependency-review"

**Cause:** Dependency graph wasn't enabled when check ran

**Fix:**
1. Ensure Dependency graph is enabled:
   - Go to Settings → Code security and analysis
   - Enable "Dependency graph"
2. Re-run the failed check:
   - Click three dots `...` next to failed check
   - Click "Re-run jobs"
   - Wait for green checkmark

---

### Problem: npm audit Fails on Production Dependencies

**Symptom:** Build blocked with "npm audit --production --audit-level=high" failure

**Cause:** High or critical vulnerability in a production dependency

**Fix:**
1. Click on the failed workflow to see details
2. Look for the vulnerable package name
3. Check if Dependabot has a PR updating that package
4. If yes: Merge that PR first
5. If no: Manually update:
   ```bash
   npm update <package-name>
   git add package.json package-lock.json
   git commit -m "Fix security vulnerability in <package-name>"
   git push
   ```

---

### Problem: Build Passes But Site is Broken

**Symptom:** Green checkmark on Actions, but site doesn't work

**Cause:** Breaking change in an update

**Fix:**
1. **Identify the culprit:**
   - Review which PRs you just merged
   - Major version updates are most likely

2. **Quick rollback option:**
   ```bash
   # Find the last working commit
   git log --oneline -10

   # Revert to before the merge
   git revert <commit-hash>
   git push
   ```

3. **Or fix the issue:**
   - Read migration guide for the breaking change
   - Update code to work with new version
   - Test locally
   - Push fix

---

### Problem: Too Many PRs, Feeling Overwhelmed

**Symptom:** 20+ Dependabot PRs piled up

**Fix:**
1. **Close outdated PRs:**
   - If a newer version PR exists, close the older one
   - Example: If you have "15.5.9 → 15.5.10" and "15.5.9 → 15.6.0", close the first

2. **Prioritize security fixes:**
   - Look for PRs with "Security" labels or CVE mentions
   - Merge those first

3. **Batch aggressively:**
   - Merge all GitHub Actions updates together (10+ at once is fine)
   - Group by package family (all React updates, all Next updates, etc.)

4. **Close non-critical major updates:**
   - If a major version update isn't urgent, close the PR
   - You can manually update when you're ready
   - Dependabot will create a new PR next week

---

## Weekly Maintenance Routine

Spend ~15 minutes every Monday to stay on top of updates.

### Monday Morning Checklist

**1. Check for new Dependabot PRs (5 min)**
```
□ Go to Pull Requests tab
□ Count how many new PRs from dependabot[bot]
□ Scan titles for security-related updates
```

**2. Batch and merge GitHub Actions updates (3 min)**
```
□ Identify all actions/* and docker/* PRs
□ Open in tabs
□ Merge all at once
□ Watch build in Actions tab
```

**3. Merge TypeScript types (2 min)**
```
□ Identify @types/* PRs
□ Merge together
□ Verify build passes
```

**4. Review security alerts (2 min)**
```
□ Go to Security tab
□ Check for Dependabot alerts
□ Prioritize high/critical alerts
```

**5. Schedule major updates (3 min)**
```
□ Identify major version PRs (X.0.0)
□ Read release notes
□ Decide: merge now, schedule for later, or close
□ Create calendar reminder if scheduling
```

---

### Monthly Deep Review (30 min)

**Once a month, do a deeper check:**

1. **Review all open PRs:**
   - Close stale PRs
   - Merge safe updates you've been postponing

2. **Check for outdated packages manually:**
   ```bash
   npm outdated
   ```
   - Look for packages Dependabot missed
   - Manually update if needed

3. **Review Security Scan artifacts:**
   - Download recent audit reports
   - Look for trends or recurring issues

4. **Test thoroughly:**
   - After merging updates, do full regression test
   - Test all major features
   - Check on different browsers/devices

---

## Quick Reference

### Common GitHub Actions Workflow URLs

```
Pull Requests:    /pulls
Actions:          /actions
Security:         /security
Dependabot:       /security/dependabot
Dependency Graph: /network/dependencies
Settings:         /settings/security_analysis
```

### Common npm Commands

```bash
# Check for vulnerabilities
npm audit

# Check production dependencies only
npm audit --production

# Auto-fix vulnerabilities (use with caution)
npm audit fix

# See outdated packages
npm outdated

# Update a specific package
npm update <package-name>

# Update to latest major version
npm install <package-name>@latest
```

### Dependabot Commands

You can comment on Dependabot PRs with commands:

```
@dependabot rebase          - Rebase the PR
@dependabot recreate        - Recreate the PR
@dependabot merge           - Merge the PR (if checks pass)
@dependabot cancel merge    - Cancel auto-merge
@dependabot close           - Close the PR
@dependabot ignore          - Ignore this dependency
```

---

## Summary

### What You've Learned

✅ **Automated scanning** runs weekly and on every PR/push
✅ **Dependabot creates PRs** when updates are available
✅ **Risk levels** help prioritize which updates to merge
✅ **Batching** saves time - group similar updates together
✅ **GitHub Actions** auto-tests and deploys after merge
✅ **Monitoring** ensures updates don't break your app

### The Core Workflow

```
1. Monday: Dependabot creates PRs
2. Check Pull Requests tab
3. Batch by risk level
4. Merge batches (GitHub Actions → Types → Docker → App)
5. Watch Actions tab for green checkmark
6. Quick test your site
7. Done!
```

### When to Get Help

- Red X that you can't fix after re-running
- Build passes but site is broken
- Security vulnerability you don't understand
- Unsure if a major update is safe

---

**Last Updated:** 2025-12-21
