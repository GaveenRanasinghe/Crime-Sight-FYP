"""Analytics and prediction functions."""
from typing import List, Dict, Any, Literal
import numpy as np
from dataclasses import dataclass


@dataclass
class RegressionResult:
    """Linear regression result."""
    slope: float
    intercept: float


def linear_regression(data: List[Dict[str, float]]) -> RegressionResult:
    """Calculate simple linear regression for time series prediction."""
    if len(data) < 2:
        return RegressionResult(slope=0, intercept=data[0].get("y", 0) if data else 0)
    
    x_values = [d["x"] for d in data]
    y_values = [d["y"] for d in data]
    
    n = len(data)
    sum_x = sum(x_values)
    sum_y = sum(y_values)
    sum_xy = sum(x * y for x, y in zip(x_values, y_values))
    sum_x2 = sum(x * x for x in x_values)
    
    denominator = n * sum_x2 - sum_x * sum_x
    if denominator == 0:
        return RegressionResult(slope=0, intercept=sum_y / n if n > 0 else 0)
    
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n
    
    return RegressionResult(slope=slope, intercept=intercept)


def calculate_r_squared(data: List[Dict[str, float]], slope: float, intercept: float) -> float:
    """Calculate R-squared (coefficient of determination)."""
    y_values = [d["y"] for d in data]
    y_mean = sum(y_values) / len(y_values)
    
    ss_total = sum((y - y_mean) ** 2 for y in y_values)
    if ss_total == 0:
        return 0.0
    
    ss_residual = sum((y - (slope * d["x"] + intercept)) ** 2 for d, y in zip(data, y_values))
    return 1 - (ss_residual / ss_total)


def predict_value(x: float, slope: float, intercept: float) -> int:
    """Predict future value using linear regression."""
    return max(0, round(slope * x + intercept))


def calculate_trend(slope: float) -> Literal["increasing", "decreasing", "stable"]:
    """Calculate trend direction based on slope."""
    threshold = 0.5
    if slope > threshold:
        return "increasing"
    elif slope < -threshold:
        return "decreasing"
    return "stable"


def determine_risk_level(value: float, slope: float, avg_value: float) -> Literal["low", "medium", "high", "critical"]:
    """Determine risk level based on crime value and trend."""
    ratio = value / (avg_value or 1)
    trend = calculate_trend(slope)
    
    # Critical: High value with increasing trend
    if ratio > 1.5 and trend == "increasing":
        return "critical"
    
    # High: Significantly above average or increasing trend with moderate values
    if ratio > 1.3 or (ratio > 0.9 and trend == "increasing"):
        return "high"
    
    # Medium: Slightly above average or stable with moderate values
    if ratio > 0.8:
        return "medium"
    
    # Low: Below average
    return "low"


def extract_crime_values(stat: Dict[str, Any]) -> Dict[str, int]:
    """Extract crime values from statistics record."""
    return {
        "Rape Cases": stat.get("rapeCases", 0) or 0,
        "Homicide": stat.get("homicide", 0) or 0,
        "Attempted Homicide": stat.get("attemptedHomicide", 0) or 0,
        "Abduction": stat.get("abduction", 0) or 0,
        "Kidnapping": stat.get("kidnapping", 0) or 0,
        "Arson": stat.get("arson", 0) or 0,
        "Theft over Rs. 50,000": stat.get("theftOver50k", 0) or 0,
        "Grievous Hurt": stat.get("grievousHurt", 0) or 0,
        "Hurt by Knife": stat.get("hurtByKnife", 0) or 0,
        "Robbery": stat.get("robbery", 0) or 0,
        "Extortion": stat.get("extortion", 0) or 0,
        "Unnatural Offense": stat.get("unnaturalOffense", 0) or 0,
        "Sexual Abuse": stat.get("sexualAbuse", 0) or 0,
    }


def generate_predictions(
    district_id: int,
    crime_type: str,
    historical_data: List[Dict[str, Any]],
    predict_years: List[int] = None,
) -> List[Dict[str, Any]]:
    """Generate predictions for a crime type across years."""
    if predict_years is None:
        predict_years = [2024, 2025]
    
    if len(historical_data) < 2:
        return []
    
    # Prepare data for regression
    regression_data = [{"x": idx, "y": d["value"]} for idx, d in enumerate(historical_data)]
    
    result = linear_regression(regression_data)
    r_squared = calculate_r_squared(regression_data, result.slope, result.intercept)
    avg_value = sum(d["value"] for d in historical_data) / len(historical_data)
    trend = calculate_trend(result.slope)
    
    # Generate predictions
    predictions = []
    for idx, year in enumerate(predict_years):
        x_value = len(historical_data) + idx
        predicted_value = predict_value(x_value, result.slope, result.intercept)
        confidence = min(100, max(0, r_squared * 100))
        risk_level = determine_risk_level(predicted_value, result.slope, avg_value)
        
        predictions.append({
            "districtId": district_id,
            "crimeType": crime_type,
            "predictedYear": year,
            "predictedValue": predicted_value,
            "confidence": round(confidence, 2),
            "trend": trend,
            "riskLevel": risk_level,
        })
    
    return predictions


def calculate_district_summary(stats: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate crime statistics summary for a district."""
    if not stats:
        return {
            "totalCrimes": 0,
            "averagePerYear": 0,
            "trend": "stable",
            "riskLevel": "low",
            "yearOverYearChange": 0,
        }
    
    totals = [s.get("total", 0) or 0 for s in stats]
    total_crimes = sum(totals)
    average_per_year = total_crimes / len(stats)
    
    # Calculate year-over-year change
    year_over_year_change = 0
    if len(stats) >= 2:
        last_year = totals[-1]
        prev_year = totals[-2]
        year_over_year_change = ((last_year - prev_year) / prev_year * 100) if prev_year > 0 else 0
    
    # Determine trend
    regression_data = [{"x": x, "y": y} for x, y in enumerate(totals)]
    result = linear_regression(regression_data)
    trend = calculate_trend(result.slope)
    
    # Determine risk level
    last_value = totals[-1]
    risk_level = determine_risk_level(last_value, result.slope, average_per_year)
    
    return {
        "totalCrimes": total_crimes,
        "averagePerYear": round(average_per_year),
        "trend": trend,
        "riskLevel": risk_level,
        "yearOverYearChange": round(year_over_year_change, 2),
    }


def compare_districts(district_stats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compare districts by crime metrics."""
    results = []
    for item in district_stats:
        summary = calculate_district_summary(item["stats"])
        results.append({
            "districtId": item["districtId"],
            "districtName": item["districtName"],
            "totalCrimes": summary["totalCrimes"],
            "averagePerYear": summary["averagePerYear"],
            "trend": summary["trend"],
            "riskLevel": summary["riskLevel"],
        })
    return results
