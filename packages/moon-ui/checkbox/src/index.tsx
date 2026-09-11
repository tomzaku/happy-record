import cx from 'classnames';
import style from './index.module.scss';

type Props = Omit<
  React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >,
  'size'
> & {
  size?: 'md' | 'lg';
};

export default function Checkbox({ size, className, disabled, style: styleProp, ...restProps }: Props) {
  // A caller can override this checkbox's checked-state color per instance via the native
  // `accentColor` style prop (ChecklistDayRow does this with each checklist template's own
  // color) — read it back out into a CSS variable instead, since there's no native checkbox
  // rendering left for the browser to apply `accent-color` to.
  const { accentColor, ...restStyle } = (styleProp ?? {}) as React.CSSProperties & { accentColor?: string };
  const wrapperStyle = accentColor
    ? ({ ...restStyle, '--checkbox-accent-color': accentColor } as React.CSSProperties)
    : restStyle;

  return (
    <span
      className={cx(style.container, size === 'lg' && style.lg, disabled && style.disabled, className)}
      style={wrapperStyle}
    >
      <input
        type="checkbox"
        className={style.input}
        disabled={disabled}
        {...restProps}
      />
      <span className={style.box}>
        <svg className={style.check} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3.5 8.5L6.5 11.5L12.5 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}
