from datetime import date
from typing import Dict, Any, List
import httpx
from ..core.config import settings


async def call_gemini_api(prompt: str, system_instruction: str = "") -> str:
    if not settings.GEMINI_API_KEY:
        return ""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "systemInstruction": {"parts": [{"text": system_instruction}]} if system_instruction else None,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1000},
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print("Gemini API call exception:", e)
    return ""


def generate_heuristic_insights(
    user: Dict[str, Any],
    summary: Dict[str, Any],
    category_breakdown: List[Dict[str, Any]],
    festivals: List[Dict[str, Any]],
    events: List[Dict[str, Any]],
    lending_summary: Dict[str, Any],
) -> List[Dict[str, Any]]:
    today = date.today()
    current_month = today.month
    currency = user.get("currency_symbol") or "₹"
    insights = []

    # 1. Indian Cultural & Festival Calendar Alert
    upcoming_festivals = [f for f in festivals if f.get("approx_month") in [current_month, (current_month % 12) + 1]]
    if upcoming_festivals:
        fest = upcoming_festivals[0]
        fest_name = fest.get("name", "Upcoming Festival")
        nudge = fest.get("saving_nudge") or "Plan your festive spending early."
        insights.append({
            "id": "festive_calendar",
            "type": "festival",
            "title": f"Festive Watch: {fest_name}",
            "description": f"{fest.get('description', '')} {nudge}",
            "severity": "info",
            "action_label": "Create Festive Sinking Fund",
            "suggested_action": "create_event",
        })

    # 2. Section 80C Tax Planning (Jan - March)
    if current_month in [1, 2, 3]:
        insights.append({
            "id": "tax_planning_80c",
            "type": "tax",
            "title": "FY End Tax Deadline (March 31)",
            "description": "Ensure your Section 80C (PPF, ELSS, Term Insurance) and Section 80D (Health Insurance) declarations are locked in to prevent salary TDS cuts.",
            "severity": "warning",
            "action_label": "Track Tax Investments",
            "suggested_action": "view_categories",
        })

    # 3. Personal Milestones: DOB & Anniversary Check
    dob_str = user.get("date_of_birth")
    anniv_str = user.get("anniversary_date")

    if dob_str:
        try:
            dob_parts = [int(p) for p in str(dob_str).split("-")]
            if len(dob_parts) == 3 and dob_parts[1] == current_month:
                insights.append({
                    "id": "birthday_month",
                    "type": "milestone",
                    "title": "Birthday Celebration Month! 🎂",
                    "description": f"Happy Birthday month! We recommend setting aside a {currency}3,000 - {currency}8,000 treat buffer so celebrations don't dent your monthly savings.",
                    "severity": "info",
                    "action_label": "Add Birthday Pool",
                    "suggested_action": "create_event",
                })
        except Exception:
            pass

    if anniv_str:
        try:
            ann_parts = [int(p) for p in str(anniv_str).split("-")]
            if len(ann_parts) == 3 and ann_parts[1] == current_month:
                insights.append({
                    "id": "anniversary_month",
                    "type": "milestone",
                    "title": "Anniversary Milestone Approaching! 💐",
                    "description": f"Your anniversary is this month. Consider tracking gifts and dining as an isolated Event Fund to keep normal averages clean.",
                    "severity": "info",
                    "action_label": "Plan Anniversary Budget",
                    "suggested_action": "create_event",
                })
        except Exception:
            pass

    # 4. Burn Rate & Overspending Warning
    total_spent = summary.get("total_spent", 0.0)
    monthly_budget = summary.get("monthly_budget", 0.0)
    budget_pct = summary.get("budget_used_percentage", 0.0)

    if monthly_budget > 0:
        if budget_pct > 80:
            insights.append({
                "id": "budget_exhaustion",
                "type": "risk",
                "title": f"High Budget Utilization ({budget_pct}%)",
                "description": f"You have spent {currency}{total_spent:,.0f} out of your {currency}{monthly_budget:,.0f} budget. Throttle discretionary dining & shopping for the remainder of the month.",
                "severity": "danger",
                "action_label": "Review Spends",
                "suggested_action": "view_expenses",
            })
        elif budget_pct > 50 and today.day < 15:
            insights.append({
                "id": "burn_rate_warning",
                "type": "risk",
                "title": "Faster than Expected Burn Rate",
                "description": f"You have already consumed {budget_pct}% of your budget before the mid of the month. Projected month-end outflow: {currency}{summary.get('projected_month_end', 0):,.0f}.",
                "severity": "warning",
                "action_label": "Check Food & Rides",
                "suggested_action": "view_expenses",
            })

    # 5. High Discretionary Category Detection (Food Delivery / Cabs)
    for cat in category_breakdown:
        cname = cat.get("name", "")
        camt = cat.get("amount", 0.0)
        cpct = cat.get("percentage", 0.0)

        if "Online Food" in cname and cpct >= 25:
            insights.append({
                "id": "food_delivery_surge",
                "type": "opportunity",
                "title": f"Food Delivery Spike ({cpct}% of total spend)",
                "description": f"Swiggy and Zomato orders total {currency}{camt:,.0f} this month. Cooking or opting for office meals 3 days a week can easily save {currency}{round(camt * 0.35, 0):,.0f}.",
                "severity": "warning",
                "action_label": "Optimize Food Spend",
                "suggested_action": "view_expenses",
            })
            break

    # 6. Informal Lending (Udhar) Capital Recovery
    unsettled_lent = lending_summary.get("total_lent_unsettled", 0.0)
    if unsettled_lent > 0:
        insights.append({
            "id": "unsettled_udhar",
            "type": "opportunity",
            "title": f"Recoverable Udhar: {currency}{unsettled_lent:,.0f}",
            "description": f"You have {currency}{unsettled_lent:,.0f} lent to family/friends awaiting settlement. Collecting these receivables directly replenishes your monthly cashflow.",
            "severity": "info",
            "action_label": "View Udhar Ledger",
            "suggested_action": "view_lending",
        })

    return insights


