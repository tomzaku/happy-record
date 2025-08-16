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
import Drawer from '@moon-ui/drawer';
import IconMoon from '@moon-ui/icon/IconMoon';
import { MobileHeader } from '@dreamer/header';
import IconWave from '@moon-ui/icon/IconWave';
import IconCoffeeShop from '@moon-ui/icon/IconCoffeeShop';
import { Icon } from '@moon-ui/icon/Icon';

import styles from './index.module.scss';
import {
  setSoundVolume,
  toggleSound,
  TypeSound,
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

export default function MusicControllerMobile({
  visible,
  onClickBackButton,
}: {
  visible: boolean;
  onClickBackButton?: () => void;
}) {
  const intl = useIntl();
  const [soundActiveId, setSoundActiveId] = React.useState<
    Record<TypeSound, boolean>
  >({} as Record<TypeSound, boolean>);
  const [volumeSound, setVolumeSound] = React.useState<
    Record<TypeSound, number>
  >({} as Record<TypeSound, number>);

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
    <Drawer
      className={styles.drawer}
      visible={visible}
      onBlur={onClickBackButton}
    >
      <MobileHeader
        onClickBackButton={onClickBackButton}
        title={intl.formatMessage({
          id: 'music-controller-mobile.label-music-title',
          defaultMessage: 'Music',
        })}
      />
      <div className={styles.content}>
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
    </Drawer>
  );
}
