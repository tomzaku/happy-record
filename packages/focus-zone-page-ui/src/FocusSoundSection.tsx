import React from 'react';
import { motion } from 'framer-motion';
import cx from 'classnames';

// UI Components
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Slider from '@moon-ui/slider';

// Hooks and utilities
import { useAudioPlayer } from '@dreamer/music-controller-common/src/hooks';

// Styles
import styles from './index.module.scss';

// Types
interface FocusSound {
  id: string;
  name: string;
  description: string;
  category: 'nature' | 'ambient';
  audioUrl?: string;
}

interface FocusSoundSectionProps {
  activeSound: FocusSound | null;
  soundVolume: number;
  isSoundPlaying: boolean;
  onSoundToggle: (sound: FocusSound) => void;
  onVolumeChange: (value: number | number[]) => void;
}

const FOCUS_SOUNDS: FocusSound[] = [
  {
    id: 'forest-rain',
    name: 'Forest Rain',
    description: 'Gentle rain sounds with forest ambience',
    category: 'nature',
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Waves',
    description: 'Calming ocean waves for deep focus',
    category: 'nature',
  },
  {
    id: 'ambient-flow',
    name: 'Ambient Flow',
    description: 'Ethereal synthesizer soundscapes',
    category: 'ambient',
  },
  {
    id: 'white-noise',
    name: 'White Noise',
    description: 'Clean white noise for concentration',
    category: 'ambient',
  },
];

const FocusSoundSection: React.FC<FocusSoundSectionProps> = ({
  activeSound,
  soundVolume,
  isSoundPlaying,
  onSoundToggle,
  onVolumeChange,
}) => {
  return (
    <motion.div
      className={styles.focusSoundsSection}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.bullet} />
        <Typography.Title level={3} className={styles.title}>
          Focus Sounds
        </Typography.Title>
      </div>

      {/* Active Sound Card */}
      {activeSound && (
        <motion.div
          className={cx(styles.soundCard, styles.active)}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.soundHeader}>
            <div className={styles.soundInfo}>
              <Typography.Title level={4} className={styles.soundTitle}>
                {activeSound.name}
              </Typography.Title>
              <Typography.Text className={styles.soundDescription}>
                {activeSound.description}
              </Typography.Text>
            </div>
            <div className={cx(styles.soundTag, styles[activeSound.category])}>
              {activeSound.category === 'nature' ? 'N' : 'A'}
            </div>
          </div>
          <div className={styles.soundControls}>
            <motion.button
              className={cx(styles.playButton, {
                [styles.playing]: isSoundPlaying,
                [styles.stopped]: !isSoundPlaying,
              })}
              onClick={() => onSoundToggle(activeSound)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon
                icon={
                  isSoundPlaying
                    ? 'material-symbols:pause'
                    : 'material-symbols:play-arrow'
                }
                width={24}
                height={24}
              />
            </motion.button>
            <div className={styles.volumeControl}>
              <Icon
                icon="material-symbols:volume-up"
                width={20}
                height={20}
                className={styles.volumeIcon}
              />
              <Slider
                className={styles.volumeSlider}
                value={soundVolume}
                onChange={onVolumeChange}
                min={0}
                max={100}
                step={1}
              />
              <span className={styles.volumeText}>{soundVolume}%</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sound Options */}
      {FOCUS_SOUNDS.map((sound, index) => (
        <motion.div
          key={sound.id}
          className={styles.soundOption}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
          onClick={() => onSoundToggle(sound)}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className={styles.playIcon}>
            <Icon
              icon={
                activeSound?.id === sound.id && isSoundPlaying
                  ? 'material-symbols:pause'
                  : 'material-symbols:play-arrow'
              }
              width={20}
              height={20}
            />
          </div>
          <div className={styles.soundInfo}>
            <Typography.Text className={styles.soundTitle}>
              {sound.name}
            </Typography.Text>
            <Typography.Text className={styles.soundDescription}>
              {sound.description}
            </Typography.Text>
          </div>
          <div className={cx(styles.soundTag, styles[sound.category])}>
            {sound.category === 'nature' ? 'N' : 'A'}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default FocusSoundSection;
