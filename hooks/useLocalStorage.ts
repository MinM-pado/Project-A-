
import { useState, useEffect } from 'react';

// Simple obfuscation using base64
const encode = (str: string) => typeof window !== 'undefined' ? window.btoa(str) : str;
const decode = (str: string) => typeof window !== 'undefined' ? window.atob(str) : str;

export function useLocalStorage<T,>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(decode(item)) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, encode(JSON.stringify(valueToStore)));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    try {
        const item = window.localStorage.getItem(key);
        if (item) {
            setStoredValue(JSON.parse(decode(item)));
        }
    } catch (error) {
        console.error("Could not parse localStorage item", error);
        window.localStorage.removeItem(key);
    }
  }, [key]);

  return [storedValue, setValue];
}
