import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export const AlertCard = ({ currentTemp, alertType, onThresholdUpdate, unitSymbol }) => {
  const [minThreshold, setMinThreshold] = useState(0);
  const [maxThreshold, setMaxThreshold] = useState(50);
  const [alertMessage, setAlertMessage] = useState("");

  
  currentTemp=Number(currentTemp)

  useEffect(() => {
    
    if (currentTemp < minThreshold) {
      
      setAlertMessage(`Temperature dropped below ${minThreshold}${unitSymbol}`);
    } else if (currentTemp > maxThreshold) {
      setAlertMessage(`Temperature exceeded ${maxThreshold}${unitSymbol}`);
    } else {
      setAlertMessage('');
    }
  }, [currentTemp, minThreshold, maxThreshold, unitSymbol]);

  // Call the callback function when thresholds are updated
  useEffect(() => {
    
    onThresholdUpdate({ minThreshold, maxThreshold });
  }, [minThreshold, maxThreshold]);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-1 mr-2" />
        <div>
          <h4 className="text-red-800 font-medium">{alertType}</h4>
          <p className="text-red-600 mt-1">{alertMessage || 'All clear'}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="block text-gray-600">Set Minimum Threshold ({unitSymbol}):</label>
        <input
          type="number"
          value={minThreshold}
          onChange={(e) => setMinThreshold(Number(e.target.value))}
          className="block w-full rounded-md border-gray-300"
        />
        <label className="block text-gray-600">Set Maximum Threshold ({unitSymbol}):</label>
        <input
          type="number"
          value={maxThreshold}
          onChange={(e) => setMaxThreshold(Number(e.target.value))}
          className="block w-full rounded-md border-gray-300"
        />
      </div>
    </div>
  );
};