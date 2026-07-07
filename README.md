# Gold Trading Telegram Bot

A robust, multilingual Telegram bot built in Python to facilitate gold buying and selling. It manages daily/weekly trading slots, processes orders, and tracks customer registrations. Google Sheets is used as the database and administrator panel, enabling easy data management and live updates.

---

## Features

- **Multilingual Support**: Supports both **English (EN)** and **Khmer (KH)** languages.
- **Whitelist Restricted Access**: Access is controlled via a whitelisted group of users specified in a Google Sheet. If a whitelisted user connects, the bot automatically populates their missing Telegram ID.
- **Inventory/Stock Management**: Users can select active slots, view premiums, and request order quantities. The bot automatically validates slot stock before order confirmation and deducts inventory from Google Sheets when a buy order is placed.
- **Interactive Session Flow**: A clean, button-based conversational interface prevents typing errors and guides the user step-by-step.
- **Detailed Invoices**: Generates a formatted invoice complete with transaction ID, customer information, and Khmer translation upon order confirmation.
- **Scheduled Promotions Broadcaster**: A background loop polls the `Promotions` sheet to broadcast scheduled promotional messages to all registered/active bot users.
- **Session Persistence**: Uses `PicklePersistence` to keep user configurations (like chosen language) intact across bot restarts.

---

## Technology Stack

