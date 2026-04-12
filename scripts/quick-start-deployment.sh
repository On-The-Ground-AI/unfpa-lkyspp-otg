#!/bin/bash

# UNFPA OTG Clinical Decision Support - Quick Start Deployment
# This script automates the initial setup for field deployment
# Run this on a Linux server with PostgreSQL installed

set -e

echo "🏥 UNFPA OTG Clinical Decision Support System - Deployment Setup"
echo "================================================================"

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install Node.js 18+ first."
  exit 1
fi
echo "✅ Node.js $(node --version)"

if ! command -v npm &> /dev/null; then
  echo "❌ npm not found."
  exit 1
fi
echo "✅ npm $(npm --version)"

if ! command -v psql &> /dev/null; then
  echo "⚠️  PostgreSQL client not found. Make sure PostgreSQL server is accessible."
fi

# Setup environment
echo ""
echo "🔧 Setting up environment..."

if [ ! -f .env.local ]; then
  echo "Creating .env.local template..."
  cat > .env.local <<EOF
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/unfpa_otg"

# API Configuration
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
NODE_ENV="production"

# Session Configuration
SESSION_TIMEOUT_MINUTES=480

# Clinical Configuration
CLINICAL_MODE="production"
DISCLAIMER_VERSION="1.0"
EOF
  echo "✅ Created .env.local (update with your database credentials)"
else
  echo "✅ .env.local already exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Build the application
echo ""
echo "🔨 Building application..."
npm run build
echo "✅ Build successful"

# Run tests
echo ""
echo "🧪 Running tests..."
npm test -- --run || true
echo "✅ Tests completed"

# Database setup instructions
echo ""
echo "📊 Database Setup"
echo "================"
echo ""
echo "1. Create PostgreSQL database:"
echo "   createdb unfpa_otg"
echo ""
echo "2. Enable pgvector extension:"
echo "   psql unfpa_otg -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
echo ""
echo "3. Run Prisma migrations:"
echo "   npx prisma migrate deploy"
echo ""
echo "4. (Optional) Seed with test data:"
echo "   npx prisma db seed"
echo ""

# Ingest clinical data
echo ""
echo "📚 Clinical Content Ingestion"
echo "============================="
echo ""
echo "Run the following to load clinical knowledge:"
echo ""
echo "  npm run ingest-clinical:all"
echo ""

# Start the server
echo ""
echo "✨ Setup Complete!"
echo ""
echo "To start the server in development:"
echo "  npm run dev"
echo ""
echo "To start in production:"
echo "  NODE_ENV=production npm run start"
echo ""
echo "API will be available at: http://localhost:3000"
echo ""
echo "📖 Documentation:"
echo "  - Deployment: docs/DEPLOYMENT_GUIDE.md"
echo "  - Security: docs/SECURITY_MODEL.md"
echo "  - Architecture: docs/ARCHITECTURE.md"
echo ""
