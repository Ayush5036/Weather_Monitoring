import React from 'react';
import { ThermometerSun, ArrowUp, ArrowDown, Cloud } from 'lucide-react';

export const DailySummary = ({ data, city }) => {
  if (!data) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Daily Summary for {city}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <div className="flex items-center text-gray-600">
            <ThermometerSun className="w-4 h-4 mr-1" />
            <span>Average</span>
          </div>
          <p className="text-xl font-semibold">{data.avg_temperature}°C</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center text-gray-600">
            <ArrowUp className="w-4 h-4 mr-1" />
            <span>Maximum</span>
          </div>
          <p className="text-xl font-semibold">{data.max_temperature}°C</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center text-gray-600">
            <ArrowDown className="w-4 h-4 mr-1" />
            <span>Minimum</span>
          </div>
          <p className="text-xl font-semibold">{data.min_temperature}°C</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center text-gray-600">
            <Cloud className="w-4 h-4 mr-1" />
            <span>Condition</span>
          </div>
          <p className="text-xl font-semibold">{data.dominant_condition}</p>
        </div>
      </div>
    </div>
  );
};
