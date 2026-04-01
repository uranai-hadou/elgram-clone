from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.autorespond_rule import AutoRespondRule
from app.models.message_log import MessageLog
from app.schemas.autorespond import (
    AutoRespondRuleCreate,
    AutoRespondRuleUpdate,
    AutoRespondRuleOut,
    MessageLogOut,
)

router = APIRouter(prefix="/autorespond", tags=["autorespond"])


@router.get("/rules", response_model=list[AutoRespondRuleOut])
async def list_rules(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(AutoRespondRule)
        .where(AutoRespondRule.user_id == user.id)
        .order_by(AutoRespondRule.created_at.desc())
    )
    return result.all()


@router.post("/rules", response_model=AutoRespondRuleOut, status_code=201)
async def create_rule(
    body: AutoRespondRuleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = AutoRespondRule(user_id=user.id, **body.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.get("/rules/{rule_id}", response_model=AutoRespondRuleOut)
async def get_rule(
    rule_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = await db.scalar(
        select(AutoRespondRule).where(
            AutoRespondRule.id == rule_id, AutoRespondRule.user_id == user.id
        )
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.patch("/rules/{rule_id}", response_model=AutoRespondRuleOut)
async def update_rule(
    rule_id: str,
    body: AutoRespondRuleUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = await db.scalar(
        select(AutoRespondRule).where(
            AutoRespondRule.id == rule_id, AutoRespondRule.user_id == user.id
        )
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)

    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = await db.scalar(
        select(AutoRespondRule).where(
            AutoRespondRule.id == rule_id, AutoRespondRule.user_id == user.id
        )
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()


@router.get("/logs", response_model=list[MessageLogOut])
async def list_logs(
    ig_account_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(MessageLog)
        .join(
            AutoRespondRule,
            MessageLog.ig_account_id == AutoRespondRule.ig_account_id,
            isouter=True,
        )
        .where(AutoRespondRule.user_id == user.id)
    )
    if ig_account_id:
        query = query.where(MessageLog.ig_account_id == ig_account_id)
    query = query.order_by(MessageLog.created_at.desc()).offset(offset).limit(limit)

    result = await db.scalars(query)
    return result.all()


@router.get("/stats")
async def get_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_rules = await db.scalar(
        select(func.count()).where(AutoRespondRule.user_id == user.id)
    )
    active_rules = await db.scalar(
        select(func.count()).where(
            AutoRespondRule.user_id == user.id, AutoRespondRule.is_active == True
        )
    )
    total_responses = await db.scalar(
        select(func.count())
        .select_from(MessageLog)
        .join(AutoRespondRule, MessageLog.rule_id == AutoRespondRule.id)
        .where(AutoRespondRule.user_id == user.id, MessageLog.direction == "outbound")
    )
    return {
        "total_rules": total_rules or 0,
        "active_rules": active_rules or 0,
        "total_responses": total_responses or 0,
    }
