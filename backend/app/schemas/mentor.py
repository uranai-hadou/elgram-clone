from datetime import datetime
from pydantic import BaseModel


class KnowledgeOut(BaseModel):
    id: str
    source_filename: str
    extracted_text: str
    summary: str
    category: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionOut(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    message: ChatMessageOut
    session_id: str
