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

import uuid
import random

@app.post("/auth/login")
def login(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # 模拟微信登录。真实场景下请调用微信 API 用 code 换取 openid。
    openid = f"mock_openid_for_code_{user_in.code}"

    user = db.query(models.User).filter(models.User.openid == openid).first()
    if not user:
        # 初次静默登录，生成默认昵称和头像，以降低用户授权门槛
        random_suffix = "".join(random.choices("0123456789", k=4))
        default_nickname = f"蓝核家长_{random_suffix}"
        default_avatar = "/images/default_parent_avatar.png"

        user = models.User(
            openid=openid,
            nickname=default_nickname,
            avatar=default_avatar
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 创建 JWT
    expiration = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    token = jwt.encode({"user_id": user.id, "exp": expiration}, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "token": token,
        "user": {
            "id": user.id,
            "openid": user.openid,
            "nickname": user.nickname,
            "avatar": user.avatar
        }
    }

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

@app.get("/records/recent/{baby_id}", response_model=schemas.RecentRecordsResponse)
def get_recent_records(baby_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # 验证该宝宝是否属于当前用户
    baby = db.query(models.Baby).filter(models.Baby.id == baby_id, models.Baby.parent_id == user_id).first()
    if not baby:
        raise HTTPException(status_code=404, detail="未找到宝宝或用户无权限")

    # 获取每种类型的最新一条记录
    latest_feed = db.query(models.Record).filter(models.Record.baby_id == baby_id, models.Record.type == "feed").order_by(models.Record.start_time.desc()).first()
    latest_diaper = db.query(models.Record).filter(models.Record.baby_id == baby_id, models.Record.type == "diaper").order_by(models.Record.start_time.desc()).first()
    latest_sleep = db.query(models.Record).filter(models.Record.baby_id == baby_id, models.Record.type == "sleep").order_by(models.Record.start_time.desc()).first()
    latest_vaccine = db.query(models.Record).filter(models.Record.baby_id == baby_id, models.Record.type == "vaccine").order_by(models.Record.start_time.desc()).first()

    return schemas.RecentRecordsResponse(
        feed=latest_feed,
        diaper=latest_diaper,
        sleep=latest_sleep,
        vaccine=latest_vaccine
    )

@app.get("/records/list/{baby_id}", response_model=List[schemas.Record])
def get_records_list(baby_id: int, type: str, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # 验证宝宝归属权
    baby = db.query(models.Baby).filter(models.Baby.id == baby_id, models.Baby.parent_id == user_id).first()
    if not baby:
        raise HTTPException(status_code=404, detail="未找到宝宝或用户无权限")

    # 根据类型查询，按时间倒序排列，限制返回最新的 50 条记录
    records = db.query(models.Record).filter(
        models.Record.baby_id == baby_id,
        models.Record.type == type
    ).order_by(models.Record.start_time.desc()).limit(50).all()

    return records

from sqlalchemy import func
from datetime import date

@app.get("/stats/daily/{baby_id}", response_model=schemas.DailyStatsResponse)
def get_daily_stats(baby_id: int, query_date: str = None, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # 验证宝宝归属权
    baby = db.query(models.Baby).filter(models.Baby.id == baby_id, models.Baby.parent_id == user_id).first()
    if not baby:
        raise HTTPException(status_code=404, detail="未找到宝宝或用户无权限")

    # 如果没有传 query_date，默认使用今天的日期
    if not query_date:
        query_date = date.today().isoformat()

    try:
        # 转换字符串为日期对象，注意 datetime 是 module
        target_date = datetime.datetime.strptime(query_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD")

    # 统计当日的喂养记录（针对值为奶量 ml 的情况累加）
    feed_records = db.query(models.Record).filter(
        models.Record.baby_id == baby_id,
        models.Record.type == "feed",
        func.date(models.Record.start_time) == target_date
    ).all()

    total_feed_ml = sum((r.value for r in feed_records if r.value and r.unit == "ml"))
    total_feed_times = len(feed_records)

    # 统计当日的尿布次数
    diaper_count = db.query(models.Record).filter(
        models.Record.baby_id == baby_id,
        models.Record.type == "diaper",
        func.date(models.Record.start_time) == target_date
    ).count()

    # 静态的 AI 分析建议（后续可以对接真实的大模型 API）
    ai_suggestion = "【智能管家建议】宝宝今天喝奶量和排便情况都在正常范围内。如果夜间有偶尔哭闹，可能是进入了猛涨期，建议多陪伴安抚，可以适当增加白天的活动量。请继续保持良好的记录习惯哦！"

    return schemas.DailyStatsResponse(
        total_feed_ml=total_feed_ml,
        total_feed_times=total_feed_times,
        total_diaper_times=diaper_count,
        ai_suggestion=ai_suggestion
    )

@app.get("/config/ads", response_model=schemas.AdConfigResponse)
def get_ad_config():
    # 返回模拟的广告配置
    return schemas.AdConfigResponse(
        show_ads=True,
        interstitial_ad_id="mock_interstitial_ad_123",
        rewarded_video_ad_id="mock_rewarded_ad_456",
        interstitial_frequency=3 # 每记录 3 次展示一次插屏广告
    )
