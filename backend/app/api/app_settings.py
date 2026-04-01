from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.app_settings import AppSettings
from app.schemas.app_settings import AppSettingsUpdate, AppSettingsOut

router = APIRouter(prefix="/settings", tags=["settings"])


def mask_secret(secret: str) -> str:
    if len(secret) <= 6:
        return "*" * len(secret)
    return secret[:3] + "*" * (len(secret) - 6) + secret[-3:]


@router.get("", response_model=AppSettingsOut)
async def get_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await db.scalar(
        select(AppSettings).where(AppSettings.user_id == user.id)
    )
    if not settings:
        settings = AppSettings(user_id=user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return AppSettingsOut(
        meta_app_id=settings.meta_app_id,
        meta_app_secret_masked=mask_secret(settings.meta_app_secret) if settings.meta_app_secret else "",
        webhook_verify_token=settings.webhook_verify_token,
        instagram_redirect_uri=settings.instagram_redirect_uri,
    )


@router.put("", response_model=AppSettingsOut)
async def update_settings(
    body: AppSettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await db.scalar(
        select(AppSettings).where(AppSettings.user_id == user.id)
    )
    if not settings:
        settings = AppSettings(user_id=user.id)
        db.add(settings)

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)

    return AppSettingsOut(
        meta_app_id=settings.meta_app_id,
        meta_app_secret_masked=mask_secret(settings.meta_app_secret) if settings.meta_app_secret else "",
        webhook_verify_token=settings.webhook_verify_token,
        instagram_redirect_uri=settings.instagram_redirect_uri,
    )
