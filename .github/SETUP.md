# GitHub Repository Setup Guide

This guide will help you set up GitHub labels and configurations for your new repository.

## Required Labels

The following labels need to be manually created in your GitHub repository for the automated workflows to function properly:

### Category Labels

1. **source** - For source code changes
2. **tests** - For test-related changes
3. **documentation** - For documentation updates
4. **dependencies** - For dependency updates
5. **config** - For configuration file changes
6. **ci** - For CI/CD workflow changes

### Size Labels (for PR Size Check)

7. **size/s** - Small PRs (< 100 changes)
8. **size/m** - Medium PRs (100-500 changes)
9. **size/l** - Large PRs (500-1000 changes)
10. **size/xl** - Extra Large PRs (> 1000 changes)

### Status Labels

11. **stale** - For stale issues/PRs (automatically added)
12. **pinned** - For pinned issues
13. **security** - For security-related issues
14. **bug** - For bug reports
15. **enhancement** - For feature requests
16. **work-in-progress** - For PRs in progress
17. **ready-for-review** - For PRs ready for review
18. **automated** - For automated PRs (dependabot, etc.)

## How to Create Labels

### Option 1: Using GitHub Web Interface

1. Go to your repository on GitHub
2. Click on **Issues** → **Labels**
3. Click **New label**
4. Enter the label name and choose a color
5. Click **Create label**
6. Repeat for all labels listed above

### Option 2: Using GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Create labels
gh label create "source" --color "0E8A16" --description "Source code changes"
gh label create "tests" --color "FBCA04" --description "Test-related changes"
gh label create "documentation" --color "0052CC" --description "Documentation updates"
gh label create "dependencies" --color "D93F0B" --description "Dependency updates"
gh label create "config" --color "F9D0C4" --description "Configuration changes"
gh label create "ci" --color "1D76DB" --description "CI/CD changes"
gh label create "size/s" --color "0E8A16" --description "Small PR"
gh label create "size/m" --color "FBCA04" --description "Medium PR"
gh label create "size/l" --color "FB9900" --description "Large PR"
gh label create "size/xl" --color "D93F0B" --description "Extra Large PR"
gh label create "stale" --color "B60205" --description "Stale issue/PR"
gh label create "pinned" --color "5319E7" --description "Pinned"
gh label create "security" --color "D93F0B" --description "Security related"
gh label create "bug" --color "D93F0B" --description "Bug report"
gh label create "enhancement" --color "0E8A16" --description "Feature request"
gh label create "work-in-progress" --color "FBCA04" --description "Work in progress"
gh label create "ready-for-review" --color "0E8A16" --description "Ready for review"
gh label create "automated" --color "1D76DB" --description "Automated PR"
```

### Option 3: Using GitHub API

You can use the GitHub API to create labels programmatically. See the [GitHub Labels API documentation](https://docs.github.com/en/rest/issues/labels).

## Workflow Configuration

### Auto-Assign Workflow

The `auto-assign.yml` workflow automatically assigns issues and PRs to `Shironex`. If you want to change the assignee:

1. Edit `.github/workflows/auto-assign.yml`
2. Update the `assignees` field with your GitHub username

### Dependabot Configuration

Dependabot is configured in `.github/dependabot.yml`. You can customize:

- Update schedule (currently weekly for npm, monthly for GitHub Actions)
- Ignored dependencies
- Labels applied to PRs
- Commit message format

### Labeler Configuration

The labeler automatically applies labels based on changed files. Configuration is in `.github/labeler.yml`. You can customize the file patterns and labels as needed.

### Stale Bot Configuration

The stale bot automatically marks inactive issues and PRs. Configuration is in `.github/workflows/stale.yml`. You can adjust:

- Days before marking as stale
- Days before closing
- Exempt labels
- Messages

## Next Steps

1. ✅ Create all required labels (see above)
2. ✅ Review and customize workflow configurations if needed
3. ✅ Set up GitHub Pages (if using documentation):
   - Go to Settings → Pages
   - Select source: GitHub Actions
4. ✅ Configure secrets (if needed):
   - `NPM_TOKEN` - For publishing to npm (if using semantic-release)
   - `CODECOV_TOKEN` - For code coverage (optional)

## Verification

After setting up labels, you can verify everything works by:

1. Creating a test PR with source code changes - should get `source` label
2. Creating a test PR with test changes - should get `tests` label
3. Checking that PR size labels are applied automatically

## Troubleshooting

- **Labels not being applied**: Make sure the labels exist in your repository
- **Workflows not running**: Check repository Settings → Actions → General → Workflow permissions
- **Dependabot not working**: Ensure Dependabot is enabled in repository Settings → Security → Code security and analysis

For more information, see the [GitHub Actions documentation](https://docs.github.com/en/actions).

