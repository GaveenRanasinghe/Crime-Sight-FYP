"""Database operations using Supabase."""
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from config import config

# Initialize Supabase client
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

# ============= User Functions =============

def upsert_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Upsert a user into the database."""
    try:
        open_id = user_data.get("openId")
        if not open_id:
            raise ValueError("User openId is required for upsert")
        
        # Check if user exists
        response = supabase.table("users").select("*").eq("openId", open_id).execute()
        
        user_values = {
            "openId": open_id,
            "lastSignedIn": "now()",
        }
        
        # Add optional fields
        if user_data.get("name"):
            user_values["name"] = user_data["name"]
        if user_data.get("email"):
            user_values["email"] = user_data["email"]
        if user_data.get("loginMethod"):
            user_values["loginMethod"] = user_data["loginMethod"]
        
        # Set role
        if user_data.get("role"):
            user_values["role"] = user_data["role"]
        elif open_id == config.OWNER_OPEN_ID:
            user_values["role"] = "admin"
        else:
            user_values["role"] = "user"
        
        if response.data:
            # Update existing user
            supabase.table("users").update(user_values).eq("openId", open_id).execute()
        else:
            # Insert new user
            supabase.table("users").insert(user_values).execute()
        
        return get_user_by_open_id(open_id)
    except Exception as e:
        print(f"Error upserting user: {e}")
        raise


def get_user_by_open_id(open_id: str) -> Optional[Dict[str, Any]]:
    """Get user by OpenID."""
    try:
        response = supabase.table("users").select("*").eq("openId", open_id).limit(1).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error getting user: {e}")
        return None


# ============= Crime Data Functions =============

def get_or_create_district(name: str, latitude: float, longitude: float, province: Optional[str] = None) -> Dict[str, Any]:
    """Get or create a district."""
    try:
        # Check if exists
        response = supabase.table("districts").select("*").eq("name", name).limit(1).execute()
        
        if response.data:
            return response.data[0]
        
        # Create new
        insert_data = {
            "name": name,
            "latitude": str(latitude),
            "longitude": str(longitude),
            "province": province,
        }
        result = supabase.table("districts").insert(insert_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error creating district: {e}")
        raise


def get_all_districts() -> List[Dict[str, Any]]:
    """Get all districts."""
    try:
        response = supabase.table("districts").select("*").execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching districts: {e}")
        raise


def get_district_by_id(district_id: int) -> Optional[Dict[str, Any]]:
    """Get district by ID."""
    try:
        response = supabase.table("districts").select("*").eq("id", district_id).limit(1).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error fetching district: {e}")
        return None


def insert_crime_statistic(data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert crime statistic."""
    try:
        result = supabase.table("crimeStatistics").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error inserting crime statistic: {e}")
        raise


def get_crime_statistics_by_district_and_year(district_id: int, year: int) -> Optional[Dict[str, Any]]:
    """Get crime statistics for a district and year."""
    try:
        response = supabase.table("crimeStatistics").select("*").eq("districtId", district_id).eq("year", year).limit(1).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error fetching crime statistics: {e}")
        return None


def get_crime_statistics_by_district(district_id: int) -> List[Dict[str, Any]]:
    """Get all crime statistics for a district."""
    try:
        response = supabase.table("crimeStatistics").select("*").eq("districtId", district_id).order("year").execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching crime statistics: {e}")
        raise


def get_crime_statistics_by_year(year: int) -> List[Dict[str, Any]]:
    """Get crime statistics for a specific year."""
    try:
        response = supabase.table("crimeStatistics").select("*").eq("year", year).execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching crime statistics: {e}")
        raise


def get_all_crime_statistics_with_districts() -> List[Dict[str, Any]]:
    """Get all crime statistics with district info."""
    try:
        response = supabase.table("crimeStatistics").select("*, districts(*)").order("year").order("districtId").execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching all crime statistics: {e}")
        raise


def insert_crime_prediction(data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert crime prediction."""
    try:
        result = supabase.table("crimePredictions").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error inserting crime prediction: {e}")
        raise


def get_predictions_by_district(district_id: int) -> List[Dict[str, Any]]:
    """Get predictions for a district."""
    try:
        response = supabase.table("crimePredictions").select("*").eq("districtId", district_id).order("predictedYear", desc=True).execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching predictions: {e}")
        raise


def get_high_risk_districts(risk_level: str = "high") -> List[Dict[str, Any]]:
    """Get high-risk districts."""
    try:
        response = supabase.table("crimePredictions").select("*, districts(*)").eq("riskLevel", risk_level).order("confidence", desc=True).execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching high-risk districts: {e}")
        raise


def record_data_upload(user_id: int, file_name: str, file_size: int, records_imported: int) -> Dict[str, Any]:
    """Record a data upload."""
    try:
        data = {
            "userId": user_id,
            "fileName": file_name,
            "fileSize": file_size,
            "recordsImported": records_imported,
            "status": "completed",
        }
        result = supabase.table("dataUploads").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error recording upload: {e}")
        raise


def get_upload_history(user_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Get upload history."""
    try:
        query = supabase.table("dataUploads").select("*")
        if user_id:
            query = query.eq("userId", user_id)
        response = query.order("uploadedAt", desc=True).execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching upload history: {e}")
        raise
