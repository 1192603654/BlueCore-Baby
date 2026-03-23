from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    openid = Column(String, unique=True, index=True, nullable=False) # 微信 OpenID
    nickname = Column(String, nullable=True) # 随机生成的默认家长昵称
    avatar = Column(String, nullable=True) # 默认的家长头像
    created_at = Column(DateTime, default=datetime.utcnow)

    babies = relationship("Baby", back_populates="parent")


class Baby(Base):
    __tablename__ = "babies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    avatar = Column(String, nullable=True) # 头像 URL
    parent_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    parent = relationship("User", back_populates="babies")
    records = relationship("Record", back_populates="baby")


class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"))
    type = Column(String, index=True, nullable=False) # feed (喂养), diaper (尿布), sleep (睡眠), growth (生长)
    sub_type = Column(String, nullable=True) # 例如：bottle (瓶喂), breast (亲喂), wet (尿湿), dirty (便便)
    value = Column(Float, nullable=True) # 例如：奶量
    unit = Column(String, nullable=True) # 例如：ml, oz
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    note = Column(Text, nullable=True)

    baby = relationship("Baby", back_populates="records")
