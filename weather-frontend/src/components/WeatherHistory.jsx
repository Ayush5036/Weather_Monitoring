import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Cloud, Thermometer, Clock } from 'lucide-react';

export const WeatherHistory = ({ city }) => {
  const [weatherHistory, setWeatherHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeatherHistory = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:8000/api/weather/${city}/last_month`);
        if (!response.statusText === "OK") {
          throw new Error('Network response was not ok');
        }
        console.log(response.data.data)
        setWeatherHistory(response.data.data);
      } catch (error) {
        console.error('Error fetching weather history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherHistory();
  }, [city]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-sm">
        <div className="text-brown-600">Loading weather data...</div>
      </div>
    );
  }

  if (!Array.isArray(weatherHistory) || weatherHistory.length === 0) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-sm">
        <div className="text-center text-gray-600">No weather data available for {city}.</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Weather History for {city}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {weatherHistory.map((entry, index) => (
          <div 
            key={index}
            className="p-4 transition-all duration-200 bg-amber-50 rounded-lg hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-amber-800">{entry.city}</h3>
              <div className="p-2 bg-white rounded-full">
                <Cloud className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-600" />
                <p className="text-gray-700">
                  <span className="font-medium">{entry.temperature}°C</span>
                  <span className="ml-2 text-sm text-gray-500">
                    (Feels like: {entry.feels_like}°C)
                  </span>
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-600" />
                <p className="text-gray-700">
                  {entry.main_condition}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-gray-600">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

