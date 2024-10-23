import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AlertNotification } from './AlertNotification';
import axios from 'axios';
export const AlertCard = ({ city, currentTemp, alertType, unitSymbol, minThreshold, maxThreshold, onThresholdUpdate }) => {
  const [alertMessage, setAlertMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [previousAlertCount, setPreviousAlertCount] = useState(0);
  const [minInput, setMinInput] = useState(minThreshold); // Track user input for min threshold
  const [maxInput, setMaxInput] = useState(maxThreshold); // Track user input for max threshold

  const API_BASE_URL = 'http://localhost:8000';

  // Fetch alerts periodically
  useEffect(() => {
    const fetchAlerts = async () => {
      if (!city) {
        console.error("City is not defined");
        return; // Exit early if city is not defined
      }
      try {
        const response = await axios.get(`http://localhost:8000/alerts/${city}`);
        if (response.ok) {
          
          const data = await response.json();
          setAlerts(data);
          
          // Check for new consecutive breach alerts
          const consecutiveAlerts = data.filter(alert => 
            alert.alert_type.startsWith('consecutive_')
          );
          console.log(maxThreshold)
          if (consecutiveAlerts.length <=0) {
            setShowNotification(true);
            setAlertMessage(consecutiveAlerts[0].message);
            setPreviousAlertCount(consecutiveAlerts.length);
          }
        }
        
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    const interval = setInterval(fetchAlerts, 30000); // Check every 30 seconds
    fetchAlerts(); // Initial fetch

    return () => clearInterval(interval);
  }, [city, previousAlertCount]);

  // Check current temperature against thresholds
  useEffect(() => {
    if (currentTemp < minInput) {
      setAlertMessage(`Temperature dropped below ${minInput}${unitSymbol}`);
    } else if (currentTemp > maxInput) {
      setAlertMessage(`Temperature exceeded ${maxInput}${unitSymbol}`);
    } else {
      setAlertMessage('');
    }
  }, [currentTemp, minInput, maxInput, unitSymbol]);

  // Update thresholds in the parent component
  const handleThresholdUpdate = () => {
    onThresholdUpdate({ minThreshold: minInput, maxThreshold: maxInput });
  };

  return (
    <div className="relative">
      {showNotification && (
        <AlertNotification 
          message={alertMessage|| "Alert!"}
          onClose={() => setShowNotification(false)}
        />
      )}

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
            value={minInput}
            onChange={(e) => setMinInput(Number(e.target.value))} // Update min input state
            className="block w-full rounded-md border-gray-300 px-3 py-2"
          />
          <label className="block text-gray-600">Set Maximum Threshold ({unitSymbol}):</label>
          <input
            type="number"
            value={maxInput}
            onChange={(e) => setMaxInput(Number(e.target.value))} // Update max input state
            className="block w-full rounded-md border-gray-300 px-3 py-2"
          />
          <button
            onClick={handleThresholdUpdate}
            className="mt-2 w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Update Thresholds
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="mt-4">
            <h5 className="font-medium text-gray-700">Recent Alerts:</h5>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {alerts.map((alert, index) => (
                <div key={index} className="text-sm text-gray-600 border-l-2 border-red-400 pl-2">
                  {alert.message}
                  <span className="text-xs text-gray-500 block">
                    {new Date(alert.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
