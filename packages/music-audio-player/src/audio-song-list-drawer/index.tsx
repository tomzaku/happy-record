import {
  songs,
  useAudioPlayer,
} from '@dreamer/music-controller-common/src/hooks';
import Drawer from '@moon-ui/drawer';
import { Icon } from '@iconify/react';
import styles from './index.module.scss';

import cx from 'classnames';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const AudioSongListDrawer = ({ visible, onClose }: Props) => {
  const { currentSongIndex, next } = useAudioPlayer();

  return (
    <Drawer className={styles.container} visible={visible} onBlur={onClose}>
      <div className={styles.header}>
        <h1>Song List</h1>
        <Icon width={32} icon="material-symbols:close-rounded" onClick={onClose} />
      </div>
      <div className={styles.body}>
        {songs.map(({ name }, index) => (
          <div 
            key={index} 
            onClick={() => next(index)} 
            className={cx(styles.card, currentSongIndex === index && styles.cardActive)}
          >
            <span>{name}</span>
            {currentSongIndex === index && (
              <Icon className={styles.successIcon} icon="material-symbols:check-circle-rounded" />
            )}
          </div>
        ))}
      </div>
    </Drawer>
  );
};

export default AudioSongListDrawer;
