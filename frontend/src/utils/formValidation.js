/**
 * Form validation utilities
 */

export const validateEmail = (email, required = true) => {
  if (!email) {
    return required ? 'Email là bắt buộc' : null;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email không hợp lệ';
  }
  if (email.length > 255) {
    return 'Email không được vượt quá 255 ký tự';
  }
  return null;
};

export const validatePassword = (password, required = true) => {
  if (!password) {
    return required ? 'Mật khẩu là bắt buộc' : null;
  }
  if (password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự';
  }
  if (password.length > 128) {
    return 'Mật khẩu không được vượt quá 128 ký tự';
  }
  return null;
};

export const validateConfirmPassword = (password, confirmPassword, required = true) => {
  if (!confirmPassword) {
    return required ? 'Vui lòng xác nhận mật khẩu' : null;
  }
  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận không khớp';
  }
  return null;
};

export const validateName = (name, required = true, minLength = 2, maxLength = 255) => {
  if (!name) {
    return required ? 'Họ và tên là bắt buộc' : null;
  }
  const trimmed = name.trim();
  if (trimmed.length < minLength) {
    return `Họ và tên phải có ít nhất ${minLength} ký tự`;
  }
  if (trimmed.length > maxLength) {
    return `Họ và tên không được vượt quá ${maxLength} ký tự`;
  }
  return null;
};

export const validateMessage = (message, required = true, minLength = 10, maxLength = 5000) => {
  if (!message) {
    return required ? 'Nội dung tin nhắn là bắt buộc' : null;
  }
  const trimmed = message.trim();
  if (trimmed.length < minLength) {
    return `Nội dung tin nhắn phải có ít nhất ${minLength} ký tự`;
  }
  if (trimmed.length > maxLength) {
    return `Nội dung tin nhắn không được vượt quá ${maxLength} ký tự`;
  }
  return null;
};

export const validatePhone = (phone, required = false) => {
  if (!phone) {
    return required ? 'Số điện thoại là bắt buộc' : null;
  }
  // Vietnamese phone number format: 10-11 digits, may start with 0 or +84
  const phoneRegex = /^(\+84|0)[1-9][0-9]{8,9}$/;
  const cleaned = phone.replace(/\s+/g, '');
  if (!phoneRegex.test(cleaned)) {
    return 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10-11 chữ số)';
  }
  if (cleaned.length > 20) {
    return 'Số điện thoại không được vượt quá 20 ký tự';
  }
  return null;
};

export const validateText = (text, fieldName = 'Trường này', required = true, minLength = 1, maxLength = 255) => {
  if (!text) {
    return required ? `${fieldName} là bắt buộc` : null;
  }
  const trimmed = text.trim();
  if (trimmed.length < minLength) {
    return `${fieldName} phải có ít nhất ${minLength} ký tự`;
  }
  if (trimmed.length > maxLength) {
    return `${fieldName} không được vượt quá ${maxLength} ký tự`;
  }
  return null;
};

export const validateTitle = (title, required = true, maxLength = 255) => {
  return validateText(title, 'Tiêu đề', required, 1, maxLength);
};

export const validateDescription = (description, required = false, maxLength = 5000) => {
  if (!description) {
    return required ? 'Mô tả là bắt buộc' : null;
  }
  const trimmed = description.trim();
  if (trimmed.length > maxLength) {
    return `Mô tả không được vượt quá ${maxLength} ký tự`;
  }
  return null;
};

export const validateDate = (date, required = true, minDate = null, maxDate = null) => {
  if (!date) {
    return required ? 'Ngày là bắt buộc' : null;
  }
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Ngày không hợp lệ';
  }
  if (minDate) {
    const min = new Date(minDate);
    if (dateObj < min) {
      return `Ngày phải từ ${min.toLocaleDateString('vi-VN')} trở đi`;
    }
  }
  if (maxDate) {
    const max = new Date(maxDate);
    if (dateObj > max) {
      return `Ngày phải trước ${max.toLocaleDateString('vi-VN')}`;
    }
  }
  return null;
};

export const validateTime = (time, required = true) => {
  if (!time) {
    return required ? 'Giờ là bắt buộc' : null;
  }
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return 'Giờ không hợp lệ. Vui lòng nhập theo định dạng HH:MM';
  }
  return null;
};

export const validateURL = (url, required = false) => {
  if (!url) {
    return required ? 'URL là bắt buộc' : null;
  }
  try {
    new URL(url);
    return null;
  } catch {
    return 'URL không hợp lệ';
  }
};

export const validateNumber = (number, fieldName = 'Số', required = true, min = null, max = null) => {
  if (number === '' || number === null || number === undefined) {
    return required ? `${fieldName} là bắt buộc` : null;
  }
  const num = Number(number);
  if (isNaN(num)) {
    return `${fieldName} phải là số`;
  }
  if (min !== null && num < min) {
    return `${fieldName} phải lớn hơn hoặc bằng ${min}`;
  }
  if (max !== null && num > max) {
    return `${fieldName} phải nhỏ hơn hoặc bằng ${max}`;
  }
  return null;
};

export const validateProgress = (progress, required = false) => {
  return validateNumber(progress, 'Tiến độ', required, 0, 100);
};

export const validateCategory = (category, required = true) => {
  if (!category) {
    return required ? 'Danh mục là bắt buộc' : null;
  }
  if (category.trim().length < 1) {
    return 'Danh mục không được để trống';
  }
  if (category.trim().length > 100) {
    return 'Danh mục không được vượt quá 100 ký tự';
  }
  return null;
};

export const validateLocation = (location, required = false) => {
  if (!location) {
    return required ? 'Địa chỉ là bắt buộc' : null;
  }
  if (location.trim().length > 500) {
    return 'Địa chỉ không được vượt quá 500 ký tự';
  }
  return null;
};

