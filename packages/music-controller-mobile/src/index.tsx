import { useIntl } from '@dreamer/translation';
import Drawer from '@moon-ui/drawer';
import { MobileHeader } from '@dreamer/header';

import styles from './index.module.scss';
import MusicSoundPicker from './MusicSoundPicker';

// The mobile-shaped shell (bottom-sheet Drawer + MobileHeader's own back button) around the
// actual sound list — see MusicSoundPicker's own doc comment for why that content is a separate
// component now: focus-zone-modal-ui's desktop right-side drawer reuses it directly rather than
// duplicating every sound's icon/label/category into a second copy.
export default function MusicControllerMobile({
  visible,
  onClickBackButton,
}: {
  visible: boolean;
  onClickBackButton?: () => void;
}) {
  const intl = useIntl();

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
      <MusicSoundPicker visible={visible} />
    </Drawer>
  );
}

export { MusicSoundPicker };
