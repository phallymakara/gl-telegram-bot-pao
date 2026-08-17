# Gold Trading Telegram Bot

A robust, multilingual Telegram bot built in Python to facilitate gold buying and selling. It manages daily/weekly trading slots, processes orders, and tracks customer registrations. A **FastAPI admin API** and a **React admin panel** provide the management frontend, backed by **PostgreSQL** via SQLAlchemy.

---

## Features

- **Multilingual Support**: Supports both **English (EN)** and **Khmer (KH)** languages.
- **Whitelist Restricted Access**: Access is controlled via a whitelist of Telegram users managed in the database.
- **Inventory/Stock Management**: Users can select active slots, view premiums, and request order quantities. The bot automatically validates slot stock before order confirmation and deducts inventory when a buy order is placed.
- **Interactive Session Flow**: A clean, button-based conversational interface prevents typing errors and guides the user step-by-step.
- **Detailed Invoices**: Generates a formatted invoice complete with transaction ID, customer information, and Khmer translation upon order confirmation.
- **Admin API**: REST API for auth, users, orders, slots, dashboard stats, alerts, settings, customers, and inventory.
- **Scheduled Promotions Broadcaster**: A background loop broadcasts scheduled promotional messages to all registered/active bot users.
- **Session Persistence**: Uses `PicklePersistence` to keep user configurations (like chosen language) intact across bot restarts.

---

## Technology Stack

