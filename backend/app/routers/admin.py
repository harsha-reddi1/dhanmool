from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..core.security import get_current_admin_payload, hash_password
from ..core.supabase import supabase

router = APIRouter(prefix="/admin", tags=["Admin Portal"])


class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "member"  # 'admin' or 'member'
    date_of_birth: Optional[date] = None
    anniversary_date: Optional[date] = None
    currency_symbol: Optional[str] = "₹"
    monthly_budget_target: Optional[float] = 0.0


class UserStatusRequest(BaseModel):
    is_active: bool


class ResetPasswordRequest(BaseModel):
    new_password: str


class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    date_of_birth: Optional[date] = None
    anniversary_date: Optional[date] = None
    monthly_budget_target: Optional[float] = None
    currency_symbol: Optional[str] = None


@router.get("/users")
async def list_users(admin_payload: dict = Depends(get_current_admin_payload)):
    users = await supabase.get("dm_users", {"select": "id,email,full_name,role,is_active,created_at,monthly_budget_target,currency_symbol,date_of_birth,anniversary_date", "order": "created_at.desc"})
    return users


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    req: CreateUserRequest,
    admin_payload: dict = Depends(get_current_admin_payload),
):
    existing = await supabase.get("dm_users", {"email": f"eq.{req.email.lower()}"})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{req.email}' already exists.",
        )

    hashed_pw = hash_password(req.password)
    user_payload = {
        "email": req.email.lower(),
        "hashed_password": hashed_pw,
        "full_name": req.full_name,
        "role": req.role if req.role in ["admin", "member"] else "member",
        "date_of_birth": str(req.date_of_birth) if req.date_of_birth else None,
        "anniversary_date": str(req.anniversary_date) if req.anniversary_date else None,
        "currency_symbol": req.currency_symbol or "₹",
        "monthly_budget_target": req.monthly_budget_target or 0.0,
        "is_active": True,
    }

    created = await supabase.post("dm_users", user_payload)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to create user in database.")

    user = created[0]
    return {k: v for k, v in user.items() if k != "hashed_password"}


@router.patch("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    req: UserStatusRequest,
    admin_payload: dict = Depends(get_current_admin_payload),
):
    # Prevent self-deactivation
    if admin_payload.get("sub") == user_id and not req.is_active:
        raise HTTPException(
            status_code=400, detail="Admin cannot deactivate their own account."
        )

    updated = await supabase.patch("dm_users", {"id": f"eq.{user_id}"}, {"is_active": req.is_active})
    if not updated:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": f"User status updated to {'active' if req.is_active else 'inactive'}."}


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    req: ResetPasswordRequest,
    admin_payload: dict = Depends(get_current_admin_payload),
):
    new_hash = hash_password(req.new_password)
    updated = await supabase.patch(
        "dm_users", {"id": f"eq.{user_id}"}, {"hashed_password": new_hash}
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": "User password reset successfully."}


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    req: UpdateUserRequest,
    admin_payload: dict = Depends(get_current_admin_payload),
):
    existing = await supabase.get("dm_users", {"id": f"eq.{user_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found.")

    update_data = {}
    if req.email is not None and req.email.strip() and req.email.lower().strip() != existing[0].get("email"):
        check_email = await supabase.get("dm_users", {"email": f"eq.{req.email.lower().strip()}"})
        if check_email:
            raise HTTPException(status_code=400, detail=f"Email '{req.email}' is already registered.")
        update_data["email"] = req.email.lower().strip()

    if req.full_name is not None and req.full_name.strip():
        update_data["full_name"] = req.full_name.strip()

    if req.role is not None and req.role in ["admin", "member"]:
        update_data["role"] = req.role

    if req.date_of_birth is not None:
        update_data["date_of_birth"] = str(req.date_of_birth)

    if req.anniversary_date is not None:
        update_data["anniversary_date"] = str(req.anniversary_date)

    if req.monthly_budget_target is not None:
        update_data["monthly_budget_target"] = req.monthly_budget_target

    if req.currency_symbol is not None:
        update_data["currency_symbol"] = req.currency_symbol

    if not update_data:
        return {k: v for k, v in existing[0].items() if k != "hashed_password"}

    updated = await supabase.patch("dm_users", {"id": f"eq.{user_id}"}, update_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update user profile.")
    return {k: v for k, v in updated[0].items() if k != "hashed_password"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin_payload: dict = Depends(get_current_admin_payload),
):
    if admin_payload.get("sub") == user_id:
        raise HTTPException(
            status_code=400, detail="Security Safeguard: You cannot delete your own logged-in admin account."
        )

    existing = await supabase.get("dm_users", {"id": f"eq.{user_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found.")

    # 1. Clean up project memberships
    try:
        await supabase.delete("dm_shared_project_members", {"user_id": f"eq.{user_id}"})
    except Exception:
        pass

    # 2. Clean up lending records & repayments
    try:
        lendings = await supabase.get("dm_informal_lending", {"user_id": f"eq.{user_id}"})
        for l in (lendings or []):
            await supabase.delete("dm_lending_repayments", {"lending_id": f"eq.{l['id']}"})
        await supabase.delete("dm_informal_lending", {"user_id": f"eq.{user_id}"})
    except Exception:
        pass

    # 3. Clean up user expenses
    try:
        await supabase.delete("dm_expenses", {"user_id": f"eq.{user_id}"})
    except Exception:
        pass

    # 4. Clean up user events
    try:
        await supabase.delete("dm_events", {"user_id": f"eq.{user_id}"})
    except Exception:
        pass

    # 5. Delete the user record
    await supabase.delete("dm_users", {"id": f"eq.{user_id}"})
    return {"message": f"User account '{existing[0].get('full_name')}' was successfully removed."}


@router.get("/stats")
async def get_admin_stats(admin_payload: dict = Depends(get_current_admin_payload)):
    users = await supabase.get("dm_users", {"select": "id,is_active,role"})
    expenses = await supabase.get("dm_expenses", {"select": "id,amount"})
    projects = await supabase.get("dm_shared_projects", {"select": "id,project_type"})
    lending = await supabase.get("dm_informal_lending", {"select": "id,principal_amount,status"})

    total_users = len(users)
    active_users = sum(1 for u in users if u.get("is_active", True))
    total_expenses_count = len(expenses)
    total_volume = sum(float(e.get("amount", 0)) for e in expenses)
    total_projects = len(projects)
    total_lending_count = len(lending)

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_expenses_count": total_expenses_count,
        "total_spent_volume": total_volume,
        "total_shared_projects": total_projects,
        "total_lending_count": total_lending_count,
    }
