from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# 用户相关模型
class UserBase(BaseModel):
    pass

class UserCreate(UserBase):
    code: str  # 微信登录用的 code

class User(UserBase):
    id: int
    openid: str
    created_at: datetime

    class Config:
        orm_mode = True

# 宝宝相关模型
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

# 记录相关模型
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

# 广告/配置相关模型
class AdConfigResponse(BaseModel):
    show_ads: bool
    interstitial_ad_id: Optional[str] = None
    rewarded_video_ad_id: Optional[str] = None
    interstitial_frequency: int = 0
