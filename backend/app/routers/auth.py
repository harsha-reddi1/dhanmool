from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..core.security import (
    create_access_token,
    get_current_user_payload,
    hash_password,
    verify_password,
)
from ..core.supabase import supabase

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    anniversary_date: Optional[date] = None
    currency_symbol: Optional[str] = "₹"
    monthly_budget_target: Optional[float] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
async def login(req: LoginRequest):
    users = await supabase.get("dm_users", {"email": f"eq.{req.email.lower()}"})
    if not users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    user = users[0]
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated by the administrator.",
        )

    if not verify_password(req.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token_data = {
        "sub": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user.get("role", "member"),
    }
    access_token = create_access_token(token_data)

    user_safe = {k: v for k, v in user.items() if k != "hashed_password"}
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_safe,
    }


@router.get("/me")
async def get_me(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    users = await supabase.get("dm_users", {"id": f"eq.{user_id}"})
    if not users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user = users[0]
    return {k: v for k, v in user.items() if k != "hashed_password"}


@router.put("/profile")
async def update_profile(
    req: ProfileUpdateRequest, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    update_data = {}
    if req.full_name is not None:
        update_data["full_name"] = req.full_name
    if req.date_of_birth is not None:
        update_data["date_of_birth"] = str(req.date_of_birth)
    if req.anniversary_date is not None:
        update_data["anniversary_date"] = str(req.anniversary_date)
    if req.currency_symbol is not None:
        update_data["currency_symbol"] = req.currency_symbol
    if req.monthly_budget_target is not None:
        update_data["monthly_budget_target"] = req.monthly_budget_target

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    updated_users = await supabase.patch("dm_users", {"id": f"eq.{user_id}"}, update_data)
    if not updated_users:
        raise HTTPException(status_code=404, detail="Failed to update profile.")
    return {k: v for k, v in updated_users[0].items() if k != "hashed_password"}


@router.post("/change-password")
async def change_password(
    req: PasswordChangeRequest, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    users = await supabase.get("dm_users", {"id": f"eq.{user_id}"})
    if not users:
        raise HTTPException(status_code=404, detail="User not found.")
    user = users[0]

    if not verify_password(req.current_password, user.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Current password incorrect.")

    new_hash = hash_password(req.new_password)
    await supabase.patch("dm_users", {"id": f"eq.{user_id}"}, {"hashed_password": new_hash})
    return {"message": "Password updated successfully."}
