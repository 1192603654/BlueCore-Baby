from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    openid = Column(String, unique=True, index=True, nullable=False) # WeChat OpenID
    created_at = Column(DateTime, default=datetime.utcnow)

    babies = relationship("Baby", back_populates="parent")


class Baby(Base):
    __tablename__ = "babies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    avatar = Column(String, nullable=True) # Avatar URL
    parent_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    parent = relationship("User", back_populates="babies")
    records = relationship("Record", back_populates="baby")


class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"))
    type = Column(String, index=True, nullable=False) # feed, diaper, sleep, growth
    sub_type = Column(String, nullable=True) # e.g. bottle, breast, wet, dirty
    value = Column(Float, nullable=True) # e.g. amount of milk
    unit = Column(String, nullable=True) # e.g. ml, oz
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    note = Column(Text, nullable=True)

    baby = relationship("Baby", back_populates="records")
