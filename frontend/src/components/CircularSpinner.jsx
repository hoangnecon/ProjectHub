import React from 'react';

const CircularSpinner = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const sizeClass = size ? sizeClasses[size] : 'h-8 w-8';

  return (
    <div className={`animate-spin rounded-full border-4 border-blue-500 border-t-transparent ${sizeClass} ${className}`}>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default CircularSpinner;
