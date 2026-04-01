import httpx

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


async def exchange_code_for_token(
    app_id: str, app_secret: str, redirect_uri: str, code: str
) -> dict:
    """Exchange OAuth code for a short-lived token, then get a long-lived token."""
    async with httpx.AsyncClient() as client:
        # Short-lived token
        resp = await client.get(
            f"{GRAPH_API_BASE}/oauth/access_token",
            params={
                "client_id": app_id,
                "client_secret": app_secret,
                "redirect_uri": redirect_uri,
                "code": code,
            },
        )
        resp.raise_for_status()
        short_token = resp.json()["access_token"]

        # Long-lived token
        resp = await client.get(
            f"{GRAPH_API_BASE}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": app_id,
                "client_secret": app_secret,
                "fb_exchange_token": short_token,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_instagram_business_account(access_token: str) -> dict:
    """Get the Instagram Business Account linked to the Facebook Page."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GRAPH_API_BASE}/me/accounts",
            params={"access_token": access_token},
        )
        resp.raise_for_status()
        pages = resp.json().get("data", [])
        if not pages:
            raise ValueError("No Facebook Pages found")

        page = pages[0]
        page_token = page["access_token"]

        resp = await client.get(
            f"{GRAPH_API_BASE}/{page['id']}",
            params={
                "fields": "instagram_business_account",
                "access_token": page_token,
            },
        )
        resp.raise_for_status()
        ig_data = resp.json().get("instagram_business_account")
        if not ig_data:
            raise ValueError("No Instagram Business Account linked")

        # Get username
        resp = await client.get(
            f"{GRAPH_API_BASE}/{ig_data['id']}",
            params={"fields": "username", "access_token": page_token},
        )
        resp.raise_for_status()
        username = resp.json().get("username", "")

        return {
            "ig_user_id": ig_data["id"],
            "username": username,
            "access_token": page_token,
        }


async def reply_to_comment(
    access_token: str, comment_id: str, message: str
) -> dict:
    """Reply to an Instagram comment."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GRAPH_API_BASE}/{comment_id}/replies",
            params={"access_token": access_token},
            data={"message": message},
        )
        resp.raise_for_status()
        return resp.json()


async def send_dm(access_token: str, ig_user_id: str, recipient_id: str, message: str) -> dict:
    """Send a DM via Instagram Messaging API."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GRAPH_API_BASE}/{ig_user_id}/messages",
            params={"access_token": access_token},
            json={
                "recipient": {"id": recipient_id},
                "message": {"text": message},
            },
        )
        resp.raise_for_status()
        return resp.json()
