"""Main Flask application."""
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import config
import db
import analytics
from auth import create_token, require_auth, require_admin, verify_token
import traceback
import joblib

# Load ML model
model = joblib.load("rf_model.pkl")
df_percent = joblib.load("df_percent.pkl")

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Error handlers
@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Crime Prediction API is running 🚀",
        "status": "success",
        "available_endpoints": [
            "/api/health",
            "/api/districts",
            "/api/crime-stats",
            "/api/crime/dashboard-summary",
            "/api/crime/high-risk-districts"
        ]
    }), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500



@app.route("/api/login", methods=["POST"])
def login():
    """Login endpoint."""
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        # For now, implement basic authentication
        # In production, use proper authentication service
        # This is a simple demo - replace with your auth logic
        
        # Example: create a user or check credentials
        user = db.get_user_by_open_id(email)
        
        if not user:
            # Create new user (for demo purposes)
            user_data = {
                "openId": email,
                "email": email,
                "name": email.split("@")[0],
                "loginMethod": "email",
                "role": "user",
            }
            user = db.upsert_user(user_data)
        
        if user:
            token = create_token(user)
            return jsonify({
                "token": token,
                "email": user.get("email"),
                "name": user.get("name"),
            }), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401
    
    except Exception as e:
        print(f"Login error: {e}")
        traceback.print_exc()
        return jsonify({"error": "Login failed"}), 500


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def get_current_user(user=None):
    """Get current authenticated user."""
    return jsonify(user), 200


@app.route("/api/logout", methods=["POST"])
@require_auth
def logout(user=None):
    """Logout endpoint."""
    return jsonify({"success": True}), 200


# ============= Crime Data Routes =============

@app.route("/api/districts", methods=["GET"])
def get_districts():
    """Get all districts - endpoint for crime map frontend."""
    try:
        districts = db.get_all_districts()
        return jsonify(districts), 200
    except Exception as e:
        print(f"Error fetching districts: {e}")
        return jsonify({"error": "Failed to fetch districts"}), 500


@app.route("/api/crime-stats", methods=["GET"])
def get_crime_stats():
    """Get all crime statistics - endpoint for crime map frontend."""
    try:
        data = db.get_all_crime_statistics_with_districts()
        return jsonify(data), 200
    except Exception as e:
        print(f"Error fetching crime stats: {e}")
        return jsonify({"error": "Failed to fetch crime statistics"}), 500


@app.route("/api/crime/districts", methods=["GET"])
def get_all_districts():
    """Get all districts."""
    try:
        districts = db.get_all_districts()
        return jsonify(districts), 200
    except Exception as e:
        print(f"Error fetching districts: {e}")
        return jsonify({"error": "Failed to fetch districts"}), 500


@app.route("/api/crime/district/<int:district_id>/stats", methods=["GET"])
def get_district_stats(district_id):
    """Get crime statistics for a specific district."""
    try:
        stats = db.get_crime_statistics_by_district(district_id)
        district = db.get_district_by_id(district_id)
        
        if not district:
            return jsonify({"error": "District not found"}), 404
        
        summary = analytics.calculate_district_summary(stats)
        
        return jsonify({
            "district": district,
            "stats": stats,
            "summary": summary,
        }), 200
    except Exception as e:
        print(f"Error fetching district stats: {e}")
        return jsonify({"error": "Failed to fetch district statistics"}), 500


@app.route("/api/crime/year/<int:year>/stats", methods=["GET"])
def get_year_stats(year):
    """Get crime statistics for a specific year."""
    try:
        stats = db.get_crime_statistics_by_year(year)
        return jsonify(stats), 200
    except Exception as e:
        print(f"Error fetching year stats: {e}")
        return jsonify({"error": "Failed to fetch year statistics"}), 500


@app.route("/api/crime/all-stats", methods=["GET"])
def get_all_stats():
    """Get all crime statistics with district information."""
    try:
        data = db.get_all_crime_statistics_with_districts()
        return jsonify(data), 200
    except Exception as e:
        print(f"Error fetching all stats: {e}")
        return jsonify({"error": "Failed to fetch all statistics"}), 500


