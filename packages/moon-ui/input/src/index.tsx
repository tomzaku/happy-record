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
};

const Input = React.forwardRef<HTMLInputElement, Props>(
  ({ className, border = 'solid', placeholder, value, onFocus, onBlur, onChange, classes, ...restProps }, ref) => {
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

    const showPlaceholder = !isFocused && !inputValue;

    return (
      <div className={cx(styles.inputWrapper, className)}>
        <input
          ref={inputRef}
          className={cx(styles.input, {
            [styles.dashBorder]: border === 'dash',
            [styles.solidBorder]: border === 'solid',
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
          <div className={styles.placeholder} onClick={() => inputRef.current?.focus()}>
            {placeholder}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
