# GitHub Debugging Guide for Neo

GitHub provides several powerful tools for debugging your Neo project. Here's how to use them:

## 🐛 1. GitHub Issues for Bug Tracking

### Creating a Bug Report
1. Go to your repository: https://github.com/yaronmadmon/Neo-1.0
2. Click **Issues** → **New Issue**
3. Select **Bug Report** template
4. Fill in the details:
   - Describe the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Error messages/logs

### Using Labels
- `bug` - General bugs
- `server` - Backend/server issues
- `frontend` - UI/frontend issues
- `integration` - Integration-related bugs
- `critical` - Urgent issues
- `help wanted` - Need assistance

## 🔍 2. GitHub Actions for Automated Debugging

### What's Set Up
- **Debug & Test Workflow** (`.github/workflows/debug.yml`)
  - Runs on every push/PR
  - Builds all packages
  - Type checks TypeScript
  - Validates code structure

### Running Debug Workflows
1. Go to **Actions** tab in GitHub
2. Select a workflow
3. Click **Run workflow** to manually trigger

### Viewing Debug Results
- Check the **Actions** tab for workflow runs
- Review logs for build errors
- See which commits introduced issues

## 📝 3. Code Review for Debugging

### Using Pull Requests
1. Create a branch for your fix:
   ```bash
   git checkout -b fix/bug-description
   ```
2. Make your changes
3. Commit and push:
   ```bash
   git add .
   git commit -m "Fix: description of fix"
   git push origin fix/bug-description
   ```
4. Create a Pull Request on GitHub
5. Reviewers can comment on specific lines
6. Use PR comments to discuss debugging approaches

## 🔎 4. GitHub Search for Finding Issues

### Search Your Code
- Use GitHub's search: `repo:yaronmadmon/Neo-1.0 search-term`
- Find where errors occur
- Track down related code

### Search Issues
- Filter issues by labels
- Search issue titles and descriptions
- Find similar bugs

## 📊 5. GitHub Insights for Debugging

### View Analytics
- **Pulse**: See recent activity and issues
- **Contributors**: Track who's working on what
- **Traffic**: See which files are accessed most

## 🛠️ 6. Debugging Workflow

### When You Find a Bug:

1. **Create an Issue**
   - Use the bug report template
   - Include error logs
   - Add screenshots if UI-related

2. **Create a Debug Branch**
   ```bash
   git checkout -b debug/issue-number
   ```

3. **Add Debug Logging**
   - Add console.log statements
   - Use debugger breakpoints
   - Add error tracking

4. **Test Your Fix**
   - Reproduce the bug
   - Verify the fix works
   - Test edge cases

5. **Create a Pull Request**
   - Link to the issue: `Fixes #123`
   - Describe your fix
   - Request review

6. **Merge After Review**
   - Get approval
   - Merge to main
   - Close the issue

## 🚨 7. Debugging Common Issues

### Server 500 Errors
- Check server logs in Actions
- Review route registration
- Verify dependencies

### TypeScript Errors
- Check Actions workflow for type errors
- Review build logs
- Fix type definitions

### Integration Issues
- Check integration configs
- Verify API keys (without exposing them)
- Test integration endpoints

## 📋 8. Best Practices

### Issue Management
- ✅ One issue per bug
- ✅ Clear, descriptive titles
- ✅ Include reproduction steps
- ✅ Add labels for categorization
- ✅ Link related issues

### Commit Messages
- ✅ Use clear messages: `Fix: description`
- ✅ Reference issues: `Fix #123: description`
- ✅ Group related changes

### Pull Requests
- ✅ Small, focused PRs
- ✅ Describe what and why
- ✅ Link to related issues
- ✅ Request specific reviewers

## 🔗 Quick Links

- **Issues**: https://github.com/yaronmadmon/Neo-1.0/issues
- **Actions**: https://github.com/yaronmadmon/Neo-1.0/actions
- **Pull Requests**: https://github.com/yaronmadmon/Neo-1.0/pulls

## 💡 Pro Tips

1. **Use GitHub Desktop** for easier Git operations
2. **Enable GitHub Copilot** for debugging assistance
3. **Set up branch protection** to prevent breaking main
4. **Use GitHub Discussions** for questions (not bugs)
5. **Create debugging checklists** in issues

---

**Need help?** Create an issue with the `help wanted` label!
