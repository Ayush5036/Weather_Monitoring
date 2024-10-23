// AlertNotification.jsx
import React, { useEffect } from 'react';
import { Toast, ToastProvider } from "@/components/ui/toast";
import { AlertTriangle } from 'lucide-react';

export const AlertNotification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

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