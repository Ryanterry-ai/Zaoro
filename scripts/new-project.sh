#!/bin/bash
# Build Engine — New Project Scaffold
# Creates a new project from a template tier
# Usage: bash scripts/new-project.sh <project-name> [static|standard|fullstack]

set -e

PROJECT_NAME="${1:?Usage: new-project.sh <project-name> [tier]}"
TIER="${2:-standard}"
TEMPLATE_DIR="templates/tier-${TIER}"
PROJECT_DIR="projects/${PROJECT_NAME}"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: Template tier '${TIER}' not found at $TEMPLATE_DIR"
  exit 1
fi

if [ -d "$PROJECT_DIR" ]; then
  echo "Error: Project directory already exists: $PROJECT_DIR"
  exit 1
fi

echo "Scaffolding project '${PROJECT_NAME}' from tier '${TIER}'..."

# Copy template
cp -r "$TEMPLATE_DIR" "$PROJECT_DIR"

# Replace placeholders in all files
find "$PROJECT_DIR" -type f -not -path '*/node_modules/*' | while read -r file; do
  if file "$file" | grep -q text; then
    sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file" 2>/dev/null || true
    sed -i "s/{{HERO_TITLE}}/Welcome to ${PROJECT_NAME}/g" "$file" 2>/dev/null || true
    sed -i "s/{{HERO_SUBTITLE}}/Your new site/g" "$file" 2>/dev/null || true
    sed -i "s/{{CTA_TEXT}}/Get Started/g" "$file" 2>/dev/null || true
    sed -i "s/{{CTA_LINK}}/#/g" "$file" 2>/dev/null || true
    sed -i "s/{{ABOUT_TEXT}}/About ${PROJECT_NAME}/g" "$file" 2>/dev/null || true
    sed -i "s/{{CONTACT_TEXT}}/Contact us/g" "$file" 2>/dev/null || true
    sed -i "s/{{YEAR}}/$(date +%Y)/g" "$file" 2>/dev/null || true
  fi
done

# Initialize git
cd "$PROJECT_DIR"
git init -q
cd ../..

echo "Project scaffolded at $PROJECT_DIR"
echo "Tier: $TIER"
echo "Next: cd $PROJECT_DIR && npm install"
