import cx from 'classnames';

import styles from './styles.module.scss';

export default function IconBack({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      className={cx(styles.icon, className)}
      {...props}
    >
      <g>
        <path d="M25.0551 14.6733H10.1618L16.6685 8.16661C17.1885 7.64661 17.1885 6.79328 16.6685 6.27328C16.4194 6.02361 16.0812 5.8833 15.7285 5.8833C15.3758 5.8833 15.0376 6.02361 14.7885 6.27328L6.00182 15.0599C5.48182 15.5799 5.48182 16.4199 6.00182 16.9399L14.7885 25.7266C15.3085 26.2466 16.1485 26.2466 16.6685 25.7266C17.1885 25.2066 17.1885 24.3666 16.6685 23.8466L10.1618 17.3399H25.0551C25.7885 17.3399 26.3885 16.7399 26.3885 16.0066C26.3885 15.2733 25.7885 14.6733 25.0551 14.6733Z" />
      </g>
    </svg>
  );
}
