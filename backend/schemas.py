from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Models for User
class UserBase(BaseModel):
    pass

class UserCreate(UserBase):
    code: str  # WeChat login code

class User(UserBase):
    id: int
    openid: str
    created_at: datetime

    class Config:
        orm_mode = True

# Models for Baby
class BabyBase(BaseModel):
    name: str
    avatar: Optional[str] = None

class BabyCreate(BabyBase):
    pass

class Baby(BabyBase):
    id: int
    parent_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Models for Record
class RecordBase(BaseModel):
    baby_id: int
    type: str
    sub_type: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    note: Optional[str] = None

class RecordCreate(RecordBase):
    pass

class Record(RecordBase):
    id: int

    class Config:
        orm_mode = True

# Models for Config/Ads
class AdConfigResponse(BaseModel):
    show_ads: bool
    interstitial_ad_id: Optional[str] = None
    rewarded_video_ad_id: Optional[str] = None
    interstitial_frequency: int = 0
