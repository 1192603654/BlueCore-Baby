from fastapi import FastAPI, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import jwt
import datetime

from . import models, schemas, database
from .database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BlueCore Baby API")

import os

SECRET_KEY = os.getenv("SECRET_KEY", "bluecore_secret_key") # 生产环境请使用环境变量
ALGORITHM = "HS256"

# 依赖项：获取数据库会话
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 依赖项：从 token 中获取当前用户 ID
def get_current_user_id(authorization: Optional[str] = Header(None)) -> int:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未认证 (Not authenticated)")

    try:
        token = authorization.split("Bearer ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的 token")
        return user_id
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的 token")

@app.post("/auth/login")
def login(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # 模拟微信登录。真实场景下请调用微信 API 用 code 换取 openid。
    openid = f"mock_openid_for_code_{user_in.code}"

    user = db.query(models.User).filter(models.User.openid == openid).first()
    if not user:
        user = models.User(openid=openid)
        db.add(user)
        db.commit()
        db.refresh(user)

    # 创建 JWT
    expiration = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    token = jwt.encode({"user_id": user.id, "exp": expiration}, SECRET_KEY, algorithm=ALGORITHM)

    return {"token": token, "user": {"id": user.id, "openid": user.openid}}

@app.get("/babies", response_model=List[schemas.Baby])
def get_babies(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # 获取当前用户关联的所有宝宝
    babies = db.query(models.Baby).filter(models.Baby.parent_id == user_id).all()
    return babies

@app.post("/babies", response_model=schemas.Baby)
def create_baby(baby_in: schemas.BabyCreate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # 创建宝宝
    db_baby = models.Baby(**baby_in.dict(), parent_id=user_id)
    db.add(db_baby)
    db.commit()
    db.refresh(db_baby)
    return db_baby

@app.post("/records", response_model=schemas.Record)
def create_record(record_in: schemas.RecordCreate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # 验证该宝宝是否属于当前用户
    baby = db.query(models.Baby).filter(models.Baby.id == record_in.baby_id, models.Baby.parent_id == user_id).first()
    if not baby:
        raise HTTPException(status_code=404, detail="未找到宝宝或用户无权限")

    if record_in.start_time is None:
        record_in.start_time = datetime.datetime.utcnow()

    db_record = models.Record(**record_in.dict())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)

    return db_record

@app.get("/config/ads", response_model=schemas.AdConfigResponse)
def get_ad_config():
    # 返回模拟的广告配置
    return schemas.AdConfigResponse(
        show_ads=True,
        interstitial_ad_id="mock_interstitial_ad_123",
        rewarded_video_ad_id="mock_rewarded_ad_456",
        interstitial_frequency=3 # 每记录 3 次展示一次插屏广告
    )