- **Core Language**: Python 3.11+
- **Bot Framework**: [python-telegram-bot](https://github.com/python-telegram-bot/python-telegram-bot) (v22+)
- **Backend API**: [FastAPI](https://fastapi.tiangolo.com/) + `uvicorn`
- **Database**: PostgreSQL + SQLAlchemy 2.0, `alembic` for migrations
- **Auth / Security**: `passlib[bcrypt]`, `python-jose` (JWT)
- **Admin Frontend**: React 18 + Vite + Tailwind CSS (`frontend/`)
- **Package & Runtime Manager**: `uv` (recommended)

---

## Directory Structure

```text
gold-telegram-bot/
├── backend/                    # Python Backend (API & Telegram Bot)
│   ├── app/
│   │   ├── api/                # FastAPI application (app.api:app)
│   │   ├── bot/                # Telegram bot handlers & flows
│   │   ├── config/             # Config & logger
│   │   ├── constants/          # Constants
│   │   ├── core/               # Database, security, core config
│   │   ├── db/                 # Base model imports
│   │   ├── exceptions/         # Custom exceptions
│   │   ├── models/             # SQLAlchemy database models
│   │   ├── services/           # Business logic & services
│   │   ├── utils/              # Helpers & translation
│   │   ├── main.py             # Telegram bot entrypoint
│   │   └── seed.py             # Seed demo data + admin user
│   ├── pyproject.toml          # Backend dependencies
│   ├── uv.lock                 # Dependency lockfile
│   ├── Dockerfile              # Backend container build file
│   └── Dockerfile.dev          # Backend dev container build file
├── frontend/                   # React + Vite + Tailwind admin panel
├── .env                        # Environment variables
├── docker-compose.yml          # Full stack: db + bot + api + frontend
└── docker-compose.dev.yml      # Dev: postgres + pgadmin
```

---

## Prerequisites

1. **Telegram Bot Token**: Created via [@BotFather](https://t.me/BotFather) on Telegram.
2. **PostgreSQL**: Running locally, or via Docker Compose.
3. **Python 3.11+** and [uv](https://docs.astral.sh/uv/) (or pip).

---

## Environment Variables

Create a `.env` file in the root or `backend/` directory:

```ini
BOT_TOKEN=your_telegram_bot_token_here
DATABASE_URL=postgresql://postgres:password@localhost:5050/gold_bot_db
SECRET_KEY=change-this-secret
```

| Variable | Description |
| --- | --- |
| `BOT_TOKEN` | Telegram bot token (required) |
| `DATABASE_URL` | PostgreSQL connection string (default `postgresql://postgres:password@localhost:5432/gold_bot_db`) |
| `SECRET_KEY` | JWT signing secret (default `change-this-secret`) |

---

## Installation & Setup

### 1. Clone the Project

```bash
git clone git@github.com:phallymakara/gold-telegram-bot.git
cd gold-telegram-bot/backend
```

### 2. Configure Environment Variables

Create a `.env` file in `backend/` as described above.

### 3. Install Dependencies

Using `uv` (recommended):

```bash
cd backend
uv sync
```

Using `pip`:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
```

---

## How to Run the Project

To run the full development environment, start the following 4 services across 4 separate terminals:

### Development Architecture

```text
                 DEVELOPMENT

       Docker
         │
         ├── PostgreSQL :5050
         └── pgAdmin    :5051
                │
                │
       ┌────────┴─────────┐
       │                  │
   FastAPI              Telegram
   :8000                   Bot
       │
       │
    React
   :5173
```

---

### Commands to Run the Project (4 Terminals)

Every time you start development, open 4 terminals and run:

#### Terminal 1: PostgreSQL + pgAdmin (Docker)

```bash
cd D:\Company\Project\gl-telegram-bot-pao
docker compose -f docker-compose.dev.yml up -d
```
- **PostgreSQL**: `localhost:5050`
- **pgAdmin**: `localhost:5051` (Login: `admin@goldsystem.com` / `admin`)
- **Check Status**: `docker compose -f docker-compose.dev.yml ps`

#### Terminal 2: FastAPI Backend API

```bash
cd D:\Company\Project\gl-telegram-bot-pao\backend
uv run uvicorn app.api:app --reload --host 0.0.0.0 --port 8000
```
- **API Base**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

> [!NOTE]
> Don't run `uvicorn app.main:app` — `app.main` is your Telegram bot, while `app.api:app` is your FastAPI application.

#### Terminal 3: Telegram Bot

```bash
cd D:\Company\Project\gl-telegram-bot-pao\backend
uv run python -m app.main
```
- Starts the Telegram polling bot and background promotions loop.

#### Terminal 4: React Admin Frontend

```bash
cd D:\Company\Project\gl-telegram-bot-pao\frontend
npm run dev
```
- **Frontend App**: `http://localhost:5173`

---

### Seeding Demo Data (Optional)

To seed initial database records (admin user `admin`/`admin123`, customers, slots, orders):

```bash
cd D:\Company\Project\gl-telegram-bot-pao\backend
uv run python -m app.seed
```

---

## Production Deployment (Docker Compose)

To run the complete production stack in containers (`db` + `bot` + `api` + `frontend`):

```bash
docker compose up --build
```

### Development stack (PostgreSQL + pgAdmin only)

```bash
docker compose -f docker-compose.dev.yml up -d
```

| Service | Host | Description |
| --- | --- | --- |
| PostgreSQL (dev) | `localhost:5050` | Postgres 16, DB `gold_bot_db`, user/pass `postgres`/`password` |
| pgAdmin (dev) | `localhost:5051` | `admin@goldsystem.com` / `admin` |
| API | `localhost:8000` | FastAPI admin API |
| Frontend | `localhost:5173` / `localhost:80` | React admin panel |

---

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Current user info |
| GET/POST | `/api/users` | List / create admin users |
| GET/POST | `/api/orders` | List / create orders |
| GET/POST | `/api/slots` | List / manage slot tables & rows |
| GET | `/api/dashboard` | Dashboard statistics |
| GET/POST | `/api/alerts` | Alerts |
| GET/POST | `/api/settings` | System settings |
| GET/POST | `/api/customers` | Customers / whitelist |
| GET/POST | `/api/inventory` | Inventory & stock movements |
| GET | `/api/health` | Health check |

---

## Development & Customization

- **Edit Translations**: To update button texts, welcome responses, or language strings, modify the dictionaries in `backend/app/utils/translation.py`.
- **Log Levels**: Logs are printed using Python's standard logging module. You can check errors or startup flows via stdout logs.
- **Whitelist Cache**: Whitelisted users are cached in memory with a Time-To-Live (TTL) of 5 minutes. To force reload after updating customers, restart the bot or wait for the cache TTL to expire.

