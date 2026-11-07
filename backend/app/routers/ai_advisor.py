from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..core.security import get_current_user_payload
from ..core.supabase import supabase
from ..services.nlp_parser import parse_natural_language_expense
from ..services.ai_service import generate_heuristic_insights, answer_user_query

router = APIRouter(prefix="/ai", tags=["AI Advisor & Natural Language Ingestion"])


class NLParseRequest(BaseModel):
    text: str


class ChatRequest(BaseModel):
    message: str


@router.post("/parse-nl")
async def parse_nl(
    req: NLParseRequest, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    categories = await supabase.get(
        "dm_categories",
        {"or": f"(is_default.eq.true,user_id.eq.{user_id})", "order": "id.asc"},
    )
    parsed = parse_natural_language_expense(req.text, categories)
    return parsed


@router.get("/insights")
async def get_ai_insights(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")

    # Fetch user info
    users = await supabase.get("dm_users", {"id": f"eq.{user_id}"})
    user = users[0] if users else {}

    # Fetch dashboard data by calling analytics logic
    from .analytics import get_dashboard_data
    dashboard = await get_dashboard_data(include_events=True, payload=payload)

    # Fetch festivals
    festivals = await supabase.get("dm_festivals", {"order": "approx_month.asc"})

    # Fetch events
    events = await supabase.get("dm_events", {"user_id": f"eq.{user_id}"})

    # Fetch lending summary
    from .lending import list_lending
    lending = await list_lending(payload=payload)

    insights = generate_heuristic_insights(
        user=user,
        summary=dashboard.get("summary", {}),
        category_breakdown=dashboard.get("category_breakdown", []),
        festivals=festivals,
        events=events,
        lending_summary=lending.get("summary", {}),
    )

    return {"insights": insights}


@router.post("/chat")
async def chat_with_advisor(
    req: ChatRequest, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    users = await supabase.get("dm_users", {"id": f"eq.{user_id}"})
    user = users[0] if users else {}

    from .analytics import get_dashboard_data
    dashboard = await get_dashboard_data(include_events=True, payload=payload)

    events = await supabase.get("dm_events", {"user_id": f"eq.{user_id}"})

    from .lending import list_lending
    lending = await list_lending(payload=payload)

    response_text = await answer_user_query(
        query=req.message,
        user=user,
        dashboard_data=dashboard,
        events=events,
        lending=lending,
    )

    return {"response": response_text}
