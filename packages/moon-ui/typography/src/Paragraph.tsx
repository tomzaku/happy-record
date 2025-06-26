import cx from 'classnames';

import styles from './Paragraph.module.scss';

type Props = {
  children?: React.ReactNode;
  isDescription?: boolean;
  noMargin?: boolean;
  underline?: boolean;
  className?: string;
  bold?: boolean;
  onClick: () => void;
  style: React.CSSProperties;
};

export default function Paragraph({
  children,
  isDescription,
  noMargin,
  underline,
  bold,
  className,
  onClick,
  style,
}: Props) {
  return (
    <p
      className={cx(
        styles.default,
        isDescription && styles.description,
        noMargin && styles.noMargin,
        underline && styles.underline,
        bold && styles.bold,
        className,
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </p>
  );
}
