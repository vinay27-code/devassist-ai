# DevAssist AI 🚀

An AI-Powered Developer Productivity SaaS Platform

## Features
- 🔐 JWT Auth + RBAC
- 📋 Kanban Project Management
- 🤖 AI Code Review (GPT-4o)
- 📝 Auto Documentation Generator
- 🔍 RAG-powered Codebase Chat
- 💳 Stripe Billing (Freemium + Pro)
- 📊 Prometheus + Grafana Monitoring

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL + pgvector
- **AI**: OpenAI API, LangChain
- **Cloud**: AWS (ECS, RDS, S3, CloudFront)
- **DevOps**: Docker, GitHub Actions

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- OpenAI API Key
- Stripe Account

### Setup

```bash
# Clone and install
git clone https://github.com/yourusername/devassist-ai
cd devassist-ai

# Backend
cd backend
cp .env.example .env   # Fill in your values
npm install
npm run db:migrate
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Project Structure
```
devassist-ai/
├── backend/
│   ├── src/
│   │   ├── config/         # DB, env, stripe config
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, error, rate limiting
│   │   ├── models/         # TypeScript interfaces
│   │   ├── routes/         # Express routers
│   │   ├── services/       # Business logic + AI
│   │   └── utils/          # Helpers
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API calls
│   │   ├── store/          # Zustand state
│   │   └── types/          # TypeScript types
└── docker-compose.yml
```

## Deployment
See `/docs/deployment.md` for AWS ECS deployment guide.
