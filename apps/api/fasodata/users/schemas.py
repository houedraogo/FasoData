import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from fasodata.users.models import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    organization: str | None = None


class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.public


class UserUpdate(BaseModel):
    full_name: str | None = None
    organization: str | None = None
    bio: str | None = None
    password: str | None = None


class UserAdminUpdate(UserUpdate):
    role: UserRole | None = None
    is_active: bool | None = None


class UserOut(UserBase):
    id: uuid.UUID
    role: UserRole
    is_active: bool
    is_verified: bool
    bio: str | None = None
    avatar_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserOutList(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    page_size: int
