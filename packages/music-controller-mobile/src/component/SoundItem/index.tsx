import Typography from '@moon-ui/typography';
import Toggle from '@moon-ui/toggle';
import Slider from '@moon-ui/slider';

import styles from './index.module.scss';

type Props = {
  logo: React.ReactNode;
  title: string;
  description?: string;
  active: boolean;
  onToggle: () => void;
  volume?: number;
  onChangeVolume: (volume: number) => void;
};

export default function SoundItem({
  logo,
  title,
  description,
  active,
  onToggle,
  volume = 1,
  onChangeVolume,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconContainer}>{logo}</div>
          <div className={styles.textContent}>
            <Typography.Paragraph className={styles.title}>
              {title}
            </Typography.Paragraph>
            {description && (
              <Typography.Text className={styles.description}>
                {description}
              </Typography.Text>
            )}
          </div>
        </div>
        <Toggle checked={active} onChange={onToggle} />
      </div>
      {active && (
        <div className={styles.slider}>
          <Slider
            min={0}
            max={100}
            value={volume * 100}
            onChange={volume => {
              if (typeof volume === 'number') {
                onChangeVolume(volume / 100);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
