import React, { useState, useRef } from 'react';

import cx from 'classnames';

import styles from './index.module.scss';

type Props = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> & {
  border?: 'dash' | 'solid';
  placeholder?: React.ReactNode;
  classes?: { input: string };
  showClear?: boolean;
  /** Content to display on the right side of the input (e.g., units like "km", "minutes") */
  suffix?: React.ReactNode;
};

const Input = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      border,
      placeholder,
      value,
      onFocus,
      onBlur,
      onChange,
      classes,
      showClear,
      suffix,
      ...restProps
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [inputValue, setInputValue] = useState(value ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    // Allow external ref
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      setInputValue('');
      inputRef.current?.focus();
      // Fire synthetic event for controlled components
      if (onChange) {
        const event = {
          ...new Event('input', { bubbles: true }),
          target: {
            ...inputRef.current,
            value: '',
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    const showPlaceholder = !isFocused && !inputValue;
    const showCloseIcon = showClear && !!inputValue;
    const hasSuffix = !!suffix;

    return (
      <div className={cx(styles.inputWrapper, className)}>
        <input
          ref={inputRef}
          className={cx(
            styles.input,
            {
              [styles.dashBorder]: border === 'dash',
              [styles.solidBorder]: border === 'solid',
              [styles.hasSuffix]: hasSuffix,
            },
            classes?.input,
          )}
          value={inputValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          {...restProps}
        />
        {placeholder && showPlaceholder && (
          <div
            className={styles.placeholder}
            onClick={() => inputRef.current?.focus()}
          >
            {placeholder}
          </div>
        )}
        {suffix && <div className={styles.suffix}>{suffix}</div>}
        {showCloseIcon && (
          <button
            type="button"
            className={styles.clearIcon}
            onClick={handleClear}
            tabIndex={-1}
            aria-label="Clear input"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="#888"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
