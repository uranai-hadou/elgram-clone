from datetime import datetime
from pydantic import BaseModel


class InstagramAccountOut(BaseModel):
    id: str
    ig_user_id: str
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}
