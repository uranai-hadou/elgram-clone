import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AutoRespondRule(Base):
    __tablename__ = "autorespond_rules"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    ig_account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("instagram_accounts.id")
    )
    name: Mapped[str] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # trigger
    trigger_type: Mapped[str] = mapped_column(
        String(20), default="comment"
    )  # comment | dm | story_mention
    match_type: Mapped[str] = mapped_column(
        String(20), default="contains"
    )  # exact | contains | regex
    trigger_keyword: Mapped[str] = mapped_column(String(500))

    # response
    response_type: Mapped[str] = mapped_column(
        String(20), default="dm"
    )  # comment_reply | dm
    response_message: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="autorespond_rules")
    ig_account = relationship("InstagramAccount")