async def answer_user_query(
    query: str,
    user: Dict[str, Any],
    dashboard_data: Dict[str, Any],
    events: List[Dict[str, Any]],
    lending: Dict[str, Any],
) -> str:
    currency = user.get("currency_symbol") or "₹"
    summary = dashboard_data.get("summary", {})
    categories = dashboard_data.get("category_breakdown", [])

    system_prompt = f"""You are DhanMool AI, an expert Indian personal finance advisor with deep knowledge of Indian households, UPI spending habits, festive cycles (Diwali, Eid, Rakhi, weddings), Section 80C tax planning, and informal lending.
App Name: DhanMool ("Your wealth, rooted right.").
User Profile:
- Name: {user.get('full_name')}
- Monthly Budget: {currency}{summary.get('monthly_budget', 0)}
- Spent this month: {currency}{summary.get('total_spent', 0)} ({summary.get('budget_used_percentage', 0)}% used)
- Daily Burn Rate: {currency}{summary.get('daily_burn_rate', 0)}/day
- Top Categories: {', '.join([f"{c['name']} ({currency}{c['amount']})" for c in categories[:4]])}
- Unsettled Udhar Lent: {currency}{lending.get('summary', {}).get('total_lent_outstanding', 0)}

Tone: Warm, highly practical, disciplined, culturally aware, concise. Always address amounts in {currency} and give realistic actionable steps.
"""

    gemini_resp = await call_gemini_api(query, system_instruction=system_prompt)
    if gemini_resp:
        return gemini_resp

    # Fallback intelligent conversational response
    q_lower = query.lower()
    total_spent = summary.get("total_spent", 0)
    budget = summary.get("monthly_budget", 0)

    if "save" in q_lower or "saving" in q_lower:
        top_cats = [c for c in categories if c.get("percentage", 0) > 15]
        top_cat_names = ", ".join([f"{c['name']} ({currency}{c['amount']})" for c in top_cats]) or "discretionary categories"
        return f"To maximize savings this month:\n1. Your heaviest outflows are currently in **{top_cat_names}**.\n2. Setting weekly meal and delivery caps (e.g. max 2 Swiggy/Zomato orders per week) can instantly reclaim ~15-20% of discretionary spend.\n3. Keep your planned vacations and festival spends isolated in DhanMool Sinking Funds so you never dip into emergency funds."

    if "diwali" in q_lower or "festival" in q_lower:
        return f"Indian festivals like Diwali and Dhanteras typically increase household outflows by 30-45%. The DhanMool rule of thumb: Create a dedicated Festive Sinking Fund 6-8 weeks in advance and split your festival bonus: 50% into SIPs/Gold, 30% for gifts and shopping, and 20% for celebrations."

    if "udhar" in q_lower or "lend" in q_lower or "borrow" in q_lower:
        lent_amt = lending.get("summary", {}).get("total_lent_outstanding", 0)
        return f"You currently have **{currency}{lent_amt:,.0f}** in outstanding loans given to friends and family. Because you operate on a Gross Outflow model, each repayment received will be credited as fresh cash inflow on your dashboard. Use the Udhar Tracker to log reminders politely!"

    return f"Based on your spend of {currency}{total_spent:,.0f} against your {currency}{budget:,.0f} target, you are at {summary.get('budget_used_percentage', 0)}% utilization. Your top expense is {categories[0]['name'] if categories else 'general living'}. Maintain a daily cap of {currency}{summary.get('daily_burn_rate', 0)} to stay comfortably within your targets."
