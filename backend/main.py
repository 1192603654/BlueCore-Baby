from flask import Flask, request, jsonify, g
import os
import jwt
import datetime
import uuid
import random
from sqlalchemy import func

import models
import database
from database import engine

# 初始化数据库结构
models.Base.metadata.create_all(bind=engine)

app = Flask(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "bluecore_secret_key")
ALGORITHM = "HS256"

# --- 辅助函数：数据库会话管理 ---
@app.before_request
def before_request():
    g.db = database.SessionLocal()

@app.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()

# --- 辅助函数：鉴权装饰器 ---
def get_current_user_id():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except Exception:
        return None

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_current_user_id()
        if user_id is None:
            return jsonify({"detail": "未认证或 token 无效"}), 401
        g.user_id = user_id
        return f(*args, **kwargs)
    return decorated_function

# --- 路由：微信登录换取 Token ---
@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    code = data.get('code')
    if not code:
        return jsonify({"detail": "缺失 code 参数"}), 400

    # 模拟微信登录，生产环境请调用微信云托管自带的 header 鉴权（x-wx-openid）或服务端 code2Session
    # 在微信云托管中，如果是云调用，可以直接从 request.headers.get("x-wx-openid") 获取
    openid = request.headers.get("x-wx-openid")
    if not openid:
         openid = f"mock_openid_for_code_{code}"

    db = g.db
    user = db.query(models.User).filter(models.User.openid == openid).first()
    if not user:
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

    expiration = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    token = jwt.encode({"user_id": user.id, "exp": expiration}, SECRET_KEY, algorithm=ALGORITHM)

    return jsonify({
        "token": token,
        "user": {
            "id": user.id,
            "openid": user.openid,
            "nickname": user.nickname,
            "avatar": user.avatar
        }
    })

# --- 路由：获取宝宝列表 ---
@app.route('/babies', methods=['GET'])
@login_required
def get_babies():
    user_id = g.user_id
    babies = g.db.query(models.Baby).filter(models.Baby.parent_id == user_id).all()
    return jsonify([{"id": b.id, "name": b.name, "avatar": b.avatar, "created_at": b.created_at.isoformat()} for b in babies])

# --- 路由：创建宝宝 ---
@app.route('/babies', methods=['POST'])
@login_required
def create_baby():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"detail": "缺失宝宝名字"}), 400

    db_baby = models.Baby(name=name, avatar=data.get('avatar'), parent_id=g.user_id)
    g.db.add(db_baby)
    g.db.commit()
    g.db.refresh(db_baby)
    return jsonify({"id": db_baby.id, "name": db_baby.name, "avatar": db_baby.avatar, "created_at": db_baby.created_at.isoformat()})

# --- 路由：创建行为记录 ---
@app.route('/records', methods=['POST'])
@login_required
def create_record():
    data = request.json
    baby_id = data.get('baby_id')
    type_ = data.get('type')

    if not baby_id or not type_:
        return jsonify({"detail": "缺少必填字段 baby_id 或 type"}), 400

    baby = g.db.query(models.Baby).filter(models.Baby.id == baby_id, models.Baby.parent_id == g.user_id).first()
    if not baby:
        return jsonify({"detail": "未找到宝宝或无权限"}), 404

    start_time_str = data.get('start_time')
    if start_time_str:
        try:
            start_time = datetime.datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        except ValueError:
            start_time = datetime.datetime.utcnow()
    else:
        start_time = datetime.datetime.utcnow()

    db_record = models.Record(
        baby_id=baby_id,
        type=type_,
        sub_type=data.get('sub_type'),
        value=data.get('value'),
        unit=data.get('unit'),
        start_time=start_time,
        note=data.get('note')
    )
    g.db.add(db_record)
    g.db.commit()
    g.db.refresh(db_record)

    return jsonify({"id": db_record.id, "type": db_record.type, "start_time": db_record.start_time.isoformat()})

# --- 辅助函数：将 SQLAlchemy Record 对象转为 dict ---
def record_to_dict(r):
    if not r: return None
    return {
        "id": r.id, "baby_id": r.baby_id, "type": r.type, "sub_type": r.sub_type,
        "value": r.value, "unit": r.unit, "start_time": r.start_time.isoformat() + "Z",
        "end_time": r.end_time.isoformat() + "Z" if r.end_time else None, "note": r.note
    }

