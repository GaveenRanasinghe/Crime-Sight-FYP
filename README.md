# Crime-Sight-FYP
# 🚔 CrimeSight: Crime Pattern Classification & Hotspot Mapping

![React](https://img.shields.io/badge/Frontend-React.js-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Backend-Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/API-Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Machine Learning](https://img.shields.io/badge/ML-Random%20Forest-orange?style=for-the-badge)
![Map](https://img.shields.io/badge/GIS-OpenStreetMap-green?style=for-the-badge)

---

## 📌 Project Overview

**CrimeSight** is a web-based crime analytics system developed as a Final Year Project for the **PUSL3190 Computing Project** module.

The system is designed to analyze historical crime data from **2021 to 2023** across all **25 districts of Sri Lanka**. Instead of directly predicting exact crime counts, the project focuses on **crime pattern classification**, **risk analysis**, and **GIS-based hotspot mapping** to support better decision-making in crime management.

CrimeSight combines **machine learning**, **dashboard analytics**, and **interactive map visualization** into a single web application.

---

## 🎯 Main Objectives

- Develop a machine learning-based crime classification model using the **Random Forest Classifier**.
- Build a web-based application for crime analysis and risk classification.
- Visualize crime hotspots using a **GIS-based map** covering all 25 districts of Sri Lanka.
- Create an analytics dashboard to summarize crime trends and historical crime patterns.
- Provide a user-friendly interface for non-technical users.

---

## ✨ Key Features

### 📊 Crime Analytics Dashboard
- Displays total crime records.
- Shows district-level crime summaries.
- Provides category-based crime breakdowns.
- Includes visual charts and indicators for easier interpretation.

### 🧠 Machine Learning Classification
- Uses a trained **Random Forest Classifier**.
- Classifies crime patterns based on historical data.
- Generates risk-related outputs and percentage-based insights.
- Model trained and tested using Google Colab.

### 🗺️ GIS Crime Hotspot Map
- Integrated with **OpenStreetMap API**.
- Displays district-level crime distribution.
- Helps identify high-risk areas visually.
- Supports crime hotspot analysis across Sri Lanka.

### 🔐 Single User Authentication
- Login system connected with **Supabase Authentication**.
- Allows access only for an authorized user.
- Protects crime analytics features from unauthorized access.

### 🖥️ User-Friendly Interface
- Clean and modern UI.
- Easy navigation between dashboard, crime map, and classification page.
- Interactive filters for districts, crime types, and years.

---

## 🛠️ Technologies Used

| Area | Technology |
|---|---|
| Frontend | React.js |
| Backend | Python, Flask |
| Machine Learning | Random Forest Classifier |
| ML Libraries | Scikit-learn, Pandas, NumPy |
| Model Storage | Joblib |
| Database & Authentication | Supabase |
| Map Integration | OpenStreetMap API |
| Development Environment | Visual Studio Code, Google Colab |
| Version Control | GitHub |

---

## 🧠 Machine Learning Model

The crime classification model was trained using historical Sri Lankan crime data from **2021 to 2023**.

### Model Details

- Algorithm: **Random Forest Classifier**
- Training/Test Split: **80% training / 20% testing**
- Model Accuracy: **Approximately 86%**
- Model saved using: `joblib`
- Backend integration file: `app.py`

The trained model is loaded into the backend using:

```python
joblib.load("rf_model.pkl")