@app.route("/api/crime/dashboard-summary", methods=["GET"])
def get_dashboard_summary():
    """Get crime data summary for dashboard."""
    try:
        all_stats = db.get_all_crime_statistics_with_districts()
        districts = db.get_all_districts()

        # ✅ Handle empty DB
        if not all_stats:
            return jsonify({
                "totalDistricts": len(districts) if districts else 0,
                "totalCrimes": 0,
                "averageCrimesPerDistrict": 0,
                "highRiskCount": 0,
                "districtSummaries": [],
                "highRiskDistricts": [],
                "message": "No data available"
            }), 200

        # ========================
        # Group by district
        # ========================
        district_map = {}

        for item in all_stats:
            crime_stat = item.get("crimeStatistics", item)
            dist = item.get("districts", {})

            dist_id = dist.get("id")

            # ❗ Skip if no district id
            if not dist_id:
                continue

            if dist_id not in district_map:
                district_map[dist_id] = {
                    "district": dist,
                    "stats": [],
                }

            district_map[dist_id]["stats"].append(crime_stat)

        # ========================
        # Calculate summaries
        # ========================
        district_summaries = []

        for dist_id, data in district_map.items():
            try:
                summary = analytics.calculate_district_summary(data["stats"])
            except Exception as e:
                print("Summary error:", e)
                summary = {
                    "totalCrimes": 0,
                    "riskLevel": "low"
                }

            district_summaries.append({
                "district": data["district"],
                "summary": summary,
            })

        # ========================
        # Sort by risk
        # ========================
        risk_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}

        district_summaries.sort(
            key=lambda x: risk_order.get(x["summary"].get("riskLevel", "low"), 4)
        )

        # ========================
        # High risk filter
        # ========================
        high_risk_districts = [
            d for d in district_summaries
            if d["summary"].get("riskLevel") in ["high", "critical"]
        ]

        # ========================
        # Totals
        # ========================
        total_crimes = sum(
            d["summary"].get("totalCrimes", 0) for d in district_summaries
        )

        avg = (
            round(total_crimes / len(district_summaries))
            if district_summaries else 0
        )

        # ========================
        # Response
        # ========================
        return jsonify({
            "totalDistricts": len(districts) if districts else 0,
            "totalCrimes": total_crimes,
            "averageCrimesPerDistrict": avg,
            "highRiskCount": len(high_risk_districts),
            "districtSummaries": district_summaries,
            "highRiskDistricts": high_risk_districts,
        }), 200

    except Exception as e:
        print("FULL ERROR:", e)
        traceback.print_exc()

        return jsonify({
            "error": str(e),
            "message": "Failed to fetch dashboard summary"
        }), 500
        
        # Calculate summaries
        district_summaries = []
        for dist_id, data in district_map.items():
            summary = analytics.calculate_district_summary(data["stats"])
            district_summaries.append({
                "district": data["district"],
                "summary": summary,
            })
        
        # Sort by risk level
        risk_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        district_summaries.sort(
            key=lambda x: risk_order.get(x["summary"]["riskLevel"], 4)
        )
        
        # Get high-risk districts
        high_risk_districts = [
            d for d in district_summaries
            if d["summary"]["riskLevel"] in ["high", "critical"]
        ]
        
        # Calculate overall statistics
        total_crimes = sum(d["summary"]["totalCrimes"] for d in district_summaries)
        average_crimes_per_district = round(total_crimes / len(district_summaries)) if district_summaries else 0
        
        return jsonify({
            "totalDistricts": len(districts),
            "totalCrimes": total_crimes,
            "averageCrimesPerDistrict": average_crimes_per_district,
            "highRiskCount": len(high_risk_districts),
            "districtSummaries": district_summaries,
            "highRiskDistricts": high_risk_districts,
        }), 200
    except Exception as e:
        print(f"Error fetching dashboard summary: {e}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch dashboard summary"}), 500


@app.route("/api/crime/predictions/<int:district_id>", methods=["GET"])
def get_predictions(district_id):
    """Get predictions for a specific district."""
    try:
        predictions = db.get_predictions_by_district(district_id)
        return jsonify(predictions), 200
    except Exception as e:
        print(f"Error fetching predictions: {e}")
        return jsonify({"error": "Failed to fetch predictions"}), 500


