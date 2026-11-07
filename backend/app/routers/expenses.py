from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ..core.security import get_current_user_payload
from ..core.supabase import supabase

router = APIRouter(prefix="/expenses", tags=["Expenses"])


class ExpenseCreate(BaseModel):
    amount: float
    category_id: Optional[int] = None
    merchant: Optional[str] = None
    payment_mode: Optional[str] = "UPI"
    spent_at: Optional[date] = None
    notes: Optional[str] = None
    event_id: Optional[str] = None
    shared_project_id: Optional[str] = None
    is_gross_outflow: Optional[bool] = True
    receivable_amount: Optional[float] = 0.0


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category_id: Optional[int] = None
    merchant: Optional[str] = None
    payment_mode: Optional[str] = None
    spent_at: Optional[date] = None
    notes: Optional[str] = None
    event_id: Optional[str] = None
    shared_project_id: Optional[str] = None
    is_gross_outflow: Optional[bool] = None
    receivable_amount: Optional[float] = None


@router.get("/categories")
async def get_categories(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    # Fetch default categories plus user's custom categories
    categories = await supabase.get(
        "dm_categories",
        {"or": f"(is_default.eq.true,user_id.eq.{user_id})", "order": "id.asc"},
    )
    return categories


@router.get("")
async def list_expenses(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2035),
    category_id: Optional[int] = Query(None),
    event_id: Optional[str] = Query(None),
    shared_project_id: Optional[str] = Query(None),
    include_events: Optional[bool] = Query(True),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    payload: dict = Depends(get_current_user_payload),
):
    user_id = payload.get("sub")
    params = {
        "user_id": f"eq.{user_id}",
        "order": "spent_at.desc,created_at.desc",
        "limit": str(limit),
        "offset": str(offset),
        "select": "*,dm_categories(id,name,icon,color),dm_events(id,title,event_type,isolate_from_analytics)",
    }

    if category_id:
        params["category_id"] = f"eq.{category_id}"
    if event_id:
        params["event_id"] = f"eq.{event_id}"
    if shared_project_id:
        params["shared_project_id"] = f"eq.{shared_project_id}"

    # Date range filters
    if year and month:
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year}-{month:02d}-{last_day:02d}"
        params["and"] = f"(spent_at.gte.{start_date},spent_at.lte.{end_date})"
    elif year:
        params["and"] = f"(spent_at.gte.{year}-01-01,spent_at.lte.{year}-12-31)"

    if search:
        params["or"] = f"(merchant.ilike.%{search}%,notes.ilike.%{search}%)"

    expenses = await supabase.get("dm_expenses", params)

    # If the user chooses to isolate sinking funds / events from analytics
    if not include_events:
        expenses = [
            e for e in expenses
            if not e.get("event_id") or not (e.get("dm_events") or {}).get("isolate_from_analytics", False)
        ]

    return expenses


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_expense(
    req: ExpenseCreate, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    data = {
        "user_id": user_id,
        "amount": req.amount,
        "category_id": req.category_id,
        "merchant": req.merchant or "Expense",
        "payment_mode": req.payment_mode or "UPI",
        "spent_at": str(req.spent_at or date.today()),
        "notes": req.notes,
        "event_id": req.event_id,
        "shared_project_id": req.shared_project_id,
        "is_gross_outflow": req.is_gross_outflow if req.is_gross_outflow is not None else True,
        "receivable_amount": req.receivable_amount or 0.0,
    }

    created = await supabase.post("dm_expenses", data)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to log expense.")
    return created[0]


@router.put("/{expense_id}")
async def update_expense(
    expense_id: str,
    req: ExpenseUpdate,
    payload: dict = Depends(get_current_user_payload),
):
    user_id = payload.get("sub")
    # Verify ownership
    existing = await supabase.get("dm_expenses", {"id": f"eq.{expense_id}", "user_id": f"eq.{user_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found.")

    update_data = {}
    for field, val in req.model_dump(exclude_unset=True).items():
        if field == "spent_at" and val:
            update_data[field] = str(val)
        else:
            update_data[field] = val

    if not update_data:
        return existing[0]

    updated = await supabase.patch(
        "dm_expenses", {"id": f"eq.{expense_id}", "user_id": f"eq.{user_id}"}, update_data
    )
    return updated[0] if updated else existing[0]


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    deleted = await supabase.delete(
        "dm_expenses", {"id": f"eq.{expense_id}", "user_id": f"eq.{user_id}"}
    )
    return {"message": "Expense deleted successfully."}
