import React from 'react';

import cx from 'classnames';

import styles from './index.module.scss';

type Props = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> & {
  border?: 'dash' | 'solid';
};

const Input = React.forwardRef<HTMLInputElement, Props>(
  ({ className, border, ...restProps }, ref) => {
    return (
      <input
        ref={ref}
        className={cx(
          styles.container,
          border === 'dash' && styles.dash,
          border === 'solid' && styles.solid,
          className
        )}
        {...restProps}
      />
    );
  }
);

export default Input;
