import time
import logging
import asyncio
from datetime import datetime
from telegram.ext import Application
from telegram.error import Forbidden, TelegramError
import gspread

from app.services.google_client import spreadsheet

logger = logging.getLogger(__name__)

def apply_sheet_validation(sheet):
    try:
        sheet_id = sheet.id
        spreadsheet_obj = sheet.spreadsheet
        
        requests = [
            # 1. Clear any old data validations on Columns D, E, F (indices 3 to 6)
            {
                "setDataValidation": {
                    "range": {
                        "sheetId": sheet_id,
                        "startRowIndex": 1,
                        "endRowIndex": 100,
                        "startColumnIndex": 3,
                        "endColumnIndex": 6
                    }
                }
            },
            # 2. Date Validation for Column B (date)
            {
                "setDataValidation": {
                    "range": {
                        "sheetId": sheet_id,
                        "startRowIndex": 1,
                        "endRowIndex": 100,
                        "startColumnIndex": 1,
                        "endColumnIndex": 2
                    },
                    "rule": {
                        "condition": {
                            "type": "DATE_IS_VALID"
                        },
                        "inputMessage": "Double-click to select a valid date",
                        "strict": False,
                        "showCustomUi": True
                    }
                }
            },
            # 3. Status Dropdown List (Column D, index 3)
            {
                "setDataValidation": {
                    "range": {
                        "sheetId": sheet_id,
                        "startRowIndex": 1,
                        "endRowIndex": 100,
                        "startColumnIndex": 3,
                        "endColumnIndex": 4
                    },
                    "rule": {
                        "condition": {
                            "type": "ONE_OF_LIST",
                            "values": [
                                {"userEnteredValue": "PENDING"},
                                {"userEnteredValue": "SENT"},
                                {"userEnteredValue": "EXPIRED"}
                            ]
                        },
                        "inputMessage": "Choose a status from the list",
                        "strict": True,
                        "showCustomUi": True
                    }
                }
            },
            # 4. Format Column B as Date
            {
                "repeatCell": {
                    "range": {
                        "sheetId": sheet_id,
                        "startRowIndex": 1,
                        "endRowIndex": 100,
                        "startColumnIndex": 1,
                        "endColumnIndex": 2
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "numberFormat": {
                                "type": "DATE",
                                "pattern": "yyyy-mm-dd"
                            }
                        }
                    },
                    "fields": "userEnteredFormat.numberFormat"
                }
            },
            # 5. Format Column C as Time
            {
                "repeatCell": {
                    "range": {
                        "sheetId": sheet_id,
                        "startRowIndex": 1,
                        "endRowIndex": 100,
                        "startColumnIndex": 2,
                        "endColumnIndex": 3
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "numberFormat": {
                                "type": "TIME",
                                "pattern": "hh:mm am/pm"
                            }
                        }
                    },
                    "fields": "userEnteredFormat.numberFormat"
                }
            }
        ]
        
        spreadsheet_obj.batch_update({"requests": requests})
        logger.info("Successfully applied data validation rules and cell formatting to Promotions sheet.")
    except Exception as e:
        logger.error("Failed to apply data validation to Promotions sheet: %s", e)


def get_promotions_sheet():
    expected = ["message", "date", "time", "status"]
    try:
        sheet = spreadsheet.worksheet("Promotions")
        headers = [h.strip().lower() for h in sheet.row_values(1)]
        # If headers are 6 columns or missing "date", reset to 4 columns
        if not headers or "date" not in headers or "end_date" in headers or len(headers) > 4:
            sheet.update("A1:D1", [expected])
            # Clear old columns E and F headers
            sheet.update("E1:F1", [["", ""]])
            logger.info("Updated existing 'Promotions' sheet header row to match new 4-column structure.")
            apply_sheet_validation(sheet)
        return sheet
    except gspread.exceptions.WorksheetNotFound:
        # Auto-create the worksheet if not found
        sheet = spreadsheet.add_worksheet(title="Promotions", rows="100", cols="4")
        sheet.append_row(expected)
        apply_sheet_validation(sheet)
        return sheet

