import { useState, useCallback } from 'react';

export const useError = () => {
  const [error, setError] = useState(null);

  const showError = useCallback((message) => {
    setError(message);
  }, []);

  const hideError = useCallback(() => {
    setError(null);
  }, []);

  return { error, showError, hideError };
};
