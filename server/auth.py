"""Authentication and JWT handling."""
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from functools import wraps
from flask import request, jsonify
from config import config


def create_token(user_data: Dict[str, Any]) -> str:
    """Create a JWT token."""
    payload = {
        "id": user_data.get("id"),
        "openId": user_data.get("openId"),
        "email": user_data.get("email"),
        "name": user_data.get("name"),
        "role": user_data.get("role", "user"),
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    
    token = jwt.encode(
        payload,
        config.JWT_SECRET,
        algorithm=config.JWT_ALGORITHM,
    )
    
    return token


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(
            token,
            config.JWT_SECRET,
            algorithms=[config.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def extract_token_from_header(auth_header: Optional[str]) -> Optional[str]:
    """Extract token from Authorization header."""
    if not auth_header:
        return None
    
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    
    return None


def require_auth(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        token = extract_token_from_header(auth_header)
        
        if not token:
            return jsonify({"error": "Missing authentication token"}), 401
        
        user = verify_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        kwargs["user"] = user
        return f(*args, **kwargs)
    
    return decorated_function


def require_admin(f):
    """Decorator to require admin role."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        token = extract_token_from_header(auth_header)
        
        if not token:
            return jsonify({"error": "Missing authentication token"}), 401
        
        user = verify_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        if user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        
        kwargs["user"] = user
        return f(*args, **kwargs)
    
    return decorated_function