- **Core Language**: Python 3.11+
- **Bot Framework**: [python-telegram-bot](https://github.com/python-telegram-bot/python-telegram-bot) (v22+)
- **Sheets Integration**: [gspread](https://github.com/burnash/gspread) & `google-auth`
- **Configuration & Environment**: `python-dotenv`
- **Package & Runtime Manager**: `uv` (recommended)

---

## Directory Structure

```text
gold-telegram-bot/
├── app/
│   ├── bot/
│   │   ├── buy_handler.py     # Handles the buy flow entry point
│   │   ├── sell_handler.py    # Handles the sell flow entry point
│   │   ├── order_handler.py   # Handles user order histories
│   │   ├── order_flow.py      # Multi-step order state & quantity selections
│   │   ├── keyboards.py       # Inline keyboards layouts
│   │   ├── messages.py        # Error & status messaging constants
│   │   └── handlers.py        # Central start & button router
│   ├── config/
│   │   ├── settings.py        # Spreadsheet ID, file references, and API scopes
│   │   └── logger.py          # Unified logger configuration
│   ├── constants/
│   │   └── callback.py        # Callback query prefix constants
│   ├── exceptions/
│   │   └── order_exceptions.py# Custom Exceptions (Stock, SlotNotFound)
│   ├── models/
│   │   ├── order.py           # Dataclass structure representing an Order
│   │   └── slot.py            # Dataclass structure representing a Slot
│   ├── services/
│   │   ├── google_client.py   # gspread client authentication
│   │   ├── whitelist_service.py # Handles whitelisted user validation
│   │   ├── slot_service.py    # Stock check, retrieval, and deduction
│   │   ├── order_service.py   # Wrappers for placing buy/sell orders
│   │   ├── order_sheet_service.py # Direct read/write operations for Orders
│   │   └── promotion_service.py # Promotion broadcasting background routine
│   ├── utils/
│   │   ├── helpers.py         # Invoices and price formatting
│   │   └── translation.py     # Localized text and translation helper
│   └── main.py                # Application entrypoint
├── pyproject.toml             # Project dependency settings
├── uv.lock                    # Dependency lockfile
├── service_account.json       # Google Cloud credential (ignored in git)
└── .env                       # Local environment variables (ignored in git)
```

---

## Prerequisites

Before running the bot, you will need:

1. **Telegram Bot Token**: Created via [@BotFather](https://t.me/BotFather) on Telegram.
2. **Google Cloud Project & Service Account**:
   - Enable **Google Drive API** and **Google Sheets API**.
   - Create a Service Account and download the key file as a JSON.
   - Save this JSON file in the root directory of the project, renamed to `service_account.json`.
3. **Google Spreadsheet**:
   - Create a Google Spreadsheet and capture its ID from the URL (e.g., `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`).
   - Share the spreadsheet with the `client_email` found in your `service_account.json` (give it Editor access).
   - Configure the spreadsheet worksheets and columns as described below.

---

## Google Spreadsheet Schema

The bot communicates with six worksheets inside your spreadsheet. Ensure your Google Sheet contains these sheets with these exact header names (case-sensitive) in the first row:

### 1. `Whitelist`
Allows access restriction.
- **Columns**: `username`, `telegram_id`
- *Note*: You can manually pre-fill `username`s (without the `@` prefix). When the user initiates a command, the bot automatically fills their `telegram_id`.

### 2. `Slots` (Buy Slots)
Inventory options available for purchasing.
- **Columns**: `slot_date`, `premium`, `stock_kg`, `min_order`, `active`
- **Values for `active`**: `YES` or `NO`

### 3. `Sell_Slots` (Sell Slots)
Inventory options available for selling.
- **Columns**: `slot_date`, `premium`, `stock_kg`, `min_order`, `active`
- **Values for `active`**: `YES` or `NO`

### 4. `Orders` (Buy Orders)
Automatically populated by the bot when a buy order is confirmed.
- **Columns**: `order_id`, `telegram_id`, `username`, `order_type`, `slot_date`, `premium`, `quantity_kg`, `status`, `created_at`

### 5. `Sell Orders`
Automatically populated by the bot when a sell order is confirmed.
- **Columns**: `order_id`, `telegram_id`, `username`, `order_type`, `slot_date`, `premium`, `quantity_kg`, `status`, `created_at`

### 6. `Promotions`
Broadcast scheduler. The bot loops every 60 seconds looking for pending broadcasts.
- **Columns**: `message`, `date`, `time`, `status`
- **Format**:
  - `date`: `YYYY-MM-DD`
  - `time`: `HH:MM` or `HH:MM:SS` or `HH:MM AM/PM`
  - `status`: Mark as `PENDING` to enqueue. The bot changes this to `SENDING`, then `SENT` once successfully broadcast to all registered users, or `EXPIRED` if scheduled more than 24 hours in the past.

---

## Installation & Setup

### 1. Clone the Project
```bash
git clone git@github.com:phallymakara/gold-telegram-bot.git
cd gold-telegram-bot
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and add your Telegram bot token:
```ini
BOT_TOKEN=your_telegram_bot_token_here
```

### 3. Set Up Google Credentials
Place your downloaded Google Cloud service account JSON in the root directory under the filename `service_account.json`.

### 4. Set Spreadsheet ID
Open [app/config/settings.py](file:///Users/macbook/Documents/Project/gold-telegram-bot/app/config/settings.py) and change the `SPREADSHEET_ID` to match your Google Spreadsheet ID:
```python
SPREADSHEET_ID = "your_google_spreadsheet_id_here"
```

### 5. Install Dependencies

You can install dependencies using either `uv` or standard Python `pip`.

#### Option A: Using `uv` (Recommended)
`uv` is extremely fast and will configure the virtual environment automatically.
```bash
# Install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies and sync virtual environment
uv sync
```

#### Option B: Using Python `pip`
Create a virtual environment and install dependencies:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

---

## Running the Bot

To start the polling bot (which also kicks off the background promotions loop):

Using `uv`:
```bash
uv run python -m app.main
```

Using Python directly (ensure virtual environment is active):
```bash
python -m app.main
```

---

## Development & Customization

- **Edit Translations**: To update button texts, welcome responses, or language strings, modify the dictionaries in [app/utils/translation.py](file:///Users/macbook/Documents/Project/gold-telegram-bot/app/utils/translation.py).
- **Log Levels**: Logs are printed using Python's standard logging module. You can check errors or startup flows via stdout logs.
- **Cache**: Whitelisted users are cached in memory with a Time-To-Live (TTL) of 5 minutes. To force reload after updating the Whitelist worksheet, restart the bot or wait for the cache TTL to expire.
