import json
from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException
from .config import settings

class SupabaseClient:
    def __init__(self):
        self.base_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def get(self, table: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/{table}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self.headers, params=params)
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Supabase GET error on {table}: {resp.text}"
                )
            return resp.json()

    async def post(self, table: str, data: Dict[str, Any] | List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/{table}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=self.headers, json=data)
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Supabase POST error on {table}: {resp.text}"
                )
            return resp.json() if resp.text else []

    async def patch(self, table: str, match_params: Dict[str, Any], data: Dict[str, Any]) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/{table}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.patch(url, headers=self.headers, params=match_params, json=data)
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Supabase PATCH error on {table}: {resp.text}"
                )
            return resp.json() if resp.text else []

    async def delete(self, table: str, match_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/{table}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(url, headers=self.headers, params=match_params)
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Supabase DELETE error on {table}: {resp.text}"
                )
            return resp.json() if resp.text else []

supabase = SupabaseClient()
