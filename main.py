from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
from datetime import datetime, timedelta
import sqlite3
from typing import List, Dict, Optional
import statistics
from collections import Counter
from pydantic import BaseModel
import json
from datetime import datetime
import pytz
from contextlib import asynccontextmanager
import time
from sqlalchemy.orm import Session

# Pydantic models
class WeatherData(BaseModel):
    city: str
    temperature: float
    feels_like: float
    main_condition: str
    timestamp: int
    unit: str = 'metric'

class ThresholdRequest(BaseModel):
    city: str
    min_temp: float
    max_temp: float
    unit: str = 'metric'

class Alert(BaseModel):
    city: str
    alert_type: str
    message: str
    timestamp: int

# Configuration
OPENWEATHER_API_KEY = "5ae24b5c72131d81c78ef626e6ff005f"
CITIES = ["Delhi", "Mumbai", "Chennai", "Bangalore", "Kolkata", "Hyderabad"]
VALID_UNITS = ['metric', 'imperial', 'standard']

def convert_to_celsius(temp: float, unit: str) -> float:
    """Convert temperature to Celsius from given unit"""
    if unit == 'imperial':  # Fahrenheit
        return (temp - 32) * 5.0/9.0
    elif unit == 'standard':  # Kelvin
        return temp - 273.15
    return temp  # Already Celsius (metric)

def convert_from_celsius(temp: float, unit: str) -> float:
    """Convert temperature from Celsius to desired unit"""
    if unit == 'imperial':  # To Fahrenheit
        return (temp * 9.0/5.0) + 32
    elif unit == 'standard':  # To Kelvin
        return temp + 273.15
    return temp  # Keep as Celsius (metric)

# Background task to fetch weather data periodically
async def periodic_weather_update(app):
    while True:
        async with httpx.AsyncClient() as client:
            for city in CITIES:
                try:
                    # Always fetch in metric (Celsius) for consistency
                    url = f"https://api.openweathermap.org/data/2.5/weather?q={city},IN&appid={OPENWEATHER_API_KEY}&units=metric"
                    response = await client.get(url)
                    response.raise_for_status()
                    data = response.json()

                    weather_data = WeatherData(
                        city=city,
                        temperature=data['main']['temp'],
                        feels_like=data['main']['feels_like'],
                        main_condition=data['weather'][0]['main'],
                        timestamp=data['dt'],
                        unit='metric'
                    )

                    store_weather_data(weather_data)
                    check_temperature_alerts(weather_data)
                except Exception as e:
                    print(f"Error fetching data for {city}: {str(e)}")
                    continue

        await asyncio.sleep(300)  # 5 minutes interval

# Database initialization
def init_db():
    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS weather_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT,
            temperature REAL,
            feels_like REAL,
            main_condition TEXT,
            timestamp INTEGER
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT,
            alert_type TEXT,
            message TEXT,
            timestamp INTEGER
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_thresholds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT UNIQUE,
            min_temp REAL,
            max_temp REAL
        )
    ''')
    
    conn.commit()
    conn.close()

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database and start background task
    init_db()
    task = asyncio.create_task(periodic_weather_update(app))
    yield
    # Shutdown: Cancel background task
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

# Initialize FastAPI with lifespan
app = FastAPI(title="Weather Monitoring System", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AlertTracker:
    def __init__(self):
        self.consecutive_breaches: Dict[str, Dict] = {}  # Track consecutive breaches per city
        self.breach_threshold = 2  # Number of consecutive breaches needed to trigger alert

alert_tracker = AlertTracker()

async def fetch_weather_data(city: str, unit: str = 'metric') -> WeatherData:
    """Fetch weather data from OpenWeather API"""
    async with httpx.AsyncClient() as client:
        try:
            # Always fetch in metric (Celsius) for consistency
            url = f"https://api.openweathermap.org/data/2.5/weather?q={city},IN&appid={OPENWEATHER_API_KEY}&units=metric"
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            # Store the raw Celsius data
            temperature = data['main']['temp']
            feels_like = data['main']['feels_like']

            # Convert to requested unit if needed
            if unit != 'metric':
                temperature = convert_from_celsius(temperature, unit)
                feels_like = convert_from_celsius(feels_like, unit)

            weather_data = WeatherData(
                city=city,
                temperature=temperature,
                feels_like=feels_like,
                main_condition=data['weather'][0]['main'],
                timestamp=data['dt'],
                unit=unit
            )

            return weather_data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching weather data for {city}: {str(e)}")

def store_weather_data(weather_data: WeatherData):
    """Store weather data in Celsius"""
    # Convert to Celsius if needed
    temperature = convert_to_celsius(weather_data.temperature, weather_data.unit)
    feels_like = convert_to_celsius(weather_data.feels_like, weather_data.unit)

    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    c.execute('''
        INSERT INTO weather_data (city, temperature, feels_like, main_condition, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        weather_data.city,
        temperature,
        feels_like,
        weather_data.main_condition,
        weather_data.timestamp
    ))
    
    conn.commit()
    conn.close()

