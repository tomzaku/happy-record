import cx from 'classnames';

import styles from './DefaultButton.module.scss';

export type DefaultButtonProps = Omit<
  React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >,
  'type'
> & {
  type?: 'primary' | 'ghost' | 'dash';
  /** The real HTML `type` attribute — separate from the style `type` above.
   * Defaults to `'button'` so a `Button` dropped inside a `<form>` never
   * implicitly submits it; pass `'submit'` explicitly for a button that
   * should. */
  htmlType?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  children?: React.ReactNode;
};

export default function Button({
  onClick,
  disabled,
  children,
  type,
  htmlType = 'button',
  className,
  block,
  size,
  ...props
}: DefaultButtonProps) {
  return (
    <button
      type={htmlType}
      onClick={onClick}
      className={cx(
        styles.default,
        type === 'ghost' && styles.ghost,
        type === 'dash' && styles.dash,
        block && styles.block,
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        size === 'md' && styles.md,
        disabled && styles.disabled,
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
