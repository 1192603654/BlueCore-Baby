from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Use MySQL as requested for production/development. Ensure pymysql is installed.
# For local testing, ensure MySQL is running and the database is created, or swap connection string if needed.
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://user:password@localhost/bluecore_baby"

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
