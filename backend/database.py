from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

import os

# 按照要求，生产/开发环境使用 MySQL。确保已安装 pymysql。
# 若本地测试，确保 MySQL 服务正在运行并创建了该数据库，或者在需要时更换连接字符串为 sqlite。
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://user:password@localhost/bluecore_baby")

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
