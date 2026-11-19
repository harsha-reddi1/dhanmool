import re
from typing import Dict, Any, List, Optional


MERCHANT_CATEGORY_MAP = {
    # Food & Dining
    "swiggy": ("Online Food (Swiggy/Zomato)", "UPI"),
    "zomato": ("Online Food (Swiggy/Zomato)", "UPI"),
    "eatclub": ("Online Food (Swiggy/Zomato)", "UPI"),
    "mcdonalds": ("Online Food (Swiggy/Zomato)", "UPI"),
    "mcd": ("Online Food (Swiggy/Zomato)", "UPI"),
    "starbucks": ("Online Food (Swiggy/Zomato)", "UPI"),
    "chai": ("Online Food (Swiggy/Zomato)", "UPI"),
    "tea": ("Online Food (Swiggy/Zomato)", "UPI"),
    "coffee": ("Online Food (Swiggy/Zomato)", "UPI"),
    "lunch": ("Online Food (Swiggy/Zomato)", "UPI"),
    "dinner": ("Online Food (Swiggy/Zomato)", "UPI"),
    "breakfast": ("Online Food (Swiggy/Zomato)", "UPI"),
    "snacks": ("Online Food (Swiggy/Zomato)", "UPI"),
    "snack": ("Online Food (Swiggy/Zomato)", "UPI"),
    "biryani": ("Online Food (Swiggy/Zomato)", "UPI"),
    "pizza": ("Online Food (Swiggy/Zomato)", "UPI"),
    "burger": ("Online Food (Swiggy/Zomato)", "UPI"),
    "kfc": ("Online Food (Swiggy/Zomato)", "UPI"),
    "dominos": ("Online Food (Swiggy/Zomato)", "UPI"),
    "subway": ("Online Food (Swiggy/Zomato)", "UPI"),
    "restaurant": ("Online Food (Swiggy/Zomato)", "UPI"),
    "haldiram": ("Online Food (Swiggy/Zomato)", "UPI"),

    # Groceries
    "blinkit": ("Groceries (Blinkit/Zepto)", "UPI"),
    "zepto": ("Groceries (Blinkit/Zepto)", "UPI"),
    "instamart": ("Groceries (Blinkit/Zepto)", "UPI"),
    "bigbasket": ("Groceries (Blinkit/Zepto)", "UPI"),
    "dmart": ("Groceries (Blinkit/Zepto)", "UPI"),
    "grocery": ("Groceries (Blinkit/Zepto)", "UPI"),
    "groceries": ("Groceries (Blinkit/Zepto)", "UPI"),
    "milk": ("Groceries (Blinkit/Zepto)", "UPI"),
    "vegetables": ("Groceries (Blinkit/Zepto)", "UPI"),
    "veggies": ("Groceries (Blinkit/Zepto)", "UPI"),
    "fruits": ("Groceries (Blinkit/Zepto)", "UPI"),
    "sabzi": ("Groceries (Blinkit/Zepto)", "UPI"),

    # Commute & Travel
    "uber": ("Commute & Cabs (Ola/Uber)", "UPI"),
    "ola": ("Commute & Cabs (Ola/Uber)", "UPI"),
    "rapido": ("Commute & Cabs (Ola/Uber)", "UPI"),
    "metro": ("Commute & Cabs (Ola/Uber)", "Metro"),
    "auto": ("Commute & Cabs (Ola/Uber)", "Cash"),
    "cab": ("Commute & Cabs (Ola/Uber)", "UPI"),
    "petrol": ("Commute & Cabs (Ola/Uber)", "UPI"),
    "diesel": ("Commute & Cabs (Ola/Uber)", "UPI"),
    "fuel": ("Commute & Cabs (Ola/Uber)", "UPI"),
    "toll": ("Commute & Cabs (Ola/Uber)", "UPI"),
    "parking": ("Commute & Cabs (Ola/Uber)", "UPI"),
    "irctc": ("Travel & Vacations", "UPI"),
    "makemytrip": ("Travel & Vacations", "Credit Card"),
    "indigo": ("Travel & Vacations", "Credit Card"),
    "flight": ("Travel & Vacations", "Credit Card"),
    "train": ("Travel & Vacations", "UPI"),

    # Shopping & Fashion
    "amazon": ("Shopping & Fashion", "Credit Card"),
    "flipkart": ("Shopping & Fashion", "UPI"),
    "myntra": ("Shopping & Fashion", "UPI"),
    "ajio": ("Shopping & Fashion", "UPI"),
    "meesho": ("Shopping & Fashion", "UPI"),
    "zara": ("Shopping & Fashion", "Credit Card"),
    "clothes": ("Shopping & Fashion", "UPI"),
    "shopping": ("Shopping & Fashion", "UPI"),

    # Entertainment
    "netflix": ("Entertainment & OTT", "Credit Card"),
    "hotstar": ("Entertainment & OTT", "UPI"),
    "spotify": ("Entertainment & OTT", "UPI"),
    "youtube": ("Entertainment & OTT", "UPI"),
    "prime": ("Entertainment & OTT", "Credit Card"),
    "pvr": ("Entertainment & OTT", "Credit Card"),
    "inox": ("Entertainment & OTT", "Credit Card"),
    "movie": ("Entertainment & OTT", "Credit Card"),

    # Healthcare
    "apollo": ("Healthcare & Medicine", "UPI"),
    "1mg": ("Healthcare & Medicine", "UPI"),
    "pharmacy": ("Healthcare & Medicine", "UPI"),
    "doctor": ("Healthcare & Medicine", "UPI"),
    "medicine": ("Healthcare & Medicine", "UPI"),
    "medicines": ("Healthcare & Medicine", "UPI"),
    "clinic": ("Healthcare & Medicine", "UPI"),

    # Utilities
    "electricity": ("Utilities & Bills", "UPI"),
    "wifi": ("Utilities & Bills", "UPI"),
    "broadband": ("Utilities & Bills", "UPI"),
    "airtel": ("Utilities & Bills", "UPI"),
    "jio": ("Utilities & Bills", "UPI"),
    "recharge": ("Utilities & Bills", "UPI"),
    "cylinder": ("Utilities & Bills", "UPI"),
    "gas": ("Utilities & Bills", "UPI"),
    "rent": ("Rent & Maintenance", "NetBanking"),
    "maintenance": ("Rent & Maintenance", "NetBanking"),
    "maid": ("Rent & Maintenance", "UPI"),
}


