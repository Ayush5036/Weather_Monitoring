# Weather Monitoring System

The **Weather Monitoring System** is a full-stack application designed to fetch, store, and monitor weather data for selected cities, including features to set and trigger alerts when temperature thresholds are crossed. The system also provides a historical weather report for the past month.

## Table of Contents

- [Technologies Used](#technologies-used)
- [Features](#features)
- [Backend](#backend)
- [Frontend](#frontend)
- [Database](#database)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)

## Technologies Used

- **Frontend**: React
- **Backend**: FastAPI (Python)
- **Database**: SQLite
- **Containerization**: Docker
- **Weather API**: OpenWeather API

## Features

- Real-time weather monitoring for selected cities.
- Store weather data periodically and trigger alerts based on set temperature thresholds.
- View the historical weather data of the last 30 days for a city.
- Unit selection for temperature display (Celsius/Fahrenheit).
- Threshold-based alerts.

## Backend

The backend is built with **FastAPI**, responsible for fetching weather data from the OpenWeather API, storing it in SQLite, and providing the logic for alerts and historical data retrieval. It runs on port **8000** and handles API endpoints for city weather, threshold settings, and historical data.

The entry point for the backend is `main.py` in the root folder, and it uses the command:
```bash
uvicorn main:app --reload
```

## Frontend

The frontend is built using **React** and is located in the `weather-frontend` directory. It provides a user-friendly interface to display current weather, set alerts, view weather history, and switch between temperature units. The frontend runs on port **5173** and is started using:
```bash
npm run dev
```

## Database

The project uses **SQLite** as the database to store weather data and alert thresholds. Weather data is periodically fetched from the OpenWeather API and stored in the database for analysis and history display.

## Setup Instructions

1. Clone the repository:

```bash
git clone https://github.com/Ayush5036/Weather_Monitoring.git
cd Weather_Monitoring
```

2. Ensure you have **Docker** installed.

3. Build the Docker containers:

```bash
docker-compose build
```

4. Run the containers:

```bash
docker-compose up
```

## Running the Application

- The **backend** will be available at: `http://localhost:8000`
- The **frontend** will be available at: `http://localhost:5173`

You can access the frontend to interact with the weather monitoring system, set thresholds, and view the weather history.

