from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

import os

# 使用 SQLite 作为本地默认测试数据库，如果配置了 DATABASE_URL 环境变量则使用该环境变量（例如生产环境的 MySQL）
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bluecore_baby.db")

# 如果使用的是 sqlite，需要添加特殊的连接参数防止多线程问题
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