def parse_datetime(date_str, time_str) -> datetime:
    date_str = str(date_str).strip()
    time_str = str(time_str).strip()
    
    # Try different date formats
    date_formats = ["%Y-%m-%d", "%d/%m/%Y", "%d-%b-%Y", "%Y/%m/%d"]
    parsed_date = None
    for fmt in date_formats:
        try:
            parsed_date = datetime.strptime(date_str, fmt).date()
            break
        except ValueError:
            continue
            
    if not parsed_date:
        raise ValueError(f"Could not parse date: {date_str}")
        
    # Try different time formats
    time_formats = ["%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p"]
    parsed_time = None
    for fmt in time_formats:
        try:
            parsed_time = datetime.strptime(time_str, fmt).time()
            break
        except ValueError:
            continue
            
    if not parsed_time:
        raise ValueError(f"Could not parse time: {time_str}")
        
    return datetime.combine(parsed_date, parsed_time)

async def get_all_users() -> set:
    user_ids = set()
    
    # 1. From Whitelist
    try:
        whitelist_sheet = spreadsheet.worksheet("Whitelist")
        records = await asyncio.to_thread(whitelist_sheet.get_all_records)
        for row in records:
            tg_id = str(row.get("telegram_id", "")).strip()
            if tg_id:
                user_ids.add(tg_id)
    except Exception as e:
        logger.error("Failed to read Whitelist for users: %s", e)
        
    # 2. From Orders
    try:
        orders_sheet = spreadsheet.worksheet("Orders")
        records = await asyncio.to_thread(orders_sheet.get_all_records)
        for row in records:
            tg_id = str(row.get("telegram_id", "")).strip()
            if tg_id:
                user_ids.add(tg_id)
    except Exception as e:
        logger.error("Failed to read Orders for users: %s", e)

    # 3. From Sell Orders
    try:
        sell_orders_sheet = spreadsheet.worksheet("Sell Orders")
        records = await asyncio.to_thread(sell_orders_sheet.get_all_records)
        for row in records:
            tg_id = str(row.get("telegram_id", "")).strip()
            if tg_id:
                user_ids.add(tg_id)
    except Exception as e:
        logger.error("Failed to read Sell Orders for users: %s", e)
        
    return user_ids

async def check_and_send_promotions(application: Application):
    sheet = await asyncio.to_thread(get_promotions_sheet)
    records = await asyncio.to_thread(sheet.get_all_records)
    
    current_time = datetime.now()
    
    for idx, row in enumerate(records, start=2):
        status = str(row.get("status", "")).strip().upper()
        if status != "PENDING" and status != "":
            continue
            
        message_text = str(row.get("message", "")).strip()
        if not message_text:
            continue
            
        date_str = str(row.get("date", "")).strip()
        time_str = str(row.get("time", "")).strip()
        
        try:
            scheduled_dt = parse_datetime(date_str, time_str)
        except Exception as e:
            logger.error("Row %d: Parsing datetime failed: %s", idx, e)
            continue
            
        # Skip if too old (older than 24 hours) to prevent spamming on bot boot
        if (current_time - scheduled_dt).total_seconds() > 86400:
            logger.info("Row %d: Skip sending promotion because scheduled time is too far in the past: %s", idx, scheduled_dt)
            await asyncio.to_thread(sheet.update, f"D{idx}", [["EXPIRED"]])
            continue
            
        # Check if the scheduled time has arrived or passed
        if current_time >= scheduled_dt:
            logger.info("Row %d: Broadcasting promotion: '%s'", idx, message_text)
            await asyncio.to_thread(sheet.update, f"D{idx}", [["SENDING"]])
            
            user_ids = await get_all_users()
            sent_count = 0
            
            for tg_id in user_ids:
                try:
                    await application.bot.send_message(chat_id=tg_id, text=message_text)
                    logger.info("Sent promotion to: %s", tg_id)
                    sent_count += 1
                except Forbidden:
                    logger.warning("Forbidden: User %s blocked the bot", tg_id)
                except TelegramError as e:
                    logger.error("TelegramError sending to %s: %s", tg_id, e)
                
                await asyncio.sleep(0.05)
                
            logger.info("Promotion broadcast finished. Sent to %d/%d users.", sent_count, len(user_ids))
            await asyncio.to_thread(sheet.update, f"D{idx}", [["SENT"]])

async def promotions_loop(application: Application):
    logger.info("Promotions background loop started")
    while True:
        try:
            await check_and_send_promotions(application)
        except Exception as e:
            logger.error("Error in promotions loop: %s", e)
        await asyncio.sleep(60)
