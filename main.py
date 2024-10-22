from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
from datetime import datetime, timedelta
import sqlite3
from typing import List, Dict
import statistics
from collections import Counter
from pydantic import BaseModel
import json
from datetime import datetime
import pytz
from contextlib import asynccontextmanager

# Background task to fetch weather data periodically
async def periodic_weather_update(app):
    while True:
        async with httpx.AsyncClient() as client:
            for city in CITIES:
                try:
                    url = f"https://api.openweathermap.org/data/2.5/weather?q={city},IN&appid={OPENWEATHER_API_KEY}&units=metric"
                    response = await client.get(url)
                    response.raise_for_status()  # Raise an exception for bad status codes
                    data = response.json()
                    
                    weather_data = WeatherData(
                        city=city,
                        temperature=data['main']['temp'],  # Already in Celsius due to units=metric
                        feels_like=data['main']['feels_like'],
                        main_condition=data['weather'][0]['main'],
                        timestamp=data['dt']
                    )
                    
                    store_weather_data(weather_data)
                    check_temperature_alerts(weather_data)  # Check if it crosses user-set thresholds
                except Exception as e:
                    print(f"Error fetching data for {city}: {str(e)}")
                    continue
        
        await asyncio.sleep(300)  # 5 minutes

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

# Configuration
OPENWEATHER_API_KEY = "5ae24b5c72131d81c78ef626e6ff005f"
CITIES = ["Delhi", "Mumbai", "Chennai", "Bangalore", "Kolkata", "Hyderabad"]

# Database initialization
def init_db():
    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    # Create tables for weather data, alerts, and user thresholds
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

# Pydantic models
class WeatherData(BaseModel):
    city: str
    temperature: float
    feels_like: float
    main_condition: str
    timestamp: int

class ThresholdRequest(BaseModel):
    city: str
    min_temp: float
    max_temp: float

class Alert(BaseModel):
    city: str
    alert_type: str
    message: str
    timestamp: int

# Helper functions
async def fetch_weather_data(city: str) -> WeatherData:
    async with httpx.AsyncClient() as client:
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?q={city},IN&appid={OPENWEATHER_API_KEY}&units=metric"
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            return WeatherData(
                city=city,
                temperature=data['main']['temp'],
                feels_like=data['main']['feels_like'],
                main_condition=data['weather'][0]['main'],
                timestamp=data['dt']
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching weather data for {city}: {str(e)}")

def store_weather_data(weather_data: WeatherData):
    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    c.execute('''
        INSERT INTO weather_data (city, temperature, feels_like, main_condition, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        weather_data.city,
        weather_data.temperature,
        weather_data.feels_like,
        weather_data.main_condition,
        weather_data.timestamp
    ))
    
    conn.commit()
    conn.close()

def check_temperature_alerts(weather_data: WeatherData):
    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    # Check user-defined thresholds first
    c.execute('''
        SELECT min_temp, max_temp
        FROM user_thresholds
        WHERE city = ?
    ''', (weather_data.city,))
    
    threshold = c.fetchone()
    
    if threshold:
        min_temp, max_temp = threshold
        if weather_data.temperature < min_temp:
            alert = Alert(
                city=weather_data.city,
                alert_type="low_temperature",
                message=f"Temperature dropped below {min_temp}°C",
                timestamp=int(datetime.now().timestamp())
            )
            save_alert(alert, c)
        elif weather_data.temperature > max_temp:
            alert = Alert(
                city=weather_data.city,
                alert_type="high_temperature",
                message=f"Temperature exceeded {max_temp}°C",
                timestamp=int(datetime.now().timestamp())
            )
            save_alert(alert, c)
    else:
        # Default high temperature threshold logic
        if weather_data.temperature > 35:  # Default threshold
            alert = Alert(
                city=weather_data.city,
                alert_type="high_temperature",
                message=f"Temperature exceeded 35°C",
                timestamp=int(datetime.now().timestamp())
            )
            save_alert(alert, c)
    
    conn.commit()
    conn.close()

def save_alert(alert: Alert, cursor):
    cursor.execute('''
        INSERT INTO alerts (city, alert_type, message, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (alert.city, alert.alert_type, alert.message, alert.timestamp))

# New Endpoint to Set User Thresholds
@app.post("/alerts/threshold")
async def set_temperature_threshold(threshold: ThresholdRequest):
    """Set user-defined temperature thresholds for a specific city"""
    conn = sqlite3.connect('weather_data.db')
    c = conn.cursor()
    
    # Insert or update threshold for the city
    c.execute('''
        INSERT INTO user_thresholds (city, min_temp, max_temp)
        VALUES (?, ?, ?)
        ON CONFLICT(city) DO UPDATE SET min_temp = excluded.min_temp, max_temp = excluded.max_temp
    ''', (threshold.city, threshold.min_temp, threshold.max_temp))
    
    conn.commit()
    conn.close()
    return {"message": f"Thresholds set for {threshold.city}"}

# API Endpoints for weather and alerts
@app.get("/weather/current")
async def get_current_weather():
    """Get current weather for all cities"""
    results = []
    for city in CITIES:
        try:
            weather_data = await fetch_weather_data(city)
            results.append(weather_data)
            store_weather_data(weather_data)
            check_temperature_alerts(weather_data)
        except Exception as e:
            print(f"Error processing {city}: {str(e)}")
            continue
    return results

@app.get("/weather/daily-summary/{city}")
async def get_daily_summary(city: str):
    """Get daily weather summary for a specific city"""
    if city not in CITIES:
        raise HTTPException(status_code=404, detail="City not found")
        
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
    
    temperatures = [r[0] for r in results]
    conditions = [r[1] for r in results]
    
    summary = {
        "city": city,
        "date": today.date().isoformat(),
        "avg_temperature": round(statistics.mean(temperatures), 2),
        "max_temperature": round(max(temperatures), 2),
        "min_temperature": round(min(temperatures), 2),
        "dominant_condition": max(set(conditions), key=conditions.count)
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
    
    c.execute('''
        SELECT * FROM alerts
        WHERE city = ?
        ORDER BY timestamp DESC
        LIMIT 10
    ''', (city,))
    
    alerts = [{
        "city": row[1],
        "alert_type": row[2],
        "message": row[3],
        "timestamp": row[4]
    } for row in c.fetchall()]
    
    conn.close()
    return alerts
