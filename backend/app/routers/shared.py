from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..core.security import get_current_user_payload
from ..core.supabase import supabase

router = APIRouter(prefix="/shared", tags=["Shared Ledgers (Level 1 & 2)"])


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    project_type: str = "level1_continuous"  # 'level1_continuous' or 'level2_event'
    event_id: Optional[str] = None


class AddMemberRequest(BaseModel):
    user_identifier: str  # Can be user ID (UUID) or email address
    split_ratio: Optional[float] = 1.0


class SharedExpenseCreate(BaseModel):
    amount: float
    category_id: Optional[int] = None
    merchant: Optional[str] = "Shared Expense"
    notes: Optional[str] = None
    spent_at: Optional[date] = None
    payment_mode: Optional[str] = "UPI"


@router.get("/projects")
async def list_projects(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")

    # Fetch memberships for this user
    memberships = await supabase.get(
        "dm_shared_project_members",
        {"user_id": f"eq.{user_id}", "select": "project_id,role,split_ratio"},
    )
    project_ids = [m["project_id"] for m in memberships]

    if not project_ids:
        return []

    # Fetch project details
    in_clause = ",".join(project_ids)
    projects = await supabase.get(
        "dm_shared_projects",
        {"id": f"in.({in_clause})", "order": "created_at.desc"},
    )

    # Enrich with member count and expense totals
    enriched = []
    for p in projects:
        pid = p["id"]
        members = await supabase.get(
            "dm_shared_project_members",
            {"project_id": f"eq.{pid}", "select": "user_id,role,dm_users(id,full_name,email)"},
        )
        expenses = await supabase.get(
            "dm_expenses",
            {"shared_project_id": f"eq.{pid}", "select": "amount"},
        )
        total_spent = sum(float(e.get("amount", 0)) for e in expenses)

        enriched.append({
            **p,
            "member_count": len(members),
            "members": members,
            "total_spent": round(total_spent, 2),
            "is_owner": p.get("created_by") == user_id,
        })

    return enriched


@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(
    req: ProjectCreate, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")

    project_data = {
        "name": req.name,
        "description": req.description,
        "project_type": req.project_type,
        "created_by": user_id,
        "event_id": req.event_id,
    }

    created_project = await supabase.post("dm_shared_projects", project_data)
    if not created_project:
        raise HTTPException(status_code=500, detail="Failed to create shared project.")

    project = created_project[0]
    pid = project["id"]

    # Add creator as owner member
    await supabase.post(
        "dm_shared_project_members",
        {
            "project_id": pid,
            "user_id": user_id,
            "role": "owner",
            "split_ratio": 1.0,
        },
    )

    return project


@router.get("/projects/{project_id}")
async def get_project_details(
    project_id: str, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")

    # Check user is member
    membership = await supabase.get(
        "dm_shared_project_members",
        {"project_id": f"eq.{project_id}", "user_id": f"eq.{user_id}"},
    )
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this project.")

    projects = await supabase.get("dm_shared_projects", {"id": f"eq.{project_id}"})
    if not projects:
        raise HTTPException(status_code=404, detail="Project not found.")
    project = projects[0]

    # Members
    members = await supabase.get(
        "dm_shared_project_members",
        {"project_id": f"eq.{project_id}", "select": "id,user_id,role,split_ratio,dm_users(id,full_name,email)"},
    )

    # Expenses
    expenses = await supabase.get(
        "dm_expenses",
        {
            "shared_project_id": f"eq.{project_id}",
            "order": "spent_at.desc,created_at.desc",
            "select": "*,dm_categories(name,icon,color),dm_users(id,full_name,email)",
        },
    )

    # Calculate settlement balances
    total_spent = sum(float(e.get("amount", 0)) for e in expenses)
    member_count = len(members) or 1
    per_member_share = round(total_spent / member_count, 2)

    # Track how much each member paid
    paid_map = {}
    for e in expenses:
        uid = e.get("user_id")
        paid_map[uid] = paid_map.get(uid, 0.0) + float(e.get("amount", 0))

    settlements = []
    for m in members:
        uid = m["user_id"]
        u_info = m.get("dm_users") or {}
        paid = paid_map.get(uid, 0.0)
        net_balance = round(paid - per_member_share, 2)
        settlements.append({
            "user_id": uid,
            "full_name": u_info.get("full_name", "Unknown"),
            "email": u_info.get("email", ""),
            "total_paid": round(paid, 2),
            "fair_share": per_member_share,
            "net_balance": net_balance,  # >0: should receive, <0: owes
            "role": m.get("role", "member"),
        })

    return {
        **project,
        "total_spent": round(total_spent, 2),
        "expenses": expenses,
        "members": members,
        "settlements": settlements,
    }


@router.post("/projects/{project_id}/members")
async def add_project_member(
    project_id: str,
    req: AddMemberRequest,
    payload: dict = Depends(get_current_user_payload),
):
    user_id = payload.get("sub")

    # Verify requester is member
    membership = await supabase.get(
        "dm_shared_project_members",
        {"project_id": f"eq.{project_id}", "user_id": f"eq.{user_id}"},
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Only existing members can add users.")

    # Find user by ID or email
    target_users = []
    if "@" in req.user_identifier:
        target_users = await supabase.get(
            "dm_users", {"email": f"eq.{req.user_identifier.lower().strip()}"}
        )
    else:
        target_users = await supabase.get(
            "dm_users", {"id": f"eq.{req.user_identifier.strip()}"}
        )

    if not target_users:
        raise HTTPException(
            status_code=404,
            detail=f"User '{req.user_identifier}' not found in DhanMool. Ensure an Admin has registered them.",
        )

    target_user = target_users[0]
    target_id = target_user["id"]

    # Check if already a member
    already_member = await supabase.get(
        "dm_shared_project_members",
        {"project_id": f"eq.{project_id}", "user_id": f"eq.{target_id}"},
    )
    if already_member:
        raise HTTPException(status_code=400, detail="User is already a member of this project.")

    new_member = await supabase.post(
        "dm_shared_project_members",
        {
            "project_id": project_id,
            "user_id": target_id,
            "role": "member",
            "split_ratio": req.split_ratio or 1.0,
        },
    )

    return {
        "message": f"Successfully added {target_user.get('full_name')} to project.",
        "member": new_member[0] if new_member else None,
    }


@router.delete("/projects/{project_id}/members/{target_user_id}")
async def remove_project_member(
    project_id: str,
    target_user_id: str,
    payload: dict = Depends(get_current_user_payload),
):
    user_id = payload.get("sub")
    # Verify owner or self-leave
    project = await supabase.get("dm_shared_projects", {"id": f"eq.{project_id}"})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    is_owner = project[0].get("created_by") == user_id
    if not is_owner and user_id != target_user_id:
        raise HTTPException(status_code=403, detail="Only project owner can remove other members.")

    await supabase.delete(
        "dm_shared_project_members",
        {"project_id": f"eq.{project_id}", "user_id": f"eq.{target_user_id}"},
    )
    return {"message": "Member removed from project."}


@router.post("/projects/{project_id}/expenses", status_code=status.HTTP_201_CREATED)
async def create_project_expense(
    project_id: str,
    req: SharedExpenseCreate,
    payload: dict = Depends(get_current_user_payload),
):
    user_id = payload.get("sub")

    # Verify membership
    membership = await supabase.get(
        "dm_shared_project_members",
        {"project_id": f"eq.{project_id}", "user_id": f"eq.{user_id}"},
    )
    if not membership:
        raise HTTPException(status_code=403, detail="You must be a project member to log expenses.")

    project = await supabase.get("dm_shared_projects", {"id": f"eq.{project_id}"})
    event_id = project[0].get("event_id") if project else None

    expense_data = {
        "user_id": user_id,
        "amount": req.amount,
        "category_id": req.category_id,
        "merchant": req.merchant or "Shared Project Expense",
        "payment_mode": req.payment_mode or "UPI",
        "spent_at": str(req.spent_at or date.today()),
        "notes": req.notes,
        "shared_project_id": project_id,
        "event_id": event_id,
        "is_gross_outflow": True,
    }

    created = await supabase.post("dm_expenses", expense_data)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to log shared expense.")
    return created[0]
