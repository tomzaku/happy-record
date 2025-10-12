import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import styles from './MusicControllerDropdown.module.scss';
import {
  setSoundVolume,
  toggleSound,
  TypeSound,
  getActiveSounds,
  getSoundVolumes,
} from '@dreamer/music-controller-common';
import { useAudioStore } from '@dreamer/global';

// Import sound icons
import IconBird from '@moon-ui/icon/IconBird';
import IconCafe from '@moon-ui/icon/IconCafe';
import IconFire from '@moon-ui/icon/IconFire';
import IconRainy from '@moon-ui/icon/IconRainy';
import IconThunder from '@moon-ui/icon/IconThunder';
import IconMoon from '@moon-ui/icon/IconMoon';
import IconWave from '@moon-ui/icon/IconWave';
import IconCoffeeShop from '@moon-ui/icon/IconCoffeeShop';
import IconWaterfall from '@moon-ui/icon/IconWaterfall';

interface MusicControllerDropdownProps {
  visible: boolean;
  onClose: () => void;
  position?: { top: number; right: number };
}

type SoundInfo = Record<
  TypeSound,
  {
    logo: React.ReactNode;
    logoActive: React.ReactNode;
    nameKey: string;
    category: 'nature' | 'ambient' | 'lofi';
  }
>;

const soundInfo: SoundInfo = {
  [TypeSound.Rain]: {
    logo: <IconRainy className={styles.iconInactive} />,
    logoActive: <IconRainy className={styles.iconActive} />,
    nameKey: 'MusicController.sound-rain',
    category: 'nature',
  },
  [TypeSound.RainAndThunder]: {
    logo: <IconThunder className={styles.iconInactive} />,
    logoActive: <IconThunder className={styles.iconActive} />,
    nameKey: 'MusicController.sound-thunder',
    category: 'nature',
  },
  [TypeSound.InterviewInACafe]: {
    logo: <IconCafe className={styles.iconInactive} />,
    logoActive: <IconCafe className={styles.iconActive} />,
    nameKey: 'MusicController.sound-cafe',
    category: 'ambient',
  },
  [TypeSound.Fireplace]: {
    logo: <IconFire className={styles.iconInactive} />,
    logoActive: <IconFire className={styles.iconActive} />,
    nameKey: 'MusicController.sound-fire',
    category: 'ambient',
  },
  [TypeSound.Cricket]: {
    logo: <IconMoon className={styles.iconInactive} />,
    logoActive: <IconMoon className={styles.iconActive} />,
    nameKey: 'MusicController.sound-cricket',
    category: 'nature',
  },
  [TypeSound.Bird]: {
    logo: <IconBird className={styles.iconInactive} />,
    logoActive: <IconBird className={styles.iconActive} />,
    nameKey: 'MusicController.sound-bird',
    category: 'nature',
  },
  [TypeSound.Wave]: {
    logo: <IconWave className={styles.iconInactive} />,
    logoActive: <IconWave className={styles.iconActive} />,
    nameKey: 'MusicController.sound-wave',
    category: 'nature',
  },
  [TypeSound.BusyCoffee]: {
    logo: <IconCoffeeShop className={styles.iconInactive} />,
    logoActive: <IconCoffeeShop className={styles.iconActive} />,
    nameKey: 'MusicController.sound-coffee-lofi',
    category: 'lofi',
  },
  [TypeSound.LofiHiphop]: {
    logo: (
      <Icon icon="solar:music-notes-linear" className={styles.iconInactive} />
    ),
    logoActive: (
      <Icon icon="solar:music-notes-linear" className={styles.iconActive} />
    ),
    nameKey: 'MusicController.sound-lofi-hiphop',
    category: 'lofi',
  },
  [TypeSound.LofiSideBySide]: {
    logo: (
      <Icon icon="solar:music-notes-linear" className={styles.iconInactive} />
    ),
    logoActive: (
      <Icon icon="solar:music-notes-linear" className={styles.iconActive} />
    ),
    nameKey: 'MusicController.sound-lofi-side-by-side',
    category: 'lofi',
  },
  [TypeSound.LofiAfrobeatBurna]: {
    logo: (
      <Icon icon="solar:music-notes-linear" className={styles.iconInactive} />
    ),
    logoActive: (
      <Icon icon="solar:music-notes-linear" className={styles.iconActive} />
    ),
    nameKey: 'MusicController.sound-lofi-afrobeat',
    category: 'lofi',
  },
  [TypeSound.StreamRiver]: {
    logo: <IconWaterfall className={styles.iconInactive} />,
    logoActive: <IconWaterfall className={styles.iconActive} />,
    nameKey: 'MusicController.sound-stream-river',
    category: 'nature',
  },
};


