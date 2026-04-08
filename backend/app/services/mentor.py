import base64
import mimetypes

import anthropic

from app.core.config import settings

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


async def extract_knowledge_from_screenshot(
    image_bytes: bytes, filename: str
) -> dict:
    """スクリーンショットからテキストを抽出し、要約・カテゴリを生成する。"""
    media_type = mimetypes.guess_type(filename)[0] or "image/png"
    b64_data = base64.standard_b64encode(image_bytes).decode("utf-8")

    client = _get_client()
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "このスクリーンショットはX(Twitter)上の起業家・経営者の投稿です。\n"
                            "以下の形式でJSON応答してください（他のテキストは含めないでください）:\n\n"
                            '{"extracted_text": "画像内のテキスト全文", '
                            '"summary": "核となるビジネスの教訓を1-2文で要約", '
                            '"category": "カテゴリ（マーケティング/集客/マインドセット/売上/ブランディング/SNS運用/その他のいずれか）"}'
                        ),
                    },
                ],
            }
        ],
    )

    import json

    text = response.content[0].text
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "extracted_text": text,
            "summary": text[:200],
            "category": "その他",
        }


SYSTEM_PROMPT_TEMPLATE = """\
あなたは経験豊富なビジネスメンターです。占い（fortune-telling）ビジネスを経営するオーナーの壁打ち相手として、実践的で具体的なアドバイスを提供します。

## あなたの役割
- ビジネスのスパーリングパートナーとしてアイデアを一緒に考える
- 成功した起業家たちの知見に基づいた助言を行う
- 占いビジネス特有の課題（集客、ブランディング、オンライン展開、リピーター獲得など）を理解している
- 質問には直接的に答えつつ、相手に考えさせる問いかけも行う

## コミュニケーションスタイル
- 日本語で会話する
- 簡潔で実践的なアドバイスを心がける
- 具体的なアクションステップを提示する
- 相手のビジネスの文脈を理解した上で回答する
- 励ましつつも、必要な場合は率直なフィードバックを行う

{knowledge_section}

知見を直接引用するのではなく、自然に会話の中に織り込んでください。相談者の具体的な状況に合わせて応用してください。"""


def _build_system_prompt(knowledge_entries: list[str]) -> str:
    if knowledge_entries:
        numbered = "\n".join(
            f"{i+1}. {entry}" for i, entry in enumerate(knowledge_entries)
        )
        knowledge_section = (
            "## あなたが学んだ起業家の知見\n"
            "以下は、成功した起業家たちのアドバイスから抽出した重要な教訓です。"
            "これらを踏まえてアドバイスしてください：\n\n"
            f"{numbered}"
        )
    else:
        knowledge_section = (
            "## 知見データベース\n"
            "まだ知見データベースが空です。スクリーンショットをアップロードすると、"
            "より具体的なアドバイスができるようになります。"
        )
    return SYSTEM_PROMPT_TEMPLATE.format(knowledge_section=knowledge_section)


async def chat_with_mentor(
    messages: list[dict], knowledge_entries: list[str]
) -> str:
    """ナレッジを踏まえたメンターとしてチャット応答を生成する。"""
    client = _get_client()
    system_prompt = _build_system_prompt(knowledge_entries)

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text
