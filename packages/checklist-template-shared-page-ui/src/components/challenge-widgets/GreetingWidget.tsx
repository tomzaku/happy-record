// One of 3 independent widgets on the invite page — see StartDateWidget's own comment for why
// each has its own layout picker. Renders the resolved headline text (owner's own greetingText,
// or the page's auto-generated "X just challenged Y!" — see
// useChecklistTemplateSharedPage.ts's greetingHeadline) in one of 3 styles.
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import type { GreetingWidgetLayout } from '@dreamer/global';
import styles from './GreetingWidget.module.scss';

type Props = {
  layout: GreetingWidgetLayout;
  text: string;
  /** Only used by the 'heading' layout — desktop/mobile pass their own Typography.Title level
   * (2 / 3) so this matches each device's own scale from before this widget existed. */
  titleLevel?: 1 | 2 | 3 | 4 | 5;
  className?: string;
};

const GreetingWidget = ({ layout, text, titleLevel = 2, className }: Props) => {
  if (layout === 'banner') {
    return <div className={cx(styles.banner, className)}>{text}</div>;
  }

  if (layout === 'minimal') {
    return (
      <Typography.Text className={cx(styles.minimal, className)} style={{ color: 'var(--ct-body-text)' }}>
        {text}
      </Typography.Text>
    );
  }

  // 'heading'
  return (
    <Typography.Title
      level={titleLevel}
      noMargin
      className={className}
      style={{ color: 'var(--ct-heading-color)' }}
    >
      {text}
    </Typography.Title>
  );
};

export default GreetingWidget;
