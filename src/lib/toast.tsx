"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
	id: string;
	message: string;
	type: ToastType;
}

interface ToastContextType {
	showToast: (message: string, type?: ToastType) => void;
	success: (message: string) => void;
	error: (message: string) => void;
	info: (message: string) => void;
	warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const removeToast = useCallback((id: string) => {
		setToasts(prev => prev.filter(toast => toast.id !== id));
	}, []);

	const showToast = useCallback((message: string, type: ToastType = 'info') => {
		const id = Math.random().toString(36).substring(7);
		setToasts(prev => [...prev, { id, message, type }]);

		// Auto-remove after 5 seconds
		setTimeout(() => removeToast(id), 5000);
	}, [removeToast]);

	const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
	const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
	const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);
	const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);

	return (
		<ToastContext.Provider value={{ showToast, success, error, info, warning }}>
			{children}
			<ToastContainer toasts={toasts} onRemove={removeToast} />
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
	if (toasts.length === 0) return null;

	return (
		<div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
			{toasts.map(toast => (
				<ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
			))}
		</div>
	);
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
	const icons = {
		success: <FaCheckCircle className="text-green-400" size={20} />,
		error: <FaExclamationCircle className="text-red-400" size={20} />,
		info: <FaInfoCircle className="text-blue-400" size={20} />,
		warning: <FaExclamationCircle className="text-yellow-400" size={20} />,
	};

	const bgColors = {
		success: 'bg-green-900/90',
		error: 'bg-red-900/90',
		info: 'bg-blue-900/90',
		warning: 'bg-yellow-900/90',
	};

	const borderColors = {
		success: 'border-green-700',
		error: 'border-red-700',
		info: 'border-blue-700',
		warning: 'border-yellow-700',
	};

	return (
		<div
			className={`${bgColors[toast.type]} ${borderColors[toast.type]} border rounded-lg p-4 shadow-lg backdrop-blur-sm flex items-start gap-3 animate-slide-in`}
		>
			<div className="flex-shrink-0">{icons[toast.type]}</div>
			<p className="text-white text-sm flex-grow">{toast.message}</p>
			<button
				onClick={() => onRemove(toast.id)}
				className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
			>
				<FaTimes size={14} />
			</button>
		</div>
	);
}