@app.route("/api/crime/generate-predictions", methods=["POST"])
@require_admin
def generate_predictions(user=None):
    """Generate predictions for all districts."""
    try:
        all_stats = db.get_all_crime_statistics_with_districts()
        
        if not all_stats:
            return jsonify({"error": "No crime statistics found"}), 400
        
        # Extract crime types from first record
        first_record = all_stats[0].get("crimeStatistics", all_stats[0])
        crime_types = list(analytics.extract_crime_values(first_record).keys())
        predict_years = [2024, 2025]
        
        generated_count = 0
        
        # Group by district
        district_crime_map = {}
        for item in all_stats:
            crime_stat = item.get("crimeStatistics", item)
            dist = item.get("districts", {})
            dist_id = dist.get("id")
            
            if dist_id not in district_crime_map:
                district_crime_map[dist_id] = {
                    "districtId": dist_id,
                    "stats": [],
                }
            district_crime_map[dist_id]["stats"].append(crime_stat)
        
        # Generate predictions for each district and crime type
        for district_data in district_crime_map.values():
            district_id = district_data["districtId"]
            stats = district_data["stats"]
            
            # Sort by year
            stats.sort(key=lambda x: x.get("year", 0))
            
            for crime_type in crime_types:
                historical_data = []
                for stat in stats:
                    crime_values = analytics.extract_crime_values(stat)
                    historical_data.append({
                        "year": stat.get("year"),
                        "value": crime_values.get(crime_type, 0),
                    })
                
                predictions = analytics.generate_predictions(
                    district_id,
                    crime_type,
                    historical_data,
                    predict_years,
                )
                
                for pred in predictions:
                    db.insert_crime_prediction(pred)
                    generated_count += 1
        
        return jsonify({
            "success": True,
            "generatedCount": generated_count,
            "message": f"Generated {generated_count} predictions",
        }), 200
    except Exception as e:
        print(f"Error generating predictions: {e}")
        traceback.print_exc()
        return jsonify({"error": "Failed to generate predictions"}), 500


@app.route("/api/crime/high-risk-districts", methods=["GET"])
def get_high_risk_districts():
    """Get high-risk districts."""
    try:
        high = db.get_high_risk_districts("high")
        critical = db.get_high_risk_districts("critical")
        
        return jsonify({
            "high": high,
            "critical": critical,
        }), 200
    except Exception as e:
        print(f"Error fetching high-risk districts: {e}")
        return jsonify({"error": "Failed to fetch high-risk districts"}), 500


@app.route("/api/crime/trend", methods=["GET"])
def get_crime_trend():
    """Get crime trends for a specific crime type."""
    try:
        crime_type = request.args.get("crimeType")
        district_id = request.args.get("districtId", type=int)
        
        if not crime_type:
            return jsonify({"error": "crimeType parameter required"}), 400
        
        all_stats = db.get_all_crime_statistics_with_districts()
        
        filtered = []
        for item in all_stats:
            crime_stat = item.get("crimeStatistics", item)
            dist = item.get("districts", {})
            
            if district_id and dist.get("id") != district_id:
                continue
            
            filtered.append({
                "crime_stat": crime_stat,
                "district": dist,
            })
        
        trends = []
        for item in filtered:
            crime_stat = item["crime_stat"]
            dist = item["district"]
            crime_values = analytics.extract_crime_values(crime_stat)
            
            trends.append({
                "year": crime_stat.get("year"),
                "district": dist.get("name"),
                "value": crime_values.get(crime_type, 0),
            })
        
        trends.sort(key=lambda x: x["year"])
        
        return jsonify(trends), 200
    except Exception as e:
        print(f"Error fetching crime trend: {e}")
        return jsonify({"error": "Failed to fetch crime trend"}), 500


# Health check
@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"}), 200

@app.route("/api/crime/classify/<district_name>", methods=["GET"])
def classify_district(district_name):
    try:
        matched_district = None

        for col in df_percent.columns:
            if col.lower() == district_name.lower():
                matched_district = col
                break

        if matched_district is None:
            return jsonify({
                "error": "District not found",
                "availableDistricts": list(df_percent.columns)
            }), 404

        X_model = df_percent.T
        district_data = X_model.loc[[matched_district]]

        probs = model.predict_proba(district_data)[0]

        probability_result = {
            str(model.classes_[i]): round(float(probs[i] * 100), 2)
            for i in range(len(model.classes_))
        }

        max_index = probs.argmax()

        category_breakdown = (
            df_percent[matched_district]
            .sort_values(ascending=False)
            .round(2)
            .to_dict()
        )

        return jsonify({
            "district": matched_district,
            "predictedRisk": str(model.classes_[max_index]),
            "confidence": round(float(probs[max_index] * 100), 2),
            "probabilities": probability_result,
            "categoryBreakdown": category_breakdown
        }), 200

    except Exception as e:
        print("Classification error:", e)
        traceback.print_exc()
        return jsonify({"error": "Prediction failed"}), 500

if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
