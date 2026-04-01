from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.app_settings import AppSettings
from app.services.autorespond import process_incoming_comment, process_incoming_dm

router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.get("/instagram")
async def verify_webhook(
    hub_mode: str = "",
    hub_verify_token: str = "",
    hub_challenge: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Meta Webhook verification endpoint. Checks all users' verify tokens."""
    if hub_mode != "subscribe":
        return Response(content="Forbidden", status_code=403)

    result = await db.scalars(select(AppSettings))
    for s in result.all():
        if s.webhook_verify_token and s.webhook_verify_token == hub_verify_token:
            return Response(content=hub_challenge, media_type="text/plain")

    return Response(content="Forbidden", status_code=403)


@router.post("/instagram")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive Instagram webhook events (comments, DMs)."""
    body = await request.json()

    for entry in body.get("entry", []):
        ig_user_id = entry.get("id", "")

        # Comment events
        for change in entry.get("changes", []):
            if change.get("field") == "comments":
                value = change.get("value", {})
                await process_incoming_comment(
                    db=db,
                    ig_user_id=ig_user_id,
                    comment_id=value.get("id", ""),
                    sender_id=value.get("from", {}).get("id", ""),
                    text=value.get("text", ""),
                    media_id=value.get("media", {}).get("id", ""),
                )

        # DM events
        for messaging in entry.get("messaging", []):
            message = messaging.get("message", {})
            if message and not message.get("is_echo"):
                await process_incoming_dm(
                    db=db,
                    ig_user_id=ig_user_id,
                    sender_id=messaging.get("sender", {}).get("id", ""),
                    message_id=message.get("mid", ""),
                    text=message.get("text", ""),
                )

    return {"status": "ok"}