# Update the check_temperature_alerts function
def check_temperature_alerts(weather_data: WeatherData):
    """Check for temperature alerts with consecutive breach tracking"""
    # Convert temperature to Celsius for comparison
    temperature = convert_to_celsius(weather_data.temperature, weather_data.unit)
    current_time = datetime.now()

    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    c.execute('''
        SELECT min_temp, max_temp
        FROM user_thresholds
        WHERE city = ?
    ''', (weather_data.city,))
    
    threshold = c.fetchone()
    
    if threshold:
        min_temp, max_temp = threshold
        city_breaches = alert_tracker.consecutive_breaches.get(weather_data.city, {
            'count': 0,
            'type': None,
            'last_check': None
        })

        # Check if this is a consecutive breach within 10 minutes
        is_consecutive = (
            city_breaches['last_check'] is not None and
            (current_time - city_breaches['last_check']).total_seconds() <= 600  # 10 minutes
        )

        # Reset if too much time has passed
        if not is_consecutive:
            city_breaches['count'] = 0
            city_breaches['type'] = None

        if temperature < min_temp:
            if city_breaches['type'] == 'low' and is_consecutive:
                city_breaches['count'] += 1
            else:
                city_breaches['count'] = 1
                city_breaches['type'] = 'low'
        elif temperature > max_temp:
            if city_breaches['type'] == 'high' and is_consecutive:
                city_breaches['count'] += 1
            else:
                city_breaches['count'] = 1
                city_breaches['type'] = 'high'
        else:
            # Reset if temperature is within bounds
            city_breaches['count'] = 0
            city_breaches['type'] = None

        # Update last check time
        city_breaches['last_check'] = current_time
        alert_tracker.consecutive_breaches[weather_data.city] = city_breaches

        # Create alert if threshold breached consecutively
        if city_breaches['count'] >= alert_tracker.breach_threshold:
            alert_type = f"consecutive_{city_breaches['type']}_temperature"
            message = (
                f"Temperature {'below' if city_breaches['type'] == 'low' else 'above'} "
                f"threshold for {city_breaches['count']} consecutive checks"
            )
            alert = Alert(
                city=weather_data.city,
                alert_type=alert_type,
                message=message,
                timestamp=int(current_time.timestamp())
            )
            save_alert(alert, c)
            # Reset after creating alert
            city_breaches['count'] = 0
            city_breaches['type'] = None
            print(f"ALERT: {message} in {weather_data.city}")  # Console output
    
    conn.commit()
    conn.close()

