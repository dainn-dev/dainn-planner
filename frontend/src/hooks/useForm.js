import { useState } from 'react';

/**
 * Custom hook for form state management
 * @param {Object} initialValues - Initial form values
 * @returns {Object} Form state and handlers
 */
export const useForm = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    handleChange(name, type === 'checkbox' ? checked : value);
  };

  const setValue = (field, value) => {
    handleChange(field, value);
  };

  const setError = (field, error) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const reset = (newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
  };

  const validate = (validationRules) => {
    const newErrors = {};
    
    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field];
      const value = values[field];
      
      if (rule.required && !value) {
        newErrors[field] = rule.message || `${field} is required`;
      } else if (rule.validate && value) {
        const validationResult = rule.validate(value, values);
        if (validationResult !== true) {
          newErrors[field] = validationResult;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    values,
    errors,
    handleChange,
    handleInputChange,
    setValue,
    setError,
    reset,
    validate,
  };
};

