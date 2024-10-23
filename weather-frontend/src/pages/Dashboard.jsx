import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { WeatherCard } from '../components/WeatherCard';
import { AlertCard } from '../components/AlertCard';
import { DailySummary } from '../components/DailySummary';
import { TemperatureChart } from '../components/TemperatureChart';
import { WeatherHistory } from '../components/WeatherHistory';  // Import the new component
import { MapPin } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export const Dashboard = () => {
  const [currentWeather, setCurrentWeather] = useState([]);
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [selectedUnit, setSelectedUnit] = useState('metric'); // Unit state
  const [dailySummary, setDailySummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState({ minThreshold: 0, maxThreshold: 50 });
  const [weatherHistory, setWeatherHistory] = useState([]);  // State for weather history
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cities = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad'];
  const units = [
    { label: 'Celsius', value: 'metric' },
    { label: 'Fahrenheit', value: 'imperial' },
    { label: 'Kelvin', value: 'standard' },
  ];

  // Helper function to get the unit symbol
  const getUnitSymbol = (unit) => {
    if (unit === 'imperial') return '°F';
    if (unit === 'standard') return 'K';
    return '°C';
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch current weather with selected unit
      const weatherResponse = await axios.get(`${API_BASE_URL}/weather/current`, {
        params: { unit: selectedUnit },
      });
      setCurrentWeather(weatherResponse.data);

      // Fetch daily summary for selected city
      const summaryResponse = await axios.get(`${API_BASE_URL}/weather/daily-summary/${selectedCity}`, {
        params: { unit: selectedUnit },
      });
      setDailySummary(summaryResponse.data);

      // Fetch alerts for selected city
      const alertsResponse = await axios.get(`${API_BASE_URL}/alerts/${selectedCity}`, {
        params: { unit: selectedUnit },
      });
      setAlerts(alertsResponse.data);

      // Fetch last month's weather history
      const historyResponse = await axios.get(`${API_BASE_URL}/api/weather/${selectedCity}/last_month`, {
        params: { unit: selectedUnit },
      });
      setWeatherHistory(historyResponse.data);  // Update the weather history

      setError(null);
    } catch (err) {
      setError('Failed to fetch weather data. Please try again later.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateThresholds = async (thresholds) => {
    setThresholds(thresholds);
  
    try {
      await axios.post(`${API_BASE_URL}/alerts/threshold`, {
        city: selectedCity,
        min_temp: thresholds.minThreshold,
        max_temp: thresholds.maxThreshold,
        unit: selectedUnit
      });
      console.log('POST request successful'); // This will log if the request was successful
    } catch (err) {
      console.error('Error in POST request:', err); // General error log
      if (err.response) {
        console.error('Error response data:', err.response.data);
      } else {
        console.error('Error message:', err.message);
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [selectedCity, selectedUnit]); // Add selectedUnit as a dependency

  if (loading && !currentWeather.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-weather-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Weather Monitoring System</h1>
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-weather-500" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-weather-500 focus:ring-weather-500"
            >
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            {/* Unit selection dropdown */}
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-weather-500 focus:ring-weather-500"
            >
              {units.map(unit => (
                <option key={unit.value} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 p-4 rounded-md border border-red-200">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {currentWeather.map(weather => (
            <WeatherCard 
              key={weather.city} 
              data={weather} 
              unitSymbol={getUnitSymbol(selectedUnit)} // Pass unit symbol to WeatherCard
            />
          ))}
        </div>

        <div className="space-y-8">
          <DailySummary 
            data={dailySummary} 
            city={selectedCity} 
            unitSymbol={getUnitSymbol(selectedUnit)} // Pass unit symbol to DailySummary
          />
          
          <TemperatureChart 
            data={currentWeather} 
            unitSymbol={getUnitSymbol(selectedUnit)} // Pass unit symbol to TemperatureChart
          />

          <AlertCard 
            city={selectedCity} 
            currentTemp={dailySummary?.avg_temperature} 
            alertType="Temperature Alert" 
            onThresholdUpdate={updateThresholds} 
            unitSymbol={getUnitSymbol(selectedUnit)} // Pass unit symbol to AlertCard
            minThreshold={thresholds.minThreshold} // Pass min threshold
            maxThreshold={thresholds.maxThreshold}
          />

          {/* Weather History for the last month */}
          <WeatherHistory city={selectedCity} />

          {alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Weather Alerts</h3>
              <div className="space-y-4">
                {alerts.map((alert, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
