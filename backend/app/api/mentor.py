from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.mentor_knowledge import MentorKnowledge
from app.models.mentor_chat_session import MentorChatSession
from app.models.mentor_chat_message import MentorChatMessage
from app.schemas.mentor import (
    KnowledgeOut,
    ChatSessionOut,
    ChatMessageOut,
    ChatRequest,
    ChatResponse,
)
from app.services.mentor import extract_knowledge_from_screenshot, chat_with_mentor

router = APIRouter(prefix="/mentor", tags=["mentor"])


# ── Knowledge ──────────────────────────────────────────────


@router.post("/knowledge/upload", response_model=KnowledgeOut, status_code=201)
async def upload_knowledge(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    image_bytes = await file.read()
    result = await extract_knowledge_from_screenshot(image_bytes, file.filename or "image.png")

    entry = MentorKnowledge(
        user_id=user.id,
        source_filename=file.filename or "image.png",
        extracted_text=result.get("extracted_text", ""),
        summary=result.get("summary", ""),
        category=result.get("category"),
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/knowledge", response_model=list[KnowledgeOut])
async def list_knowledge(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(MentorKnowledge)
        .where(MentorKnowledge.user_id == user.id)
        .order_by(MentorKnowledge.created_at.desc())
    )
    return result.all()


@router.delete("/knowledge/{knowledge_id}", status_code=204)
async def delete_knowledge(
    knowledge_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await db.scalar(
        select(MentorKnowledge).where(
            MentorKnowledge.id == knowledge_id,
            MentorKnowledge.user_id == user.id,
        )
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge not found")
    await db.delete(entry)
    await db.commit()


# ── Chat ───────────────────────────────────────────────────


@router.post("/chat", response_model=ChatResponse)
async def send_chat(
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # セッション取得 or 新規作成
    if body.session_id:
        session = await db.scalar(
            select(MentorChatSession).where(
                MentorChatSession.id == body.session_id,
                MentorChatSession.user_id == user.id,
            )
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = MentorChatSession(user_id=user.id)
        db.add(session)
        await db.flush()

    # ユーザーメッセージ保存
    user_msg = MentorChatMessage(
        session_id=session.id, role="user", content=body.message
    )
    db.add(user_msg)
    await db.flush()

    # 会話履歴を取得（最新50件に制限）
    history_result = await db.scalars(
        select(MentorChatMessage)
        .where(MentorChatMessage.session_id == session.id)
        .order_by(MentorChatMessage.created_at.asc())
        .limit(50)
    )
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in history_result.all()
    ]

    # ナレッジ一覧を取得
    knowledge_result = await db.scalars(
        select(MentorKnowledge.summary).where(
            MentorKnowledge.user_id == user.id
        )
    )
    knowledge_entries = knowledge_result.all()

    # Claude APIで応答生成
    assistant_text = await chat_with_mentor(history, knowledge_entries)

    # アシスタントメッセージ保存
    assistant_msg = MentorChatMessage(
        session_id=session.id, role="assistant", content=assistant_text
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return ChatResponse(
        message=ChatMessageOut.model_validate(assistant_msg),
        session_id=session.id,
    )


@router.get("/chat/sessions", response_model=list[ChatSessionOut])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(MentorChatSession)
        .where(MentorChatSession.user_id == user.id)
        .order_by(MentorChatSession.updated_at.desc())
    )
    return result.all()


@router.get("/chat/sessions/{session_id}", response_model=list[ChatMessageOut])
async def get_session_messages(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await db.scalar(
        select(MentorChatSession).where(
            MentorChatSession.id == session_id,
            MentorChatSession.user_id == user.id,
        )
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.scalars(
        select(MentorChatMessage)
        .where(MentorChatMessage.session_id == session_id)
        .order_by(MentorChatMessage.created_at.asc())
    )
    return result.all()


@router.delete("/chat/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await db.scalar(
        select(MentorChatSession).where(
            MentorChatSession.id == session_id,
            MentorChatSession.user_id == user.id,
        )
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
