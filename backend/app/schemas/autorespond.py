from datetime import datetime
from pydantic import BaseModel


class AutoRespondRuleCreate(BaseModel):
    ig_account_id: str
    name: str
    trigger_type: str = "comment"  # comment | dm | story_mention
    match_type: str = "contains"  # exact | contains | regex
    trigger_keyword: str
    response_type: str = "dm"  # comment_reply | dm
    response_message: str


class AutoRespondRuleUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    trigger_type: str | None = None
    match_type: str | None = None
    trigger_keyword: str | None = None
    response_type: str | None = None
    response_message: str | None = None


class AutoRespondRuleOut(BaseModel):
    id: str
    ig_account_id: str
    name: str
    is_active: bool
    trigger_type: str
    match_type: str
    trigger_keyword: str
    response_type: str
    response_message: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageLogOut(BaseModel):
    id: str
    ig_account_id: str
    rule_id: str | None
    direction: str
    message_type: str
    sender_ig_id: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
