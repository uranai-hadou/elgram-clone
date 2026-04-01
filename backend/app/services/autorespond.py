import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.autorespond_rule import AutoRespondRule
from app.models.instagram_account import InstagramAccount
from app.models.message_log import MessageLog
from app.services import instagram as ig_service


def matches_rule(rule: AutoRespondRule, text: str) -> bool:
    """Check if incoming text matches the rule's trigger."""
    keyword = rule.trigger_keyword
    if rule.match_type == "exact":
        return text.strip().lower() == keyword.strip().lower()
    elif rule.match_type == "contains":
        return keyword.lower() in text.lower()
    elif rule.match_type == "regex":
        return bool(re.search(keyword, text, re.IGNORECASE))
    return False


async def process_incoming_comment(
    db: AsyncSession,
    ig_user_id: str,
    comment_id: str,
    sender_id: str,
    text: str,
    media_id: str,
):
    """Process an incoming comment and auto-respond if a rule matches."""
    account = await db.scalar(
        select(InstagramAccount).where(InstagramAccount.ig_user_id == ig_user_id)
    )
    if not account:
        return

    # Log inbound
    db.add(
        MessageLog(
            ig_account_id=account.id,
            direction="inbound",
            message_type="comment",
            sender_ig_id=sender_id,
            content=text,
            ig_message_id=comment_id,
        )
    )

    # Find matching rules
    rules = (
        await db.scalars(
            select(AutoRespondRule).where(
                AutoRespondRule.ig_account_id == account.id,
                AutoRespondRule.is_active == True,
                AutoRespondRule.trigger_type == "comment",
            )
        )
    ).all()

    for rule in rules:
        if not matches_rule(rule, text):
            continue

        if rule.response_type == "comment_reply":
            result = await ig_service.reply_to_comment(
                account.access_token, comment_id, rule.response_message
            )
            msg_id = result.get("id")
        else:
            result = await ig_service.send_dm(
                account.access_token, account.ig_user_id, sender_id, rule.response_message
            )
            msg_id = result.get("message_id")

        db.add(
            MessageLog(
                ig_account_id=account.id,
                rule_id=rule.id,
                direction="outbound",
                message_type=rule.response_type,
                sender_ig_id=account.ig_user_id,
                content=rule.response_message,
                ig_message_id=msg_id,
            )
        )
        break  # first match wins

    await db.commit()


async def process_incoming_dm(
    db: AsyncSession,
    ig_user_id: str,
    sender_id: str,
    message_id: str,
    text: str,
):
    """Process an incoming DM and auto-respond if a rule matches."""
    account = await db.scalar(
        select(InstagramAccount).where(InstagramAccount.ig_user_id == ig_user_id)
    )
    if not account:
        return

    db.add(
        MessageLog(
            ig_account_id=account.id,
            direction="inbound",
            message_type="dm",
            sender_ig_id=sender_id,
            content=text,
            ig_message_id=message_id,
        )
    )

    rules = (
        await db.scalars(
            select(AutoRespondRule).where(
                AutoRespondRule.ig_account_id == account.id,
                AutoRespondRule.is_active == True,
                AutoRespondRule.trigger_type == "dm",
            )
        )
    ).all()

    for rule in rules:
        if not matches_rule(rule, text):
            continue

        result = await ig_service.send_dm(
            account.access_token, account.ig_user_id, sender_id, rule.response_message
        )

        db.add(
            MessageLog(
                ig_account_id=account.id,
                rule_id=rule.id,
                direction="outbound",
                message_type="dm",
                sender_ig_id=account.ig_user_id,
                content=rule.response_message,
                ig_message_id=result.get("message_id"),
            )
        )
        break

    await db.commit()
