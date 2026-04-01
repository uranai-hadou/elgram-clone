import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MessageLog(Base):
    __tablename__ = "message_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    ig_account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("instagram_accounts.id")
    )
    rule_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("autorespond_rules.id"), nullable=True
    )
    direction: Mapped[str] = mapped_column(String(10))  # inbound | outbound
    message_type: Mapped[str] = mapped_column(String(20))  # comment | dm
    sender_ig_id: Mapped[str] = mapped_column(String(100))
    content: Mapped[str] = mapped_column(Text)
    ig_message_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
