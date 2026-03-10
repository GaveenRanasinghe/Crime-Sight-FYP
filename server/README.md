# Crime Prediction SL - Python Backend

This is a Python Flask-based backend for the Crime Prediction System, converted from Node.js. It provides API endpoints for crime data management, analytics, and predictions.

## Prerequisites

- Python 3.9+
- pip or poetry
- Supabase project set up with required tables

## Setup Instructions

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `JWT_SECRET`: A strong secret for JWT signing (change in production!)

### 4. Run the Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/login` - Login with email and password
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/logout` - Logout (requires auth)

### Crime Data

- `GET /api/crime/districts` - Get all districts
- `GET /api/crime/district/<id>/stats` - Get stats for a district
- `GET /api/crime/year/<year>/stats` - Get stats for a year
- `GET /api/crime/all-stats` - Get all statistics
- `GET /api/crime/dashboard-summary` - Get dashboard summary
- `GET /api/crime/predictions/<id>` - Get predictions for a district
- `GET /api/crime/high-risk-districts` - Get high-risk districts
- `GET /api/crime/trend` - Get crime trends

### Admin Endpoints

- `POST /api/crime/generate-predictions` - Generate predictions (admin only)

## Database Tables

The backend expects the following Supabase tables:

### users
- id (UUID)
- openId (string)
- email (string)
- name (string)
- loginMethod (string)
- role (string: 'user' or 'admin')
- lastSignedIn (timestamp)
- createdAt (timestamp)
- updatedAt (timestamp)

### districts
- id (int)
- name (string)
- latitude (string)
- longitude (string)
- province (string)

### crimeStatistics
- id (int)
- districtId (int, foreign key)
- year (int)
- rapeCases (int)
- homicide (int)
- attemptedHomicide (int)
- abduction (int)
- kidnapping (int)
- arson (int)
- theftOver50k (int)
- grievousHurt (int)
- hurtByKnife (int)
- robbery (int)
- extortion (int)
- unnaturalOffense (int)
- sexualAbuse (int)
- total (int)

### crimePredictions
- id (int)
- districtId (int, foreign key)
- crimeType (string)
- predictedYear (int)
- predictedValue (int)
- confidence (float)
- trend (string)
- riskLevel (string)

### dataUploads
- id (int)
- userId (int, foreign key)
- fileName (string)
- fileSize (int)
- recordsImported (int)
- status (string)
- uploadedAt (timestamp)

## Development

To run with auto-reload during development, use:

```bash
pip install flask-dotenv
FLASK_ENV=development FLASK_APP=app.py flask run
```

## Security Considerations

1. Always use strong JWT secrets in production
2. Use HTTPS in production
3. Implement proper authentication (not just email-based demo)
4. Use Supabase service role key only on backend
5. Implement rate limiting for production use
6. Add input validation for all endpoints
7. Consider adding request logging and monitoring

## License

MIT