// Utility function to get random songs from each category
const getRandomSongsFromCategories = (): TypeSound[] => {
  const natureSounds = Object.entries(soundInfo)
    .filter(([, sound]) => sound.category === 'nature')
    .map(([typeSound]) => typeSound as TypeSound);
  
  const ambientSounds = Object.entries(soundInfo)
    .filter(([, sound]) => sound.category === 'ambient')
    .map(([typeSound]) => typeSound as TypeSound);
  
  const lofiSounds = Object.entries(soundInfo)
    .filter(([, sound]) => sound.category === 'lofi')
    .map(([typeSound]) => typeSound as TypeSound);

  const randomSongs: TypeSound[] = [];
  
  // Get 1 random song from each category
  if (natureSounds.length > 0) {
    randomSongs.push(natureSounds[Math.floor(Math.random() * natureSounds.length)]);
  }
  
  if (ambientSounds.length > 0) {
    randomSongs.push(ambientSounds[Math.floor(Math.random() * ambientSounds.length)]);
  }
  
  if (lofiSounds.length > 0) {
    randomSongs.push(lofiSounds[Math.floor(Math.random() * lofiSounds.length)]);
  }
  
  return randomSongs;
};

const MusicControllerDropdown: React.FC<MusicControllerDropdownProps> = ({
  visible,
  onClose,
  position = { top: 0, right: 0 },
}) => {
  const intl = useIntl();
  const {
    soundActiveId,
    volumeSound,
    setSoundActiveId,
    setVolumeSound,
    updateSoundActive,
    updateSoundVolume,
    isAnySoundActive,
    muteAllActiveSounds,
  } = useAudioStore();
  
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'nature' | 'ambient' | 'lofi'>('all');

  // Sync state with audio system when component becomes visible
  useEffect(() => {
    if (visible) {
      setSoundActiveId(getActiveSounds());
      setVolumeSound(getSoundVolumes());
      
      // Auto-play random songs from each category when dropdown becomes visible
      // Only if no music is currently playing
      if (!isAnySoundActive()) {
        const randomSongs = getRandomSongsFromCategories();
        
        // Play the random songs directly
        randomSongs.forEach((typeSound) => {
          toggleSound(typeSound, true, { loop: true });
          updateSoundActive(typeSound, true);
        });
      }
    }
  }, [visible, setSoundActiveId, setVolumeSound, isAnySoundActive, updateSoundActive]);

  // Group sounds by category
  const groupedSounds = Object.entries(soundInfo).reduce(
    (acc, [typeSound, sound]) => {
      if (!acc[sound.category]) {
        acc[sound.category] = [];
      }
      acc[sound.category].push({ typeSound, ...sound });
      return acc;
    },
    {} as Record<
      string,
      Array<{ typeSound: string } & (typeof soundInfo)[TypeSound]>
    >,
  );

  // Filter sounds based on selected category
  const filteredSounds = selectedCategory === 'all' 
    ? Object.values(groupedSounds).flat()
    : groupedSounds[selectedCategory] || [];

  const handleSoundToggle = (typeSound: TypeSound) => {
    const newActiveState = !soundActiveId[typeSound];
    updateSoundActive(typeSound, newActiveState);
    toggleSound(typeSound, newActiveState, { loop: true });
  };

  const handleVolumeChange = (typeSound: TypeSound, volume: number) => {
    updateSoundVolume(typeSound, volume);
    setSoundVolume(typeSound, volume);
  };

  const handleTurnOffAllMusic = () => {
    // Mute all active sounds (handles both audio system and store state)
    muteAllActiveSounds();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.musicDropdown}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: 'fixed',
          bottom: 90,
          right: position.right,
          zIndex: 1000,
        }}
      >
        {/* Header */}
        <div className={styles.musicDropdownHeader}>
          <Typography.Title noMargin level={3} className={styles.musicDropdownTitle}>
            {intl.formatMessage({ id: 'MusicController.title', defaultMessage: 'Music Controls' })}
          </Typography.Title>
          <div className={styles.musicDropdownHeaderButtons}>
            <motion.button
              className={styles.musicDropdownMute}
              onClick={handleTurnOffAllMusic}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={intl.formatMessage({ id: 'MusicController.mute-all', defaultMessage: 'Mute all music' })}
            >
              <Icon className={styles.actionIcon} icon="solar:muted-linear"/>
            </motion.button>
            <motion.button
              className={styles.musicDropdownClose}
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Icon className={styles.actionIcon} icon="material-symbols:close-rounded"/>
            </motion.button>
          </div>
        </div>

        {/* Category Filter */}
        <div className={styles.musicDropdownCategories}>
          {(['all', 'nature', 'ambient', 'lofi'] as const).map((category) => (
            <motion.button
              key={category}
              className={`${styles.musicDropdownCategory} ${
                selectedCategory === category ? styles.musicDropdownCategoryActive : ''
              }`}
              onClick={() => setSelectedCategory(category)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {category === 'all' 
                ? intl.formatMessage({ id: 'MusicController.category-all', defaultMessage: 'All' })
                : intl.formatMessage({ id: `MusicController.category-${category}`, defaultMessage: category })
              }
            </motion.button>
          ))}
        </div>

        {/* Sound List */}
        <div className={styles.musicDropdownContent}>
          {filteredSounds.map(({ typeSound, logo, logoActive, nameKey }) => {
            const isActive = soundActiveId[typeSound as TypeSound];
            const volume = volumeSound[typeSound as TypeSound] ?? 1;
            return (
              <motion.div
                key={typeSound}
                className={`${styles.musicDropdownItem} ${
                  isActive ? styles.musicDropdownItemActive : ''
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSoundToggle(typeSound as TypeSound)}
              >
                <div className={styles.musicDropdownItemHeader}>
                  <div className={styles.musicDropdownItemIcon}>
                    {isActive ? logoActive : logo}
                  </div>
                  <Typography.Text className={styles.musicDropdownItemName}>
                    {intl.formatMessage({ id: nameKey, defaultMessage: nameKey })}
                  </Typography.Text>
                  <motion.button
                    className={`${styles.musicDropdownItemToggle} ${
                      isActive ? styles.musicDropdownItemToggleActive : ''
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon
                      icon={isActive ? "solar:pause-circle-outline" : "solar:play-circle-outline"}
                      width={16}
                      height={16}
                    />
                  </motion.button>
                </div>
                
                {isActive && (
                  <motion.div
                    className={styles.musicDropdownItemVolume}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon
                      icon="material-symbols:volume-up"
                      width={12}
                      height={12}
                      className={styles.musicDropdownVolumeIcon}
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume * 100}
                      onChange={(e) => handleVolumeChange(typeSound as TypeSound, Number(e.target.value) / 100)}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      className={styles.musicDropdownVolumeSlider}
                    />
                    <span className={styles.musicDropdownVolumeText}>
                      {Math.round(volume * 100)}%
                    </span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MusicControllerDropdown;
