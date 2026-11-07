from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..core.security import get_current_user_payload
from ..core.supabase import supabase

router = APIRouter(prefix="/events", tags=["Events & Sinking Funds"])


class EventCreate(BaseModel):
    title: str
    event_type: str = "vacation"  # vacation, festival, anniversary, birthday, wedding, other
    target_budget: float
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_sinking_fund: Optional[bool] = True
    isolate_from_analytics: Optional[bool] = True
    notes: Optional[str] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = None
    target_budget: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_sinking_fund: Optional[bool] = None
    isolate_from_analytics: Optional[bool] = None
    notes: Optional[str] = None


@router.get("")
async def list_events(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    events = await supabase.get(
        "dm_events",
        {"user_id": f"eq.{user_id}", "order": "start_date.desc.nullslast,created_at.desc"},
    )

    # For each event, aggregate total spent
    all_expenses = await supabase.get(
        "dm_expenses",
        {"user_id": f"eq.{user_id}", "event_id": "not.is.null", "select": "event_id,amount"},
    )
    spend_map = {}
    for exp in all_expenses:
        eid = exp.get("event_id")
        if eid:
            spend_map[eid] = spend_map.get(eid, 0.0) + float(exp.get("amount", 0))

    enriched_events = []
    for ev in events:
        eid = ev["id"]
        total_spent = spend_map.get(eid, 0.0)
        target = float(ev.get("target_budget", 0))
        remaining = max(0.0, target - total_spent)
        pct = min(100.0, (total_spent / target * 100.0)) if target > 0 else 0.0
        enriched_events.append({
            **ev,
            "total_spent": round(total_spent, 2),
            "remaining_budget": round(remaining, 2),
            "progress_percentage": round(pct, 1),
            "is_overbudget": total_spent > target if target > 0 else False,
        })

    return enriched_events


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(
    req: EventCreate, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    data = {
        "user_id": user_id,
        "title": req.title,
        "event_type": req.event_type,
        "target_budget": req.target_budget,
        "start_date": str(req.start_date) if req.start_date else None,
        "end_date": str(req.end_date) if req.end_date else None,
        "is_sinking_fund": req.is_sinking_fund if req.is_sinking_fund is not None else True,
        "isolate_from_analytics": req.isolate_from_analytics if req.isolate_from_analytics is not None else True,
        "notes": req.notes,
    }

    created = await supabase.post("dm_events", data)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to create event.")
    return created[0]


@router.get("/{event_id}")
async def get_event(event_id: str, payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    events = await supabase.get(
        "dm_events", {"id": f"eq.{event_id}", "user_id": f"eq.{user_id}"}
    )
    if not events:
        raise HTTPException(status_code=404, detail="Event not found.")
    event = events[0]

    expenses = await supabase.get(
        "dm_expenses",
        {
            "event_id": f"eq.{event_id}",
            "order": "spent_at.desc",
            "select": "*,dm_categories(id,name,icon,color)",
        },
    )
    total_spent = sum(float(e.get("amount", 0)) for e in expenses)
    target = float(event.get("target_budget", 0))

    return {
        **event,
        "total_spent": round(total_spent, 2),
        "remaining_budget": round(max(0.0, target - total_spent), 2),
        "progress_percentage": round(min(100.0, (total_spent / target * 100.0)) if target > 0 else 0.0, 1),
        "expenses": expenses,
    }


@router.put("/{event_id}")
async def update_event(
    event_id: str, req: EventUpdate, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    existing = await supabase.get(
        "dm_events", {"id": f"eq.{event_id}", "user_id": f"eq.{user_id}"}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found.")

    update_data = {}
    for field, val in req.model_dump(exclude_unset=True).items():
        if field in ["start_date", "end_date"] and val:
            update_data[field] = str(val)
        else:
            update_data[field] = val

    if not update_data:
        return existing[0]

    updated = await supabase.patch(
        "dm_events", {"id": f"eq.{event_id}", "user_id": f"eq.{user_id}"}, update_data
    )
    return updated[0] if updated else existing[0]


@router.delete("/{event_id}")
async def delete_event(event_id: str, payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    await supabase.delete(
        "dm_events", {"id": f"eq.{event_id}", "user_id": f"eq.{user_id}"}
    )
    return {"message": "Event deleted successfully."}
