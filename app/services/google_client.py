import gspread
from google.oauth2.service_account import Credentials

from app.config.settings import (
    SPREADSHEET_ID,
    SERVICE_ACCOUNT_FILE,
    SCOPES,
)

creds = Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE,
    scopes=SCOPES,
)

client = gspread.authorize(creds)
spreadsheet = client.open_by_key(SPREADSHEET_ID)

try:
    slots_sheet = spreadsheet.worksheet("Slots")
except gspread.exceptions.WorksheetNotFound:
    slots_sheet = spreadsheet.add_worksheet(title="Slots", rows="100", cols="5")
    slots_sheet.append_row(["slot_date", "premium", "stock_kg", "min_order", "active"])

try:
    sell_slots_sheet = spreadsheet.worksheet("Sell_Slots")
except gspread.exceptions.WorksheetNotFound:
    sell_slots_sheet = spreadsheet.add_worksheet(title="Sell_Slots", rows="100", cols="5")
    sell_slots_sheet.append_row(["slot_date", "premium", "stock_kg", "min_order", "active"])

try:
    orders_sheet = spreadsheet.worksheet("Orders")
except gspread.exceptions.WorksheetNotFound:
    orders_sheet = spreadsheet.add_worksheet(title="Orders", rows="1000", cols="9")
    orders_sheet.append_row([
        "order_id",
        "telegram_id",
        "username",
        "order_type",
        "slot_date",
        "premium",
        "quantity_kg",
        "status",
        "created_at"
    ])

try:
    sell_orders_sheet = spreadsheet.worksheet("Sell Orders")
except gspread.exceptions.WorksheetNotFound:
    sell_orders_sheet = spreadsheet.add_worksheet(title="Sell Orders", rows="1000", cols="9")
    sell_orders_sheet.append_row([
        "order_id",
        "telegram_id",
        "username",
        "order_type",
        "slot_date",
        "premium",
        "quantity_kg",
        "status",
        "created_at"
    ])