import React from 'react';

const LoadingSpinner = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-6xl',
    large: 'text-8xl',
  };

  const text = "ProjectHub";

  return (
    <h1 className={`font-bold tracking-wider ${sizeClasses[size]} animate-gradient-text`}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="animated-char"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {char}
        </span>
      ))}
    </h1>
  );
};

export default LoadingSpinner;
