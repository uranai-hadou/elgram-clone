from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.instagram_account import InstagramAccount
from app.models.app_settings import AppSettings
from app.schemas.instagram import InstagramAccountOut
from app.services.instagram import exchange_code_for_token, get_instagram_business_account

router = APIRouter(prefix="/accounts", tags=["accounts"])


async def _get_user_settings(user_id: str, db: AsyncSession) -> AppSettings:
    settings = await db.scalar(
        select(AppSettings).where(AppSettings.user_id == user_id)
    )
    if not settings or not settings.meta_app_id or not settings.meta_app_secret:
        raise HTTPException(
            status_code=400,
            detail="Meta App IDとApp Secretを設定画面で先に登録してください",
        )
    return settings


@router.get("/instagram/auth-url")
async def get_auth_url(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the Meta OAuth URL for Instagram authorization."""
    s = await _get_user_settings(user.id, db)
    url = (
        f"https://www.facebook.com/v21.0/dialog/oauth"
        f"?client_id={s.meta_app_id}"
        f"&redirect_uri={s.instagram_redirect_uri}"
        f"&scope=instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_manage_metadata"
        f"&response_type=code"
    )
    return {"auth_url": url}


@router.post("/instagram/connect", response_model=InstagramAccountOut)
async def connect_instagram(
    code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exchange OAuth code and link the Instagram Business Account."""
    s = await _get_user_settings(user.id, db)

    token_data = await exchange_code_for_token(
        s.meta_app_id,
        s.meta_app_secret,
        s.instagram_redirect_uri,
        code,
    )

    ig_data = await get_instagram_business_account(token_data["access_token"])

    # Check if already connected
    existing = await db.scalar(
        select(InstagramAccount).where(
            InstagramAccount.ig_user_id == ig_data["ig_user_id"]
        )
    )
    if existing:
        existing.access_token = ig_data["access_token"]
        existing.username = ig_data["username"]
        await db.commit()
        await db.refresh(existing)
        return existing

    account = InstagramAccount(
        user_id=user.id,
        ig_user_id=ig_data["ig_user_id"],
        username=ig_data["username"],
        access_token=ig_data["access_token"],
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.get("/instagram", response_model=list[InstagramAccountOut])
async def list_accounts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(InstagramAccount).where(InstagramAccount.user_id == user.id)
    )
    return result.all()


@router.delete("/instagram/{account_id}", status_code=204)
async def disconnect_account(
    account_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await db.scalar(
        select(InstagramAccount).where(
            InstagramAccount.id == account_id,
            InstagramAccount.user_id == user.id,
        )
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.delete(account)
    await db.commit()
