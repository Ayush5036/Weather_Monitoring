import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const TemperatureChart = ({ data, unitSymbol }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Temperature Trends</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="city" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="temperature" 
              stroke="#0ea5e9" 
              name={`Temperature (${unitSymbol})`} // Update label with dynamic unit symbol
            />
            <Line 
              type="monotone" 
              dataKey="feels_like" 
              stroke="#14b8a6" 
              name={`Feels Like (${unitSymbol})`} // Update label with dynamic unit symbol
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
