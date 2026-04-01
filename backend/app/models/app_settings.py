import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), unique=True, index=True
    )
    meta_app_id: Mapped[str] = mapped_column(String(255), default="")
    meta_app_secret: Mapped[str] = mapped_column(String(255), default="")
    webhook_verify_token: Mapped[str] = mapped_column(String(255), default="")
    instagram_redirect_uri: Mapped[str] = mapped_column(
        String(500), default="http://localhost:3000/accounts/callback"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
