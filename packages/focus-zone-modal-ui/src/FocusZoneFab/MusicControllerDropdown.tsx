import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import styles from './index.desktop.module.scss';
import {
  setSoundVolume,
  toggleSound,
  TypeSound,
  getActiveSounds,
  getSoundVolumes,
} from '@dreamer/music-controller-common';

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
    name: string;
    category: 'nature' | 'ambient' | 'lofi';
  }
>;

const soundInfo: SoundInfo = {
  [TypeSound.Rain]: {
    logo: <IconRainy className={styles.iconInactive} />,
    logoActive: <IconRainy className={styles.iconActive} />,
    name: 'Rain',
    category: 'nature',
  },
  [TypeSound.RainAndThunder]: {
    logo: <IconThunder className={styles.iconInactive} />,
    logoActive: <IconThunder className={styles.iconActive} />,
    name: 'Thunder',
    category: 'nature',
  },
  [TypeSound.InterviewInACafe]: {
    logo: <IconCafe className={styles.iconInactive} />,
    logoActive: <IconCafe className={styles.iconActive} />,
    name: 'Cafe',
    category: 'ambient',
  },
  [TypeSound.Fireplace]: {
    logo: <IconFire className={styles.iconInactive} />,
    logoActive: <IconFire className={styles.iconActive} />,
    name: 'Fire',
    category: 'ambient',
  },
  [TypeSound.Cricket]: {
    logo: <IconMoon className={styles.iconInactive} />,
    logoActive: <IconMoon className={styles.iconActive} />,
    name: 'Cricket',
    category: 'nature',
  },
  [TypeSound.Bird]: {
    logo: <IconBird className={styles.iconInactive} />,
    logoActive: <IconBird className={styles.iconActive} />,
    name: 'Bird',
    category: 'nature',
  },
  [TypeSound.Wave]: {
    logo: <IconWave className={styles.iconInactive} />,
    logoActive: <IconWave className={styles.iconActive} />,
    name: 'Wave',
    category: 'nature',
  },
  [TypeSound.BusyCoffee]: {
    logo: <IconCoffeeShop className={styles.iconInactive} />,
    logoActive: <IconCoffeeShop className={styles.iconActive} />,
    name: 'Coffee Lofi',
    category: 'lofi',
  },
  [TypeSound.LofiHiphop]: {
    logo: (
      <Icon icon="solar:music-notes-linear" className={styles.iconInactive} />
    ),
    logoActive: (
      <Icon icon="solar:music-notes-linear" className={styles.iconActive} />
    ),
    name: 'Lofi Hip Hop',
    category: 'lofi',
  },
  [TypeSound.LofiSideBySide]: {
    logo: (
      <Icon icon="solar:music-notes-linear" className={styles.iconInactive} />
    ),
    logoActive: (
      <Icon icon="solar:music-notes-linear" className={styles.iconActive} />
    ),
    name: 'Lofi Side by Side',
    category: 'lofi',
  },
  [TypeSound.LofiAfrobeatBurna]: {
    logo: (
      <Icon icon="solar:music-notes-linear" className={styles.iconInactive} />
    ),
    logoActive: (
      <Icon icon="solar:music-notes-linear" className={styles.iconActive} />
    ),
    name: 'Afrobeat Lofi',
    category: 'lofi',
  },
  [TypeSound.StreamRiver]: {
    logo: <IconWaterfall className={styles.iconInactive} />,
    logoActive: <IconWaterfall className={styles.iconActive} />,
    name: 'Stream River',
    category: 'nature',
  },
};

const categoryLabels = {
  nature: 'Nature',
  ambient: 'Ambient',
  lofi: 'Lo-Fi',
};

const MusicControllerDropdown: React.FC<MusicControllerDropdownProps> = ({
  visible,
  onClose,
  position = { top: 0, right: 0 },
}) => {
  const [soundActiveId, setSoundActiveId] = useState<Record<TypeSound, boolean>>(
    () => getActiveSounds()
  );
  const [volumeSound, setVolumeSound] = useState<Record<TypeSound, number>>(
    () => getSoundVolumes()
  );
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'nature' | 'ambient' | 'lofi'>('all');

  // Sync state with audio system when component becomes visible
  useEffect(() => {
    if (visible) {
      setSoundActiveId(getActiveSounds());
      setVolumeSound(getSoundVolumes());
    }
  }, [visible]);

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
    setSoundActiveId({
      ...soundActiveId,
      [typeSound]: newActiveState,
    });
    toggleSound(typeSound, newActiveState, { loop: true });
  };

  const handleVolumeChange = (typeSound: TypeSound, volume: number) => {
    setVolumeSound({
      ...volumeSound,
      [typeSound]: volume,
    });
    setSoundVolume(typeSound, volume);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.musicDropdown}
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{
          position: 'fixed',
          top: position.top - 300, // Position above the FAB
          right: position.right,
          zIndex: 1000,
        }}
      >
        {/* Header */}
        <div className={styles.musicDropdownHeader}>
          <Typography.Text className={styles.musicDropdownTitle}>
            Music Controls
          </Typography.Text>
          <motion.button
            className={styles.musicDropdownClose}
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Icon icon="material-symbols:close" width={16} height={16} />
          </motion.button>
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
              {category === 'all' ? 'All' : categoryLabels[category]}
            </motion.button>
          ))}
        </div>

        {/* Sound List */}
        <div className={styles.musicDropdownContent}>
          {filteredSounds.map(({ typeSound, logo, logoActive, name }) => {
            const isActive = soundActiveId[typeSound as TypeSound];
            const volume = volumeSound[typeSound as TypeSound];

            return (
              <motion.div
                key={typeSound}
                className={`${styles.musicDropdownItem} ${
                  isActive ? styles.musicDropdownItemActive : ''
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={styles.musicDropdownItemHeader}>
                  <div className={styles.musicDropdownItemIcon}>
                    {isActive ? logoActive : logo}
                  </div>
                  <Typography.Text className={styles.musicDropdownItemName}>
                    {name}
                  </Typography.Text>
                  <motion.button
                    className={`${styles.musicDropdownItemToggle} ${
                      isActive ? styles.musicDropdownItemToggleActive : ''
                    }`}
                    onClick={() => handleSoundToggle(typeSound as TypeSound)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon
                      icon={isActive ? "solar:play-circle-outline" : "solar:pause-circle-outline"}
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
