import React, { useEffect, useState } from 'react';
import { Toast } from "@/components/ui/toast"; // Ensure correct import path
import { AlertTriangle } from 'lucide-react';

export const AlertNotification = ({ message = "No alerts", onClose }) => {
  const [visible, setVisible] = useState(false); // Track visibility of the alert

  useEffect(() => {
    // Show the alert when the message changes
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false); // Hide alert after timeout
        onClose();
      }, 5000);

      return () => clearTimeout(timer); // Cleanup timer on unmount
    }
  }, [message, onClose]);

  if (!visible) return null; // Don't render anything if not visible

  return (
    <Toast.Provider>
      <Toast.Root className="bg-red-100 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <Toast.Title className="text-red-800 font-medium">
            Weather Alert
          </Toast.Title>
        </div>
        <Toast.Description className="text-red-600 mt-1">
          {message}
        </Toast.Description>
      </Toast.Root>
    </Toast.Provider>
  );
};
