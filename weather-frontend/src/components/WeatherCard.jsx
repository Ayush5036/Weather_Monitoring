import React from 'react';
import { Cloud, Droplets, Sun, CloudRain } from 'lucide-react';

const WeatherIcon = ({ condition }) => {
  switch (condition?.toLowerCase()) {
    case 'clear':
      return <Sun className="w-8 h-8 text-yellow-500" />;
    case 'clouds':
      return <Cloud className="w-8 h-8 text-gray-500" />;
    case 'rain':
      return <CloudRain className="w-8 h-8 text-blue-500" />;
    default:
      return <Cloud className="w-8 h-8 text-gray-500" />;
  }
};

export const WeatherCard = ({ data, unitSymbol }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{data.city}</h3>
        <WeatherIcon condition={data.main_condition} />
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold">{data.temperature.toFixed(1)}{unitSymbol}</p> {/* Updated with dynamic unit */}
        <p className="text-gray-600">Feels like: {data.feels_like.toFixed(1)}{unitSymbol}</p> {/* Updated with dynamic unit */}
        <p className="text-gray-600">Condition: {data.main_condition}</p>
      </div>
    </div>
  );
};
