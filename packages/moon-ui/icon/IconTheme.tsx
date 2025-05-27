import cx from 'classnames';

import styles from './styles.module.scss';

export default function IconTheme({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className={cx(styles.icon, className)}
      {...props}
    >
      <g id="color_lens_24px">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12 3C7.03003 3 3 7.03 3 12C3 16.97 7.03003 21 12 21C12.83 21 13.5 20.33 13.5 19.5C13.5 19.11 13.35 18.76 13.11 18.49C12.88 18.23 12.73 17.88 12.73 17.5C12.73 16.67 13.4 16 14.23 16H16C18.76 16 21 13.76 21 11C21 6.57999 16.97 3 12 3ZM6.5 12C5.66998 12 5 11.33 5 10.5C5 9.67001 5.66998 9 6.5 9C7.33002 9 8 9.67001 8 10.5C8 11.33 7.33002 12 6.5 12ZM8 6.5C8 7.32999 8.66998 8 9.5 8C10.33 8 11 7.32999 11 6.5C11 5.67001 10.33 5 9.5 5C8.66998 5 8 5.67001 8 6.5ZM14.5 8C13.67 8 13 7.32999 13 6.5C13 5.67001 13.67 5 14.5 5C15.33 5 16 5.67001 16 6.5C16 7.32999 15.33 8 14.5 8ZM16 10.5C16 11.33 16.67 12 17.5 12C18.33 12 19 11.33 19 10.5C19 9.67001 18.33 9 17.5 9C16.67 9 16 9.67001 16 10.5Z"
          fill-opacity="0.54"
        />
      </g>
    </svg>
  );
}
