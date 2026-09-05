// The challenge owner's config widget on the invite page — desktop gets a right-side slide-in
// panel (same shell as focus-zone-modal-ui's MusicDrawerDesktop), mobile gets the page's own
// @moon-ui/drawer bottom sheet (already used here for the reject-confirmation flow). Both wrap
// the same ChallengeConfigForm content.
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Drawer from '@moon-ui/drawer';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import { getModalRoot } from '@moon-ui/modal/src/modalRoot';
import { Challenge, useIsMobile } from '@dreamer/global';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import type { ChallengeConfigOptions } from '../../useChecklistTemplateSharedPage';
import ChallengeConfigForm from './ChallengeConfigForm';
import styles from './index.module.scss';

type Props = {
  visible: boolean;
  // Discards the draft and closes — Cancel, the header's close icon, and a backdrop click all
  // wire to this same handler (see useChecklistTemplateSharedPage.ts's closeChallengeConfig).
  onDismiss: () => void;
  challenge: Challenge;
  numberFields: RecordField[];
  // Persists via setChallengeOptions/POST /challenges and closes on success — see
  // useChecklistTemplateSharedPage.ts's saveChallengeConfig.
  onSave: (options: ChallengeConfigOptions) => Promise<void>;
  // Every field edit, for the page's own live preview — see saveChallengeConfig's sibling
  // updateChallengeConfigDraft.
  onChange: (options: ChallengeConfigOptions) => void;
};

const ChallengeConfigDrawer = ({ visible, onDismiss, challenge, numberFields, onSave, onChange }: Props) => {
  const isMobile = useIsMobile();
  const [saving, setSaving] = React.useState(false);

  const handleSave = async (options: ChallengeConfigOptions) => {
    setSaving(true);
    try {
      await onSave(options);
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <div className={styles.header}>
      <Typography.Title level={4} noMargin>
        Customize challenge
      </Typography.Title>
      <Icon onClick={onDismiss} width={20} icon="basil:close-outline" className={styles.closeIcon} />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer visible={visible} className={styles.mobileDrawerContainer} onBlur={onDismiss}>
        <div className={styles.mobilePanel}>
          {header}
          <ChallengeConfigForm
            challenge={challenge}
            numberFields={numberFields}
            onSave={handleSave}
            onChange={onChange}
            onCancel={onDismiss}
            saving={saving}
          />
        </div>
      </Drawer>
    );
  }

  // Portaled into getModalRoot() rather than document.body — see MusicDrawerDesktop's own
  // comment: that's the node inside App.tsx's data-theme-carrying `.container`, which is where
  // every --card-background/--text-color/... token this panel reads is actually defined.
  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onDismiss}
          />
          <motion.div
            className={styles.panel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {header}
            <ChallengeConfigForm
              challenge={challenge}
              numberFields={numberFields}
              onSave={handleSave}
              onChange={onChange}
              onCancel={onDismiss}
              saving={saving}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    getModalRoot(),
  );
};

export default ChallengeConfigDrawer;
