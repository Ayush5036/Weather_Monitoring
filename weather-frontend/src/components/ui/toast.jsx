import * as ToastPrimitive from '@radix-ui/react-toast';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

export const Toast = ({ open, onOpenChange, title, description }) => {
    return (
        <ToastPrimitive.Root
            open={open}
            onOpenChange={onOpenChange}
            className={clsx(
                'bg-white dark:bg-gray-900 text-black dark:text-white p-4 rounded-lg shadow-lg',
                'flex items-center space-x-3 w-72'
            )}
        >
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div className="flex flex-col">
                <ToastPrimitive.Title className="text-sm font-semibold">
                    {title}
                </ToastPrimitive.Title>
                {description && (
                    <ToastPrimitive.Description className="text-xs text-gray-600 dark:text-gray-300">
                        {description}
                    </ToastPrimitive.Description>
                )}
            </div>
        </ToastPrimitive.Root>
    );
};

export const ToastProvider = ToastPrimitive.Provider;
