import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { WeatherCard } from '../components/WeatherCard';
import { AlertCard } from '../components/AlertCard';
import { DailySummary } from '../components/DailySummary';
import { TemperatureChart } from '../components/TemperatureChart';
import { MapPin } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export const Dashboard = () => {
  const [currentWeather, setCurrentWeather] = useState([]);
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [dailySummary, setDailySummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState({ minThreshold: 0, maxThreshold: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cities = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad'];

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch current weather for all cities
      const weatherResponse = await axios.get(`${API_BASE_URL}/weather/current`);
      setCurrentWeather(weatherResponse.data);

      // Fetch daily summary for selected city
      const summaryResponse = await axios.get(`${API_BASE_URL}/weather/daily-summary/${selectedCity}`);
      setDailySummary(summaryResponse.data);

      // Fetch alerts for selected city
      const alertsResponse = await axios.get(`${API_BASE_URL}/alerts/${selectedCity}`);
      setAlerts(alertsResponse.data);

      setError(null);
    } catch (err) {
      setError('Failed to fetch weather data. Please try again later.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update thresholds and send to backend
  const updateThresholds = async (newThresholds) => {
    setThresholds(newThresholds);

    try {
      await axios.post(`${API_BASE_URL}/alerts/threshold`, {
        city: selectedCity,
        minThreshold: newThresholds.minThreshold,
        maxThreshold: newThresholds.maxThreshold,
      });
    } catch (err) {
      console.error('Failed to update thresholds:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [selectedCity]);

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
            />
          ))}
        </div>

        <div className="space-y-8">
          <DailySummary data={dailySummary} city={selectedCity} />
          
          <TemperatureChart data={currentWeather} />

          <AlertCard 
            currentTemp={dailySummary?.avg_temperature} 
            alertType="Temperature Alert" 
            onThresholdUpdate={updateThresholds} 
          />

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
