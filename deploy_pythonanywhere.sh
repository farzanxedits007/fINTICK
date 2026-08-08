#!/bin/bash
# FinTick - one-command PythonAnywhere backend setup.
# Run this from a PythonAnywhere Bash console.
#
# Usage:
#   bash deploy_pythonanywhere.sh <github_repo_url> [github_branch]
#   Example:
#   bash deploy_pythonanywhere.sh https://github.com/yourname/fintik.git main
#
# Expects (set on the Web tab before running):
#   - Working directory /home/<user>/fintik/backend
#   - Virtualenv name "fintik"  (will be created here if missing)

set -e

GITHUB_URL="${1:?Usage: bash deploy_pythonanywhere.sh <github_repo_url> [branch]}"
BRANCH="${2:-main}"
USERNAME=$(whoami)
BASE="/home/$USERNAME"
PROJECT_DIR="$BASE/fintik"
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_DIR="$BASE/.virtualenvs/fintik"

echo "==> FinTick deploy for user: $USERNAME"

# 1. Create virtualenv if missing
if [ ! -d "$VENV_DIR" ]; then
  echo "==> Creating virtualenv at $VENV_DIR"
  mkvirtualenv fintik --python=python3.12
else
  echo "==> Virtualenv already exists: $VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# 2. Clone or update the repo
if [ -d "$PROJECT_DIR/.git" ]; then
  echo "==> Pulling latest code in $PROJECT_DIR"
  cd "$PROJECT_DIR"
  git fetch origin
  git checkout "$BRANCH" 2>/dev/null || true
  git pull origin "$BRANCH"
else
  echo "==> Cloning $GITHUB_URL into $PROJECT_DIR"
  cd "$BASE"
  git clone "$GITHUB_URL" fintik
  cd "$PROJECT_DIR"
  git checkout "$BRANCH" 2>/dev/null || true
fi

# 3. Install dependencies
echo "==> Installing Python dependencies"
cd "$BACKEND_DIR"
pip install -r requirements.txt

# 4. Database setup
echo "==> Running migrations"
python manage.py migrate --noinput
echo "==> Seeding default users (admin/sales1/finance1)"
python manage.py seed_users

# 5. Static files
echo "==> Collecting static files"
python manage.py collectstatic --noinput

echo ""
echo "============================================================"
echo "DONE. Backend is prepared at: $BACKEND_DIR"
echo ""
echo "Remaining manual steps (Web tab):"
echo "  1. Working directory: $BACKEND_DIR"
echo "  2. Virtualenv:        $VENV_DIR"
echo "  3. WSGI file:         edit /var/www/${USERNAME}_pythonanywhere_com_wsgi.py"
echo "                        -> content provided in the docs"
echo "  4. Static files:      URL /static/  ->  $BACKEND_DIR/staticfiles"
echo "  5. Click RELOAD"
echo "============================================================"
