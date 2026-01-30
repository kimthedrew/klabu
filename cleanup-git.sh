#!/bin/bash

# Script to clean up Git repository and remove node_modules from tracking
# This fixes the GitHub push issue with large files

echo "🧹 Cleaning up Git repository..."
echo ""

# Remove node_modules from Git tracking
echo "Removing node_modules from Git tracking..."
git rm -r --cached backend/node_modules 2>/dev/null || true
git rm -r --cached web/node_modules 2>/dev/null || true

# Add .gitignore if not already tracked
if [ ! -f .gitignore ] || ! git ls-files --error-unmatch .gitignore >/dev/null 2>&1; then
    echo "Adding .gitignore..."
    git add .gitignore
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review the changes: git status"
echo "2. Commit the changes: git commit -m 'Remove node_modules and add .gitignore'"
echo "3. Push to GitHub: git push"
echo ""
echo "⚠️  If you've already pushed large files, you may need to:"
echo "   - Use git filter-branch or BFG Repo-Cleaner to remove them from history"
echo "   - Or start with a fresh repository"