def save_alert(alert: Alert, cursor):
    """Save alert to database"""
    cursor.execute('''
        INSERT INTO alerts (city, alert_type, message, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (alert.city, alert.alert_type, alert.message, alert.timestamp))

@app.post("/alerts/threshold")
async def set_temperature_threshold(threshold: ThresholdRequest):
    """Set user-defined temperature thresholds for a specific city"""

    print("Received Threshold:", threshold)
    if threshold.unit not in VALID_UNITS:
        raise HTTPException(status_code=400, detail="Invalid unit. Use 'metric', 'imperial', or 'standard'")

    # Convert threshold temperatures to Celsius for storage
    min_temp_celsius = convert_to_celsius(threshold.min_temp, threshold.unit)
    max_temp_celsius = convert_to_celsius(threshold.max_temp, threshold.unit)
    
    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    c.execute('''
        INSERT INTO user_thresholds (city, min_temp, max_temp)
        VALUES (?, ?, ?)
        ON CONFLICT(city) DO UPDATE SET min_temp = excluded.min_temp, max_temp = excluded.max_temp
    ''', (threshold.city, min_temp_celsius, max_temp_celsius))
    
    conn.commit()
    conn.close()

    unit_symbol = '°C' if threshold.unit == 'metric' else '°F' if threshold.unit == 'imperial' else 'K'
    return {
        "message": f"Thresholds set for {threshold.city}",
        "min_temp": f"{threshold.min_temp}{unit_symbol}",
        "max_temp": f"{threshold.max_temp}{unit_symbol}",
        "unit": threshold.unit
    }

@app.get("/weather/current")
async def get_current_weather(unit: str = Query('metric', enum=VALID_UNITS)):
    """Get current weather for all cities"""
    if unit not in VALID_UNITS:
        raise HTTPException(status_code=400, detail="Invalid unit. Use 'metric', 'imperial', or 'standard'")

    results = []
    for city in CITIES:
        try:
            weather_data = await fetch_weather_data(city, unit)
            results.append(weather_data)
            store_weather_data(weather_data)
            check_temperature_alerts(weather_data)
        except Exception as e:
            print(f"Error processing {city}: {str(e)}")
            continue
    return results

@app.get("/weather/daily-summary/{city}")
async def get_daily_summary(
    city: str,
    unit: str = Query('metric', enum=VALID_UNITS)
):
    """Get daily weather summary for a specific city"""
    if city not in CITIES:
        raise HTTPException(status_code=404, detail="City not found")
    if unit not in VALID_UNITS:
        raise HTTPException(status_code=400, detail="Invalid unit. Use 'metric', 'imperial', or 'standard'")
        
    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_timestamp = int(today.timestamp())
    
    c.execute('''
        SELECT temperature, main_condition
        FROM weather_data
        WHERE city = ? AND timestamp >= ?
    ''', (city, today_timestamp))
    
    results = c.fetchall()
    
    if not results:
        raise HTTPException(status_code=404, detail="No data found for today")
    
    temperatures = [r[0] for r in results]  # These are in Celsius
    conditions = [r[1] for r in results]
    
    # Calculate statistics in Celsius first
    avg_temperature = statistics.mean(temperatures)
    max_temperature = max(temperatures)
    min_temperature = min(temperatures)
    dominant_condition = max(set(conditions), key=conditions.count)
    
    # Convert temperatures to requested unit
    if unit != 'metric':
        avg_temperature = convert_from_celsius(avg_temperature, unit)
        max_temperature = convert_from_celsius(max_temperature, unit)
        min_temperature = convert_from_celsius(min_temperature, unit)
    
    # Round all temperatures after conversion
    avg_temperature = round(avg_temperature, 2)
    max_temperature = round(max_temperature, 2)
    min_temperature = round(min_temperature, 2) 
    
    # Get the appropriate unit symbol
    unit_symbol = '°C' if unit == 'metric' else '°F' if unit == 'imperial' else 'K'
    
    summary = {
        "city": city,
        "date": today.date().isoformat(),
        "avg_temperature": f"{avg_temperature}",
        "max_temperature": f"{max_temperature}",
        "min_temperature": f"{min_temperature}",
        "dominant_condition": dominant_condition,
        "unit": unit
    }
    
    conn.close()
    return summary

@app.get("/alerts/{city}")
async def get_alerts(city: str):
    """Get alerts for a specific city"""
    if city not in CITIES:
        raise HTTPException(status_code=404, detail="City not found")
        
    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()

    ten_minutes_ago = int(time.time()) - 600  # 600 seconds = 10 minutes

    # Fetch alerts within the last 10 minutes for the specific city
    c.execute('''
        SELECT * FROM alerts
        WHERE city = ? AND timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT 10
    ''', (city, ten_minutes_ago))
    
    alerts = [{
        "city": row[1],
        "alert_type": row[2],
        "message": row[3],
        "timestamp": row[4]
    } for row in c.fetchall()]
    
    conn.close()
    return alerts

@app.delete("/database/clear")
async def clear_db():
    """Clear all data in the database"""
    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    c.execute('DELETE FROM weather_data')
    c.execute('DELETE FROM alerts')
    c.execute('DELETE FROM user_thresholds')
    
    conn.commit()
    conn.close()
    return {"message": "All data cleared successfully"}


@app.get("/api/weather/{city}/last_month")
async def get_last_month_weather(city: str):
    """Get weather data for the last month for a specific city"""
    # Calculate the date range for the last 30 days
    today = datetime.now()
    last_month_date = today - timedelta(days=30)
    last_month_timestamp = int(last_month_date.timestamp())

    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()

    try:
        # Query the database for weather data from the last 30 days
        c.execute('''
            SELECT DISTINCT city, avg(temperature), avg(feels_like), max(main_condition), timestamp
            FROM weather_data
            WHERE city = ? AND timestamp >= ?
        ''', (city, last_month_timestamp))
        
        weather_data = c.fetchall()

        
        
        if not weather_data:
            raise HTTPException(status_code=404, detail="No data found for the last month.")

        # Format the results into a list of dictionaries
        result = [
            {
                "city": row[0],
                "temperature":round(row[1],2),
                "feels_like": round(row[2],2),
                "main_condition": row[3],
                "timestamp": datetime.fromtimestamp(row[4]).isoformat()
            }
            for row in weather_data
        ]
        
        return JSONResponse(content={"data": result})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()
