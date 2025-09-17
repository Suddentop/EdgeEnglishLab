import React, { forwardRef, useCallback, useMemo, useEffect, useRef } from 'react';

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

const PhoneNumberInput = React.memo(forwardRef<HTMLInputElement, PhoneNumberInputProps>(({
  value,
  onChange,
  onBlur,
  placeholder = "'-' 없이 입력해주세요",
  disabled = false,
  error,
  touched = false,
  required = false,
  id,
  name,
  className = ''
}, ref) => {
  
  const lastValueRef = useRef<string>('');
  
  // 전화번호 입력 처리 - 숫자만 허용하고 최적화
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const inputValue = e.target.value;
      // 숫자만 추출
      const numericValue = inputValue.replace(/[^0-9]/g, '');
      
      // 최대 11자리로 제한
      if (numericValue.length <= 11) {
        // 이전 값과 같으면 onChange 호출하지 않음
        if (numericValue === lastValueRef.current) {
          return;
        }
        
        // 즉시 업데이트
        lastValueRef.current = numericValue;
        onChange(numericValue);
      }
    } catch (err) {
      console.warn('전화번호 입력 처리 중 오류:', err);
    }
  }, [onChange]);

  // 입력 필드 클래스명 생성
  const inputClassName = useMemo(() => {
    const baseClass = 'phone-number-input';
    const errorClass = touched && error ? 'error' : '';
    const disabledClass = disabled ? 'disabled' : '';
    return [baseClass, errorClass, disabledClass, className].filter(Boolean).join(' ');
  }, [touched, error, disabled, className]);

  // 입력 값 검증 - 무한 루프 방지
  const validatedValue = useMemo(() => {
    if (typeof value !== 'string') return '';
    const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 11);
    return cleanValue;
  }, [value]);



  // 초기 값 설정
  useEffect(() => {
    lastValueRef.current = validatedValue;
  }, []);

  return (
    <div className="phone-input-container">
      <input
        ref={ref}
        id={id}
        name={name}
        type="tel"
        value={validatedValue}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputClassName}
        autoComplete="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={11}
        aria-describedby={error ? `${id}-error` : undefined}
        data-testid="phone-number-input"
      />
      {touched && error && (
        <div id={`${id}-error`} className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}));

PhoneNumberInput.displayName = 'PhoneNumberInput';
export default PhoneNumberInput;
