# Denmark Ecosystem Map 🇩🇰

An interactive map showcasing Denmark's startup ecosystem — companies, investors, accelerators, and incubators.

![Map Preview](https://img.shields.io/badge/Companies-4,977-blue) ![Investors](https://img.shields.io/badge/Investors-37-green) ![Status](https://img.shields.io/badge/Status-Active-success)

## Features

- 🗺️ **Interactive Map** — Browse startups by location with Leaflet clustering
- 🔍 **Search & Filter** — Find companies by name, industry, or CVR
- ✅ **CVR Verification** — Companies validated against Danish CVR registry
- 📝 **Report System** — Flag potentially inactive companies for review
- ➕ **Add Companies** — Submit new startups to the ecosystem

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JS, Leaflet, Vite |
| Backend | Express.js |
| Database | Supabase (PostgreSQL) |
| Deployment | Docker, Google Cloud Run |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

## Project Structure

```
├── data/               # JSON data files (legacy)
├── docs/               # Documentation
├── scripts/            # Utility scripts
│   ├── migrate_to_supabase.js
│   └── validate_cvr.py
├── src/
│   ├── components/     # UI components
│   ├── lib/            # Shared utilities
│   │   └── supabase.js
│   └── styles/
├── supabase/
│   └── schema.sql      # Database schema
├── server.js           # Express API server
└── index.html          # Entry point
```

## Database

Data is stored in Supabase PostgreSQL:

| Table | Description |
|-------|-------------|
| `companies` | Startups and tech companies |
| `investors` | VCs, accelerators, incubators |
| `reports` | User-submitted issue reports |

### Migration

To migrate JSON data to Supabase:

```bash
node scripts/migrate_to_supabase.js
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm start` | Run Express server |
| `npm run build:prod` | Build + copy data files |

## Deployment

See [DEPLOY.md](DEPLOY.md) for Google Cloud Run deployment instructions.

## Data Sources

- [The Hub](https://thehub.io) — Danish startup job board
- [CVR API](https://cvrapi.dk) — Danish business registry

## License

Private project. All rights reserved.
