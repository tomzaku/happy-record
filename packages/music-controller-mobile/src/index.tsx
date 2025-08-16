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

type SoundInfo = Record<
  TypeSound,
  {
    logo: React.ReactNode;
    logoActive: React.ReactNode;
    message: MessageDescriptor;
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
  },
  [TypeSound.RainAndThunder]: {
    logo: <IconThunder className={styles.iconInactive} />,
    logoActive: <IconThunder className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-thunder',
      defaultMessage: 'Thunder',
    },
  },
  [TypeSound.InterviewInACafe]: {
    logo: <IconCafe className={styles.iconInactive} />,
    logoActive: <IconCafe className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-cafe',
      defaultMessage: 'Cafe',
    },
  },
  [TypeSound.Fireplace]: {
    logo: <IconFire className={styles.iconInactive} />,
    logoActive: <IconFire className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-fire',
      defaultMessage: 'Fire',
    },
  },
  [TypeSound.Cricket]: {
    logo: <IconMoon className={styles.iconInactive} />,
    logoActive: <IconMoon className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-sunny',
      defaultMessage: 'Cricket',
    },
  },
  [TypeSound.Bird]: {
    logo: <IconBird className={styles.iconInactive} />,
    logoActive: <IconBird className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-bird',
      defaultMessage: 'Bird',
    },
  },
  [TypeSound.Wave]: {
    logo: <IconWave className={styles.iconInactive} />,
    logoActive: <IconWave className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-wave',
      defaultMessage: 'Wave',
    },
  },
  [TypeSound.BusyCoffee]: {
    logo: <IconCoffeeShop className={styles.iconInactive} />,
    logoActive: <IconCoffeeShop className={styles.iconActive} />,
    message: {
      id: 'music-controller-mobile.label-busy-coffee',
      defaultMessage: 'Coffee Lofi',
    },
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
  },

  // [TypeSound.StreamRiver]: {
  //   logo: <IconWaterfall className={styles.iconInactive} />,
  //   logoActive: <IconWaterfall className={styles.iconActive} />,
  //   message: {
  //     id: 'music-controller-mobile.label-stream-river',
  //     defaultMessage: 'Stream River',
  //   },
  // },
};

export default function MusicControllerMobile({
  visible,
  onClickBackButton,
}: {
  visible: boolean;
  onClickBackButton?: () => void;
}) {
  const intl = useIntl();
  const [soundActiveIndex, setSoundActiveIndexes] = React.useState<
    Record<string, boolean>
  >({});
  const [volumeSound, setVolumeSound] = React.useState<Record<string, number>>(
    {},
  );

  return (
    <Drawer className={styles.drawer} visible={visible}>
      <MobileHeader
        onClickBackButton={onClickBackButton}
        title={intl.formatMessage({
          id: 'music-controller-mobile.label-music-title',
          defaultMessage: 'Music',
        })}
      />
      <div>
        {Object.entries(soundInfo).map(
          ([typeSound, { logo, logoActive, message }], index) => (
            <SoundItem
              key={message.id}
              title={intl.formatMessage(message)}
              logo={soundActiveIndex[index] ? logoActive : logo}
              active={soundActiveIndex[index]}
              volume={volumeSound[index]}
              onChangeVolume={volume => {
                setVolumeSound({
                  ...volumeSound,
                  [index]: volume,
                });
                setSoundVolume(typeSound as TypeSound, volume);
              }}
              onToggle={() => {
                setSoundActiveIndexes({
                  ...soundActiveIndex,
                  [index]: !soundActiveIndex[index],
                });
                toggleSound(typeSound as TypeSound, !soundActiveIndex[index], {
                  loop: true,
                });
              }}
            />
          ),
        )}
      </div>
    </Drawer>
  );
}
