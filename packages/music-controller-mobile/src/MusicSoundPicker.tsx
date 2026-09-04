import React from 'react';

// Hooks
import { MessageDescriptor, useIntl } from '@dreamer/translation';

// Components
import IconBird from '@moon-ui/icon/IconBird';
import IconCafe from '@moon-ui/icon/IconCafe';
import IconFire from '@moon-ui/icon/IconFire';
import IconRainy from '@moon-ui/icon/IconRainy';
import IconThunder from '@moon-ui/icon/IconThunder';
import SoundItem from './component/SoundItem';
import IconMoon from '@moon-ui/icon/IconMoon';
import IconWave from '@moon-ui/icon/IconWave';
import IconCoffeeShop from '@moon-ui/icon/IconCoffeeShop';
import { Icon } from '@moon-ui/icon/Icon';

import styles from './index.module.scss';
import {
  setSoundVolume,
  toggleSound,
  TypeSound,
  getActiveSounds,
  getSoundVolumes,
  stopAllSounds,
} from '@dreamer/music-controller-common';
import IconWaterfall from '@moon-ui/icon/IconWaterfall';
import Typography from '@moon-ui/typography';

type SoundInfo = Record<
  TypeSound,
  {
    logo: React.ReactNode;
    logoActive: React.ReactNode;
    message: MessageDescriptor;
    description: string;
    category: 'nature' | 'ambient' | 'lofi';
  }
>;

const soundInfo: SoundInfo = {
  [TypeSound.Rain]: {
    logo: <IconRainy className={styles.iconInactive} />,
    logoActive: <IconRainy className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-rain',
      defaultMessage: 'Rain',
    },
    description: 'Gentle raindrops for peaceful focus',
    category: 'nature',
  },
  [TypeSound.RainAndThunder]: {
    logo: <IconThunder className={styles.iconInactive} />,
    logoActive: <IconThunder className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-thunder',
      defaultMessage: 'Thunder',
    },
    description: 'Dramatic storm sounds for intense concentration',
    category: 'nature',
  },
  [TypeSound.InterviewInACafe]: {
    logo: <IconCafe className={styles.iconInactive} />,
    logoActive: <IconCafe className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-cafe',
      defaultMessage: 'Cafe',
    },
    description: 'Ambient coffee shop atmosphere',
    category: 'ambient',
  },
  [TypeSound.Fireplace]: {
    logo: <IconFire className={styles.iconInactive} />,
    logoActive: <IconFire className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-fire',
      defaultMessage: 'Fire',
    },
    description: 'Crackling fire for cozy focus sessions',
    category: 'ambient',
  },
  [TypeSound.Cricket]: {
    logo: <IconMoon className={styles.iconInactive} />,
    logoActive: <IconMoon className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-sunny',
      defaultMessage: 'Cricket',
    },
    description: 'Night sounds for evening productivity',
    category: 'nature',
  },
  [TypeSound.Bird]: {
    logo: <IconBird className={styles.iconInactive} />,
    logoActive: <IconBird className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-bird',
      defaultMessage: 'Bird',
    },
    description: 'Morning birdsong for fresh starts',
    category: 'nature',
  },
  [TypeSound.Wave]: {
    logo: <IconWave className={styles.iconInactive} />,
    logoActive: <IconWave className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-wave',
      defaultMessage: 'Wave',
    },
    description: 'Ocean waves for deep concentration',
    category: 'nature',
  },
  [TypeSound.BusyCoffee]: {
    logo: <IconCoffeeShop className={styles.iconInactive} />,
    logoActive: <IconCoffeeShop className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-busy-coffee',
      defaultMessage: 'Coffee Lofi',
    },
    description: 'Chill coffee shop beats',
    category: 'lofi',
  },
  [TypeSound.LofiHiphop]: {
    logo: (
      <Icon icon="solar:music-notes-linear" className={styles.iconInactive} />
    ),
    logoActive: (
      <Icon icon="solar:music-notes-linear" className={styles.iconActive} />
    ),
    message: {
      id: 'music-controller-mobile.label-lofi-hiphop',
      defaultMessage: 'Lofi Hip Hop',
    },
    description: 'Smooth hip hop instrumentals',
    category: 'lofi',
  },
  [TypeSound.LofiSideBySide]: {
    logo: (
      <Icon icon="solar:music-notes-linear" className={styles.iconInactive} />
    ),
    logoActive: (
      <Icon icon="solar:music-notes-linear" className={styles.iconActive} />
    ),
    message: {
      id: 'music-controller-mobile.label-lofi-side-by-side',
      defaultMessage: 'Lofi side by side',
    },
    description: 'Relaxing side-by-side melodies',
    category: 'lofi',
  },
  [TypeSound.LofiAfrobeatBurna]: {
    logo: (
      <Icon icon="solar:music-notes-linear" className={styles.iconInactive} />
    ),
    logoActive: (
      <Icon icon="solar:music-notes-linear" className={styles.iconActive} />
    ),
    message: {
      id: 'music-controller-mobile.label-lofi-2',
      defaultMessage: 'Another awesome lofi',
    },
    description: 'Unique afrobeat lofi vibes',
    category: 'lofi',
  },
  [TypeSound.StreamRiver]: {
    logo: <IconWaterfall className={styles.iconInactive} />,
    logoActive: <IconWaterfall className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-stream-river',
      defaultMessage: 'Stream River',
    },
    description: 'Flowing water for natural focus',
    category: 'nature',
  },
};