def parse_natural_language_expense(
    text: str, categories: List[Dict[str, Any]]
) -> Dict[str, Any]:
    text_lower = text.lower().strip()

    # 1. Extract Amount
    # Matches: ₹450, 450 rs, rs 450, inr 450, 450 bucks, 450
    amount_match = re.search(
        r"(?:(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs\.?|inr|₹|rupees|bucks))",
        text_lower,
    )
    amount = 0.0
    if amount_match:
        val = amount_match.group(1) or amount_match.group(2)
        amount = float(val)
    else:
        # Fallback: look for standalone numbers
        num_matches = re.findall(r"\b\d+(?:\.\d+)?\b", text_lower)
        if num_matches:
            amount = float(num_matches[0])

    # 2. Check for Lending (Udhar) vs Expense
    is_lending = bool(
        re.search(r"\b(lent|loan|gave to|borrowed|udhar|udhari|lend)\b", text_lower)
    )
    lending_direction = "lent"
    if "borrowed" in text_lower or "took from" in text_lower:
        lending_direction = "borrowed"

    contact_name = "Friend"
    if is_lending:
        to_match = re.search(r"(?:to|from|for)\s+([a-zA-Z]+)", text)
        if to_match:
            candidate = to_match.group(1).strip()
            if candidate.lower() not in ["the", "my", "our", "him", "her", "cash", "upi", "card", "rs", "inr", "rupees"]:
                contact_name = candidate.capitalize()

    # 3. Detect Payment Mode
    payment_mode = "UPI"
    if "credit card" in text_lower or "cc" in text_lower:
        payment_mode = "Credit Card"
    elif "debit card" in text_lower or "dc" in text_lower:
        payment_mode = "Debit Card"
    elif "cash" in text_lower:
        payment_mode = "Cash"
    elif "netbanking" in text_lower or "neft" in text_lower or "imps" in text_lower:
        payment_mode = "NetBanking"
    elif "gpay" in text_lower or "phonepe" in text_lower or "paytm" in text_lower or "upi" in text_lower:
        payment_mode = "UPI"

    # 4. Detect Merchant & Category
    detected_category_name = "Family & Friends Support" if is_lending else "Miscellaneous"
    detected_merchant = ""

    for kw, (cat_name, def_mode) in MERCHANT_CATEGORY_MAP.items():
        if kw in text_lower:
            detected_category_name = cat_name
            detected_merchant = kw.capitalize()
            if payment_mode == "UPI" and def_mode != "UPI":
                payment_mode = def_mode
            break

    # If no keyword matched, guess merchant from words
    if not detected_merchant:
        # e.g., "paid 350 at chai point" -> "chai point"
        at_match = re.search(r"(?:at|to|for|on)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:via|by|with|using|rs|inr|₹)|\.|$)", text_lower)
        if at_match:
            detected_merchant = at_match.group(1).strip().title()
        else:
            detected_merchant = "General Expense"

    # 5. Map detected category name to available category_id
    cat_id = None
    for c in categories:
        if c.get("name") == detected_category_name or detected_category_name in c.get("name", ""):
            cat_id = c.get("id")
            break

    if not cat_id and categories:
        cat_id = categories[0].get("id")

    return {
        "amount": round(amount, 2),
        "merchant": contact_name if is_lending else detected_merchant,
        "contact_name": contact_name,
        "category_id": cat_id,
        "category_name": detected_category_name,
        "payment_mode": payment_mode,
        "notes": text.strip(),
        "is_lending": is_lending,
        "lending_direction": lending_direction,
    }
