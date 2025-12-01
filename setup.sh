#!/bin/bash

echo "🚀 Setting up Klabu Food Delivery Platform"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Backend setup
echo "📦 Setting up backend..."
cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp env.example .env
    echo "⚠️  Please update .env with your database credentials before continuing"
    echo "   Edit backend/.env and set your DATABASE_URL"
    read -p "Press Enter when you've updated the .env file..."
fi

# Generate Prisma client
echo "Generating Prisma client..."
npm run db:generate

# Push database schema
echo "Pushing database schema..."
npm run db:push

# Seed database
echo "Seeding database with sample data..."
npm run db:seed

echo "✅ Backend setup completed"

# Frontend setup
echo "📦 Setting up frontend..."
cd ../web

# Install dependencies
echo "Installing frontend dependencies..."
npm install

echo "✅ Frontend setup completed"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start the backend: cd backend && npm run dev"
echo "2. Start the frontend: cd web && npm run dev"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "🔑 Test accounts created:"
echo "   Admin: admin@klabu.com / admin123"
echo "   Stall Owner: stall@klabu.com / stall123"
echo "   Delivery Person: delivery@klabu.com / delivery123"
echo ""
echo "📚 Check README.md for detailed documentation"









