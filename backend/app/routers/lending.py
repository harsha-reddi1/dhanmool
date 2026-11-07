from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ..core.security import get_current_user_payload
from ..core.supabase import supabase

router = APIRouter(prefix="/lending", tags=["Informal Lending (Udhar Tracker)"])


class LendingCreate(BaseModel):
    contact_name: str
    contact_phone: Optional[str] = None
    contact_type: str = "friend"  # 'family', 'friend', 'colleague', 'other'
    direction: str = "lent"  # 'lent' (I gave money) or 'borrowed' (I took money)
    principal_amount: float
    lent_date: Optional[date] = None
    expected_repayment_date: Optional[date] = None
    notes: Optional[str] = None


class RepaymentCreate(BaseModel):
    amount: float
    repayment_date: Optional[date] = None
    payment_mode: Optional[str] = "UPI"
    notes: Optional[str] = None


@router.get("")
async def list_lending(
    direction: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload),
):
    user_id = payload.get("sub")
    params = {
        "user_id": f"eq.{user_id}",
        "order": "lent_date.desc,created_at.desc",
    }
    dir_val = direction if isinstance(direction, str) else None
    stat_val = status_filter if isinstance(status_filter, str) else None
    if dir_val:
        params["direction"] = f"eq.{dir_val}"
    if stat_val:
        params["status"] = f"eq.{stat_val}"

    records = await supabase.get("dm_informal_lending", params)

    # Calculate summary
    total_lent_outstanding = sum(
        float(r.get("outstanding_amount", 0))
        for r in records
        if r.get("direction") == "lent" and r.get("status") != "settled"
    )
    total_borrowed_outstanding = sum(
        float(r.get("outstanding_amount", 0))
        for r in records
        if r.get("direction") == "borrowed" and r.get("status") != "settled"
    )

    return {
        "records": records,
        "summary": {
            "total_lent_outstanding": round(total_lent_outstanding, 2),
            "total_borrowed_outstanding": round(total_borrowed_outstanding, 2),
            "net_position": round(total_lent_outstanding - total_borrowed_outstanding, 2),
        },
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_lending_record(
    req: LendingCreate, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    data = {
        "user_id": user_id,
        "contact_name": req.contact_name,
        "contact_phone": req.contact_phone,
        "contact_type": req.contact_type,
        "direction": req.direction,
        "principal_amount": req.principal_amount,
        "outstanding_amount": req.principal_amount,
        "lent_date": str(req.lent_date or date.today()),
        "expected_repayment_date": str(req.expected_repayment_date) if req.expected_repayment_date else None,
        "status": "unsettled",
        "notes": req.notes,
    }

    created = await supabase.post("dm_informal_lending", data)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to record lending transaction.")

    # Also log as an expense if user lent money (Gross Outflow)
    if req.direction == "lent":
        # Find category for Family & Friends Support or Miscellaneous
        cats = await supabase.get("dm_categories", {"name": "ilike.*Family & Friends Support*"})
        cat_id = cats[0]["id"] if cats else None
        await supabase.post("dm_expenses", {
            "user_id": user_id,
            "amount": req.principal_amount,
            "category_id": cat_id,
            "merchant": f"Lent to {req.contact_name}",
            "payment_mode": "UPI",
            "spent_at": str(req.lent_date or date.today()),
            "notes": f"Informal Udhar: {req.notes or ''}",
            "is_gross_outflow": True,
            "receivable_amount": req.principal_amount,
        })

    return created[0]


@router.get("/{lending_id}/repayments")
async def get_repayments(
    lending_id: str, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    lending = await supabase.get(
        "dm_informal_lending", {"id": f"eq.{lending_id}", "user_id": f"eq.{user_id}"}
    )
    if not lending:
        raise HTTPException(status_code=404, detail="Lending record not found.")

    repayments = await supabase.get(
        "dm_lending_repayments",
        {"lending_id": f"eq.{lending_id}", "order": "repayment_date.desc"},
    )
    return {"lending": lending[0], "repayments": repayments}


@router.post("/{lending_id}/repayments", status_code=status.HTTP_201_CREATED)
async def add_repayment(
    lending_id: str,
    req: RepaymentCreate,
    payload: dict = Depends(get_current_user_payload),
):
    user_id = payload.get("sub")
    records = await supabase.get(
        "dm_informal_lending", {"id": f"eq.{lending_id}", "user_id": f"eq.{user_id}"}
    )
    if not records:
        raise HTTPException(status_code=404, detail="Lending record not found.")

    record = records[0]
    current_outstanding = float(record.get("outstanding_amount", 0))
    new_outstanding = max(0.0, round(current_outstanding - req.amount, 2))

    new_status = "settled" if new_outstanding == 0 else "partially_paid"

    # Add repayment entry
    rep_data = {
        "lending_id": lending_id,
        "amount": req.amount,
        "repayment_date": str(req.repayment_date or date.today()),
        "payment_mode": req.payment_mode or "UPI",
        "notes": req.notes,
    }
    created_rep = await supabase.post("dm_lending_repayments", rep_data)

    # Update lending record status and outstanding
    await supabase.patch(
        "dm_informal_lending",
        {"id": f"eq.{lending_id}"},
        {"outstanding_amount": new_outstanding, "status": new_status},
    )

    return {
        "repayment": created_rep[0] if created_rep else None,
        "updated_outstanding": new_outstanding,
        "status": new_status,
    }


@router.delete("/{lending_id}")
async def delete_lending(
    lending_id: str, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    await supabase.delete(
        "dm_informal_lending", {"id": f"eq.{lending_id}", "user_id": f"eq.{user_id}"}
    )
    return {"message": "Lending record deleted successfully."}
