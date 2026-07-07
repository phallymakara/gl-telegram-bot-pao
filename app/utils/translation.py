# Translation database for English and Khmer.
# Developers can easily edit the values here to modify bot texts and button labels.

TRANSLATIONS = {
    "EN": {
        "welcome": "Welcome to Gold Trading Bot \n\nPlease choose an option:",
        "choose_lang": "Please choose language to continoues / សូមជ្រើសរើសភាសា ដើម្បីបន្ត:",
        "buy": "🟢 BUY",
        "sell": "🔴 SELL",
        "my_orders": "My Orders",
        "done": "Done",
        "back_main": "⬅ Back",
        "back_qty": "⬅ Back",
        "back_slots": "⬅ Back",
        "confirm": "✅ Confirm",
        "cancel": "❌ Cancel",
        "buy_slots_title": "Available BUY slots:\n\nPlease choose a slot:",
        "sell_slots_title": "Available SELL slots:\n\nPlease choose a slot:",
        "order_cancelled": "❌ Order cancelled.",
        "session_expired": "Order session expired. Please start again with /start.",
        "slot_not_found": "Slot not found. Please start again with /start.",
        "slot_format": "Date: {date} | Premium: {premium} | Stock: {stock}kg",
        "selected_slot": "You selected {type} slot: {date}\n\nPlease choose quantity:",
        "order_summary_title": "📋 Order Summary\n\n",
        "type": "Type",
        "slot": "Slot",
        "premium": "Premium",
        "quantity": "Quantity",
        "confirm_prompt": "Please confirm your order.",
        "order_confirmed": "✅ Order confirmed successfully!\n\n",
        "order_id": "Order ID",
        "status": "Status",
        "no_orders": "My Orders\n\nYou do not have any orders yet.",
        "my_orders_title": "My Orders\n\n",
        "switch_lang": "🌐 Switch Language",
        "unauthorized": "⚠️ Sorry, you do not have permission to use this bot. Please contact the administrator. \n\n សូមអភ័យទោស អ្នកមិនមានសិទ្ធិប្រើប្រាស់ Bot នេះទេ។ សូមទាក់ទងអ្នកគ្រប់គ្រង។",
        "slot_out_of_stock": "⚠️ Sorry, this slot is out of stock. Please select another slot.",
    },
    "KH": {
        "welcome": "សូមស្វាគមន៍មកកាន់ Gold Trading Bot 🚀\n\nសូមជ្រើសរើសជម្រើសមួយ:",
        "choose_lang": "Please choose language / សូមជ្រើសរើសភាសា:",
        "buy": "🟢 ទិញ (BUY)",
        "sell": "🔴 លក់ (SELL)", 
        "my_orders": "ការបញ្ជាទិញរបស់ខ្ញុំ",
        "done": "រួចរាល់",
        "back_main": "⬅ ថយក្រោយ",
        "back_qty": "⬅ ថយក្រោយ",
        "back_slots": "⬅ ថយក្រោយ",
        "confirm": "✅ បញ្ជាក់",
        "cancel": "❌ បោះបង់",
        "buy_slots_title": "Slot ទិញ (BUY) ដែលមាន:\n\nសូមជ្រើសរើស slot មួយ:",
        "sell_slots_title": "Slot លក់ (SELL) ដែលមាន:\n\nសូមជ្រើសរើស slot មួយ:",
        "order_cancelled": "❌ ការបញ្ជាទិញត្រូវបានលុបចោល។",
        "session_expired": "វគ្គបញ្ជាទិញបានផុតកំណត់ហើយ។ សូមចាប់ផ្តើមម្តងទៀតជាមួយ /start ។",
        "slot_not_found": "រកមិនឃើញ Slot ទេ។ សូមចាប់ផ្តើមម្តងទៀតជាមួយ /start ។",
        "slot_format": "ថ្ងៃទី: {date} | តម្លៃ: {premium} | មានស្តុកចំនួន: {stock}kg",
        "selected_slot": "អ្នកបានជ្រើសរើស slot {type}: {date}\n\nសូមជ្រើសរើសបរិមាណ:",
        "order_summary_title": "📋 សេចក្តីសង្ខេបនៃការបញ្ជាទិញ\n\n",
        "type": "ប្រភេទ",
        "slot": "Slot",
        "premium": "តម្លៃ",
        "quantity": "បរិមាណ",
        "confirm_prompt": "សូមបញ្ជាក់ការបញ្ជាទិញរបស់អ្នក។",
        "order_confirmed": "✅ ការបញ្ជាទិញបានបញ្ជាក់ដោយជោគជ័យ!\n\n",
        "order_id": "លេខសម្គាល់ការបញ្ជាទិញ",
        "status": "ស្ថានភាព",
        "no_orders": "📋 ការបញ្ជាទិញរបស់ខ្ញុំ\n\nអ្នកមិនទាន់មានការបញ្ជាទិញនៅឡើយទេ។",
        "my_orders_title": "📋 ការបញ្ជាទិញរបស់ខ្ញុំ\n\n",
        "switch_lang": "🌐 ប្តូរភាសា",
        "unauthorized": "⚠️ សូមអភ័យទោស អ្នកមិនមានសិទ្ធិប្រើប្រាស់ Bot នេះទេ។ សូមទាក់ទងអ្នកគ្រប់គ្រង។",
        "slot_out_of_stock": "⚠️ សូមអភ័យទោស Slot នេះអស់ស្តុកហើយ។ សូមជ្រើសរើស Slot ផ្សេងទៀត។",
    }
}


def t(key: str, lang: str = "EN") -> str:
    """
    Retrieve the translated string for a given key and language.
    Defaults to English if the key or language is not found.
    """
    lang_dict = TRANSLATIONS.get(lang.upper(), TRANSLATIONS["EN"])
    return lang_dict.get(key, TRANSLATIONS["EN"].get(key, key))