# --- 路由：获取主页近期记录聚合 ---
@app.route('/records/recent/<int:baby_id>', methods=['GET'])
@login_required
def get_recent_records(baby_id):
    baby = g.db.query(models.Baby).filter(models.Baby.id == baby_id, models.Baby.parent_id == g.user_id).first()
    if not baby:
        return jsonify({"detail": "未找到宝宝或无权限"}), 404

    latest_feed = g.db.query(models.Record).filter(models.Record.baby_id == baby_id, models.Record.type == "feed").order_by(models.Record.start_time.desc()).first()
    latest_diaper = g.db.query(models.Record).filter(models.Record.baby_id == baby_id, models.Record.type == "diaper").order_by(models.Record.start_time.desc()).first()
    latest_sleep = g.db.query(models.Record).filter(models.Record.baby_id == baby_id, models.Record.type == "sleep").order_by(models.Record.start_time.desc()).first()
    latest_vaccine = g.db.query(models.Record).filter(models.Record.baby_id == baby_id, models.Record.type == "vaccine").order_by(models.Record.start_time.desc()).first()

    return jsonify({
        "feed": record_to_dict(latest_feed),
        "diaper": record_to_dict(latest_diaper),
        "sleep": record_to_dict(latest_sleep),
        "vaccine": record_to_dict(latest_vaccine)
    })

# --- 路由：获取历史列表 ---
@app.route('/records/list/<int:baby_id>', methods=['GET'])
@login_required
def get_records_list(baby_id):
    type_ = request.args.get('type')
    baby = g.db.query(models.Baby).filter(models.Baby.id == baby_id, models.Baby.parent_id == g.user_id).first()
    if not baby:
        return jsonify({"detail": "未找到宝宝或无权限"}), 404

    records = g.db.query(models.Record).filter(
        models.Record.baby_id == baby_id,
        models.Record.type == type_
    ).order_by(models.Record.start_time.desc()).limit(50).all()

    return jsonify([record_to_dict(r) for r in records])

# --- 路由：获取每日统计 ---
@app.route('/stats/daily/<int:baby_id>', methods=['GET'])
@login_required
def get_daily_stats(baby_id):
    query_date = request.args.get('query_date')
    baby = g.db.query(models.Baby).filter(models.Baby.id == baby_id, models.Baby.parent_id == g.user_id).first()
    if not baby:
        return jsonify({"detail": "未找到宝宝或无权限"}), 404

    if not query_date:
        query_date = datetime.date.today().isoformat()

    try:
        target_date = datetime.datetime.strptime(query_date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"detail": "日期格式错误，请使用 YYYY-MM-DD"}), 400

    feed_records = g.db.query(models.Record).filter(
        models.Record.baby_id == baby_id,
        models.Record.type == "feed",
        func.date(models.Record.start_time) == target_date
    ).all()

    total_feed_ml = sum((r.value for r in feed_records if r.value and r.unit == "ml"))
    total_feed_times = len(feed_records)

    diaper_count = g.db.query(models.Record).filter(
        models.Record.baby_id == baby_id,
        models.Record.type == "diaper",
        func.date(models.Record.start_time) == target_date
    ).count()

    ai_suggestion = "【智能管家建议】宝宝今天喝奶量和排便情况都在正常范围内。如果夜间有偶尔哭闹，可能是进入了猛涨期，建议多陪伴安抚，可以适当增加白天的活动量。请继续保持良好的记录习惯哦！"

    return jsonify({
        "total_feed_ml": total_feed_ml,
        "total_feed_times": total_feed_times,
        "total_diaper_times": diaper_count,
        "ai_suggestion": ai_suggestion
    })

# --- 路由：广告配置 ---
@app.route('/config/ads', methods=['GET'])
def get_ad_config():
    return jsonify({
        "show_ads": True,
        "interstitial_ad_id": "mock_interstitial_ad_123",
        "rewarded_video_ad_id": "mock_rewarded_ad_456",
        "interstitial_frequency": 3
    })

if __name__ == '__main__':
    # 供本地直接 python backend/main.py 调试运行
    app.run(host='0.0.0.0', port=8000, debug=True)
