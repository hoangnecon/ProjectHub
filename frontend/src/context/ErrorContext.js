import React, { createContext, useContext } from 'react';
import { useError } from '../hooks/useError';
import { setGlobalErrorHandler } from '../utils/api';
import ErrorModal from '../components/ErrorModal';

const ErrorContext = createContext();

export const useErrorContext = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const { error, showError, hideError } = useError();

  React.useEffect(() => {
    setGlobalErrorHandler(showError);
  }, [showError]);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      <ErrorModal message={error} onClose={hideError} />
    </ErrorContext.Provider>
  );
};