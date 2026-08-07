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
├── app/
│   ├── api/                    # FastAPI application (app.api:app)
│   │   ├── __init__.py         # FastAPI instance, CORS, router registration
│   │   ├── dependencies.py     # DB session dependency
│   │   ├── schemas.py          # Pydantic request/response models
│   │   └── routes/
│   │       ├── auth.py         # POST /api/auth/login, GET /api/auth/me
│   │       ├── users.py        # /api/users
│   │       ├── orders.py       # /api/orders
│   │       ├── slots.py        # /api/slots
│   │       ├── dashboard.py    # /api/dashboard
│   │       ├── alerts.py       # /api/alerts
│   │       ├── settings.py     # /api/settings
│   │       ├── customers.py    # /api/customers
│   │       └── inventory.py    # /api/inventory
│   ├── bot/                    # Telegram bot handlers & flows
│   │   ├── buy_handler.py      # Buy flow entry point
│   │   ├── sell_handler.py     # Sell flow entry point
│   │   ├── order_handler.py    # User order histories
│   │   ├── order_flow.py       # Multi-step order state & quantity selection
│   │   ├── keyboards.py        # Inline keyboard layouts
│   │   ├── messages.py         # Error & status message constants
│   │   └── handlers.py         # Central start & button router
│   ├── config/
│   │   ├── settings.py         # Bot configuration
│   │   └── logger.py           # Unified logger configuration
│   ├── constants/
│   │   ├── callback.py         # Callback query prefix constants
│   │   └── order.py            # Order-related constants
│   ├── core/                   # Core backend configuration
│   │   ├── config.py           # BOT_TOKEN, DATABASE_URL, SECRET_KEY, JWT settings
│   │   ├── database.py         # SQLAlchemy engine, session, Base
│   │   ├── security.py         # Password hashing & JWT helpers
│   │   └── logging.py          # Logging configuration
│   ├── db/
│   │   └── base.py             # Registers all SQLAlchemy models
│   ├── exceptions/
│   │   └── order_exceptions.py # Custom exceptions (Stock, SlotNotFound)
│   ├── models/                 # SQLAlchemy models
│   │   ├── user.py             # Admin users & roles
│   │   ├── customer.py         # Customers / whitelist
│   │   ├── telegram_group.py   # Active telegram groups
│   │   ├── slot_table.py       # Slot tables (inventory)
│   │   ├── slot_row.py         # Slot rows (dates & premiums)
│   │   ├── order.py            # Buy/sell orders
│   │   ├── alert.py            # Alerts
│   │   ├── inventory_transaction.py  # Stock movements
│   │   └── daily_inventory.py  # Daily inventory snapshots
│   ├── services/
│   │   ├── db.py               # Shared DB helpers
│   │   ├── order_service.py    # Buy/sell order wrappers
│   │   ├── slot_service.py     # Stock check, retrieval, deduction
│   │   ├── whitelist_service.py# Whitelisted user validation
│   │   └── promotion_service.py# Promotion broadcasting background loop
│   ├── utils/
│   │   ├── helpers.py          # Invoices and price formatting
│   │   └── translation.py      # Localized text and translation helper
│   ├── main.py                 # Telegram bot entrypoint
│   └── seed.py                 # Seed demo data + admin user
├── frontend/                   # React + Vite + Tailwind admin panel
├── pyproject.toml              # Project dependency settings
├── uv.lock                     # Dependency lockfile
├── .env                        # Environment variables (ignored in git)
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

Create a `.env` file in the root directory:

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
cd gold-telegram-bot
```

### 2. Configure Environment Variables

Create a `.env` file as described above.

### 3. Install Dependencies

Using `uv` (recommended):

```bash
uv sync
```

Using `pip`:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
```

---

## Running the Backend API

The admin API is a FastAPI application exposed at `app.api:app`.

Using `uv`:

```bash
uv run uvicorn app.api:app --host 0.0.0.0 --port 8000
```

Using the virtual environment directly:

```bash
.venv\Scripts\python.exe -m uvicorn app.api:app --host 0.0.0.0 --port 8000
```

- API base URL: `http://localhost:8000`
- Interactive docs (Swagger UI): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

On startup the API creates all database tables automatically (via `Base.metadata.create_all`).

### Seeding Demo Data

```bash
uv run python -m app.seed
```

This creates/drops tables and seeds:

- 8 customers
- 3 slot tables with slot rows
- 20 orders + inventory transactions
- Admin user: `admin` / `admin123`

---

## Running the Telegram Bot

To start the polling bot (which also kicks off the background promotions loop):

```bash
uv run python -m app.main
```

---

## Running the Full Stack with Docker Compose

### Production stack (`db` + `bot` + `api` + `frontend`)

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
| Frontend | `localhost:80` | React admin panel |

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

- **Edit Translations**: To update button texts, welcome responses, or language strings, modify the dictionaries in `app/utils/translation.py`.
- **Log Levels**: Logs are printed using Python's standard logging module. You can check errors or startup flows via stdout logs.
- **Whitelist Cache**: Whitelisted users are cached in memory with a Time-To-Live (TTL) of 5 minutes. To force reload after updating customers, restart the bot or wait for the cache TTL to expire.
