import calendar
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from ..core.security import get_current_user_payload
from ..core.supabase import supabase

router = APIRouter(prefix="/analytics", tags=["Dashboards & Analytics"])


@router.get("/dashboard")
async def get_dashboard_data(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2035),
    include_events: bool = Query(True),
    payload: dict = Depends(get_current_user_payload),
):
    user_id = payload.get("sub")
    today = date.today()
    selected_month = month if isinstance(month, int) else today.month
    selected_year = year if isinstance(year, int) else today.year
    inc_events = include_events if isinstance(include_events, bool) else True

    # User profile for budget targets
    users = await supabase.get("dm_users", {"id": f"eq.{user_id}"})
    user = users[0] if users else {}
    monthly_budget = float(user.get("monthly_budget_target") or 0.0)

    # Date range for selected month
    last_day = calendar.monthrange(selected_year, selected_month)[1]
    start_date = f"{selected_year}-{selected_month:02d}-01"
    end_date = f"{selected_year}-{selected_month:02d}-{last_day:02d}"

    # Fetch all expenses for this month
    params = {
        "user_id": f"eq.{user_id}",
        "and": f"(spent_at.gte.{start_date},spent_at.lte.{end_date})",
        "select": "*,dm_categories(id,name,icon,color),dm_events(id,title,isolate_from_analytics)",
        "order": "spent_at.asc",
    }
    all_expenses = await supabase.get("dm_expenses", params)

    # Separate baseline expenses vs isolated event expenses
    filtered_expenses = []
    isolated_event_spend = 0.0
    for exp in all_expenses:
        is_isolated_event = False
        if exp.get("event_id") and exp.get("dm_events"):
            if exp["dm_events"].get("isolate_from_analytics", False):
                is_isolated_event = True
                isolated_event_spend += float(exp.get("amount", 0))

        if inc_events or not is_isolated_event:
            filtered_expenses.append(exp)

    total_spent = sum(float(e.get("amount", 0)) for e in filtered_expenses)

    # Category breakdown
    category_map = {}
    for e in filtered_expenses:
        cat_info = e.get("dm_categories") or {}
        cat_name = cat_info.get("name") or "Uncategorized"
        cat_color = cat_info.get("color") or "#6366F1"
        cat_icon = cat_info.get("icon") or "Tag"

        if cat_name not in category_map:
            category_map[cat_name] = {
                "name": cat_name,
                "amount": 0.0,
                "color": cat_color,
                "icon": cat_icon,
                "count": 0,
            }
        category_map[cat_name]["amount"] += float(e.get("amount", 0))
        category_map[cat_name]["count"] += 1

    category_breakdown = sorted(
        list(category_map.values()), key=lambda x: x["amount"], reverse=True
    )
    for c in category_breakdown:
        c["amount"] = round(c["amount"], 2)
        c["percentage"] = round((c["amount"] / total_spent * 100), 1) if total_spent > 0 else 0

    # Daily timeline for the month
    daily_spend = {day: 0.0 for day in range(1, last_day + 1)}
    for e in filtered_expenses:
        try:
            spent_dt = datetime.strptime(e.get("spent_at", ""), "%Y-%m-%d")
            daily_spend[spent_dt.day] += float(e.get("amount", 0))
        except Exception:
            pass

    timeline = [
        {"day": d, "date": f"{selected_year}-{selected_month:02d}-{d:02d}", "amount": round(daily_spend[d], 2)}
        for d in range(1, last_day + 1)
    ]

    # Payment mode breakdown
    payment_map = {}
    for e in filtered_expenses:
        pm = e.get("payment_mode") or "UPI"
        payment_map[pm] = payment_map.get(pm, 0.0) + float(e.get("amount", 0))
    payment_breakdown = [
        {"mode": k, "amount": round(v, 2)} for k, v in payment_map.items()
    ]

    # Lending summary
    lending_records = await supabase.get("dm_informal_lending", {"user_id": f"eq.{user_id}"})
    total_lent_unsettled = sum(
        float(r.get("outstanding_amount", 0))
        for r in lending_records
        if r.get("direction") == "lent" and r.get("status") != "settled"
    )
    total_borrowed_unsettled = sum(
        float(r.get("outstanding_amount", 0))
        for r in lending_records
        if r.get("direction") == "borrowed" and r.get("status") != "settled"
    )

    # Calculate days passed in month for burn rate
    days_in_calc = today.day if (today.month == selected_month and today.year == selected_year) else last_day
    daily_burn_rate = round(total_spent / max(1, days_in_calc), 2)
    projected_month_end = round(daily_burn_rate * last_day, 2)

    return {
        "summary": {
            "selected_month": selected_month,
            "selected_year": selected_year,
            "total_spent": round(total_spent, 2),
            "monthly_budget": monthly_budget,
            "budget_used_percentage": round((total_spent / monthly_budget * 100), 1) if monthly_budget > 0 else 0,
            "daily_burn_rate": daily_burn_rate,
            "projected_month_end": projected_month_end,
            "isolated_event_spend": round(isolated_event_spend, 2),
            "total_transactions": len(filtered_expenses),
            "total_lent_unsettled": round(total_lent_unsettled, 2),
            "total_borrowed_unsettled": round(total_borrowed_unsettled, 2),
        },
        "category_breakdown": category_breakdown,
        "timeline": timeline,
        "payment_breakdown": payment_breakdown,
        "recent_expenses": filtered_expenses[:10],
    }
