import {
  songs,
  useAudioPlayer,
} from '@dreamer/music-controller-common/src/hooks';
import Drawer from '@moon-ui/drawer';
import { Icon } from '@iconify/react';
import Typography from '@moon-ui/typography';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import cx from 'classnames';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const AudioSongListDrawer = ({ visible, onClose }: Props) => {
  const { currentSongIndex, next } = useAudioPlayer();
  const intl = useIntl();

  return (
    <Drawer className={styles.container} visible={visible} onBlur={onClose}>
      <div className={styles.header}>
        <Typography.Title noMargin level={2}>
          {intl.formatMessage({
            id: 'audio-song-list-drawer.title',
            defaultMessage: 'Song List',
          })}
        </Typography.Title>

        <Icon
          width={32}
          icon="material-symbols:close-rounded"
          onClick={onClose}
        />
      </div>
      <div className={styles.body}>
        {songs.map(({ name }, index) => (
          <div
            key={index}
            onClick={() => next(index)}
            className={cx(
              styles.card,
              currentSongIndex === index && styles.cardActive,
            )}
          >
            <Typography.Paragraph
              className={cx(currentSongIndex === index && styles.titleActive)}
            >
              {name}
            </Typography.Paragraph>
            {currentSongIndex === index && (
              <Icon
                className={styles.successIcon}
                icon="material-symbols:check-circle-rounded"
              />
            )}
          </div>
        ))}
      </div>
    </Drawer>
  );
};

export default AudioSongListDrawer;
