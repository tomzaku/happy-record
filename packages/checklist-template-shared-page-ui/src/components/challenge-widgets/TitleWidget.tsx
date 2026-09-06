// The 5th independent widget on the invite page — TaskSharedCard's own header (avatar icon +
// checklist template title), owner-picked separately from the other 4 (see StartDateWidget's own
// comment for why each widget gets its own layout picker). No text of its own to edit — the
// title always comes from the checklist template itself — just a layout choice.
import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import type { TitleWidgetLayout } from '@dreamer/global';
import styles from './TitleWidget.module.scss';

type Props = {
  layout: TitleWidgetLayout;
  // ChecklistTemplate['avatar'] is a required field, so this is always a real icon name in
  // practice — typed as a plain `string`, not optional, to match Icon's own prop type.
  icon: string;
  title: string;
};

const TitleWidget = ({ layout, icon, title }: Props) => {
  if (layout === 'minimal') {
    return (
      <Typography.Title level={3} noMargin className={styles.minimalTitle} style={{ color: 'var(--ct-heading-color)' }}>
        {title}
      </Typography.Title>
    );
  }

  if (layout === 'stacked') {
    return (
      <div className={styles.stacked}>
        <div className={styles.avatar}>
          <Icon width={24} icon={icon} color="#fff" />
        </div>
        <Typography.Title level={3} noMargin style={{ color: 'var(--ct-heading-color)' }}>
          {title}
        </Typography.Title>
      </div>
    );
  }

  // 'row' — the original layout: icon badge beside the title.
  return (
    <div className={styles.row}>
      <div className={styles.avatar}>
        <Icon width={24} icon={icon} color="#fff" />
      </div>
      <Typography.Title level={3} noMargin style={{ color: 'var(--ct-heading-color)' }}>
        {title}
      </Typography.Title>
    </div>
  );
};

export default TitleWidget;
