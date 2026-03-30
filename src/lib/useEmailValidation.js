// lib/useEmailValidation.js
'use client';

import { useState } from 'react';

export function useEmailValidation() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value) => {
    setEmail(value);
    if (!value) {
      setEmailError('');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
    } else if (value.length > 254) {
      setEmailError('Email address is too long');
    } else {
      setEmailError('');
    }
  };

  const isValid = !emailError && email.length > 0;

  return { email, emailError, validateEmail, isValid };
}