const categoryLabels = {
  nature: 'Nature Sounds',
  ambient: 'Ambient Sounds',
  lofi: 'Lo-Fi Music',
};

/**
 * The actual sound-category list + volume sliders — split out of this package's own
 * `MusicControllerMobile` (its bottom-sheet `Drawer` + `MobileHeader` wrapper, mobile-only) so a
 * desktop-shaped container (focus-zone-modal-ui's own right-side drawer) can reuse the exact same
 * content instead of duplicating every sound's icon/label/category. `visible` re-syncs local
 * active/volume state against the audio system on each open, the same resync
 * `MusicControllerMobile` always did — sound state can change from outside this panel (the FAB's
 * own controls, another tab), so a stale snapshot from last time it was open would otherwise show.
 */
export default function MusicSoundPicker({ visible }: { visible: boolean }) {
  const intl = useIntl();

  // Initialize state with current audio system state
  const [soundActiveId, setSoundActiveId] = React.useState<
    Record<TypeSound, boolean>
  >(() => getActiveSounds());
  const [volumeSound, setVolumeSound] = React.useState<
    Record<TypeSound, number>
  >(() => getSoundVolumes());

  // Sync state with audio system when component mounts or becomes visible
  React.useEffect(() => {
    if (visible) {
      setSoundActiveId(getActiveSounds());
      setVolumeSound(getSoundVolumes());
    }
  }, [visible]);

  const hasActiveSounds = Object.values(soundActiveId).some(Boolean);

  // Stops every currently-playing sound at once, rather than making someone hunt down and
  // individually toggle off each one they turned on — the same `stopAllSounds` the Focus Zone
  // header's own mute button and useFocusZoneTheme's exclusive preset-switch use, just also
  // updating this component's own local toggle-switch state so it doesn't read stale afterward.
  const handleMuteAll = () => {
    stopAllSounds();
    setSoundActiveId(current => {
      const next = { ...current };
      (Object.keys(next) as TypeSound[]).forEach(typeSound => {
        next[typeSound] = false;
      });
      return next;
    });
  };

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

  return (
    <div className={styles.content}>
      {hasActiveSounds && (
        <button type="button" className={styles.muteAllButton} onClick={handleMuteAll}>
          <Icon icon="material-symbols:volume-off-rounded" width={16} />
          {intl.formatMessage({
            id: 'music-controller-mobile.label-mute-all',
            defaultMessage: 'Mute all',
          })}
        </button>
      )}
      {Object.entries(groupedSounds).map(([category, sounds]) => (
        <div key={category} className={styles.categorySection}>
          <Typography.Title
            noMargin
            level={3}
            className={styles.categoryTitle}
          >
            {categoryLabels[category as keyof typeof categoryLabels]}
          </Typography.Title>
          <div className={styles.soundList}>
            {sounds.map(
              ({ typeSound, logo, logoActive, message, description }) => (
                <SoundItem
                  key={message.id}
                  title={intl.formatMessage(message)}
                  description={description}
                  logo={
                    soundActiveId[typeSound as TypeSound] ? logoActive : logo
                  }
                  active={soundActiveId[typeSound as TypeSound]}
                  volume={volumeSound[typeSound as TypeSound]}
                  onChangeVolume={volume => {
                    setVolumeSound({
                      ...volumeSound,
                      [typeSound]: volume,
                    });
                    setSoundVolume(typeSound as TypeSound, volume);
                  }}
                  onToggle={() => {
                    setSoundActiveId({
                      ...soundActiveId,
                      [typeSound]: !soundActiveId[typeSound as TypeSound],
                    });
                    toggleSound(
                      typeSound as TypeSound,
                      !soundActiveId[typeSound as TypeSound],
                      {
                        loop: true,
                      },
                    );
                  }}
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
