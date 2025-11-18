import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label: string;
	id: string;
}

export function Input({ label, id, ...props }: InputProps) {
	return (
		<div className="space-y-1">
			<label htmlFor={id} className="block text-sm font-medium text-gray-300">
				{label}
			</label>
			<input
				id={id}
				className="block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2"
				{...props}
			/>
		</div>
	);
}