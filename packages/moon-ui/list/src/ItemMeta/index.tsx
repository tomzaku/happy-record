import Typography from '@moon-ui/typography';
import cx from 'classnames';
import styles from './index.module.scss';

type Props = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  logo: React.ReactNode;
  // Was `string` — every real caller just wants "the title area", and a section header
  // reusing this same row (a bigger Typography.Title instead of the default bold paragraph,
  // say) is a legitimate use, not a misuse.
  title: React.ReactNode;
  description?: React.ReactNode;
  rightComponent?: React.ReactNode;
  noPaddingHorizontal?: boolean;
};

export default function ItemMeta({
  className,
  title,
  logo,
  description,
  rightComponent,
  noPaddingHorizontal,
  onClick,
}: Props) {
  return (
    <div
      className={cx(
        styles.container,
        noPaddingHorizontal && styles.noPaddingHorizontal,
        className,
      )}
      onClick={onClick}
    >
      <div className={styles.left}>
        {logo}
        <div className={styles.body}>
          {/* A plain string gets the usual bold-paragraph treatment every existing caller
              expects; a caller that needs its own heading weight (a section header reusing
              this same row, say) passes an already-built node and owns its own markup
              instead — nesting *that* inside this <p> would be invalid HTML the moment it's
              a heading element. */}
          {typeof title === 'string' ? (
            <Typography.Paragraph bold noMargin>
              {title}
            </Typography.Paragraph>
          ) : (
            title
          )}
          {/* Every existing caller passes a description, but a row that genuinely has none
              (a section header reusing this row for its title, say) shouldn't render an
              empty <p> — its line-height would still add a blank second line under the
              title. */}
          {description && (
            <Typography.Paragraph noMargin isDescription>
              {description}
            </Typography.Paragraph>
          )}
        </div>
      </div>
      <div className={styles.right}>{rightComponent}</div>
    </div>
  );
}
