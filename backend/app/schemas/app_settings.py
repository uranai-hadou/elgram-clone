from pydantic import BaseModel


class AppSettingsUpdate(BaseModel):
    meta_app_id: str | None = None
    meta_app_secret: str | None = None
    webhook_verify_token: str | None = None
    instagram_redirect_uri: str | None = None


class AppSettingsOut(BaseModel):
    meta_app_id: str
    meta_app_secret_masked: str
    webhook_verify_token: str
    instagram_redirect_uri: str

    model_config = {"from_attributes": True}
