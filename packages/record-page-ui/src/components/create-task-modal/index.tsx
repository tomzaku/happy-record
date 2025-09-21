import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Modal } from '@moon-ui/modal';
import CoreChecklistForm, { FormState } from '@pregnant/create-checklist-page-ui/src/CoreChecklistForm';
import { calculateRepeat } from '@pregnant/create-checklist-page-ui/src/calculateRepeat';
import { getDay } from '@pregnant/create-checklist-page-ui/src/getDay';
import Button from '@moon-ui/button';
import { motion } from 'framer-motion';
import styles from './index.module.scss';

interface CreateTaskModalProps {
  visible: boolean;
  onDismiss: () => void;
  onTaskCreated?: () => void;
}

const CreateTaskModal = ({
  visible,
  onDismiss,
  onTaskCreated,
}: CreateTaskModalProps): React.ReactElement => {
  const { addChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
  const [activeTab, setActiveTab] = React.useState<'create' | 'invitation'>(
    'create',
  );
  const [invitationTemplateId, setInvitationTemplateId] = React.useState('');

  const handleTabChange = (newTab: 'create' | 'invitation') => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
  };

  const onSubmit = ({
    startedAt,
    selectedTime,
    selectedRecords,
    selectedColor,
    selectedIcon,
    checklistText,
    weeklyHobbies,
    fieldGroups,
    tags,
  }: FormState) => {
    const repeat = calculateRepeat({ weeklyHobbies, selectedTime, startedAt });
    const { id } = addChecklistTemplate({
      title: checklistText,
      repeat,
      avatar: {
        type: 'icon',
        name: selectedIcon,
        color: selectedColor,
      },
      records: selectedRecords,
      fieldGroups,
      tags,
    });
    
    // If not repeat we need to create a checklist onetime.
    if (!repeat) {
      addChecklist({
        title: checklistText,
        checklistTemplateId: id,
        startedAt,
        endedAt: new Date(
          new Date(startedAt).setHours(23, 59, 59, 999),
        ).toISOString(),
      });
    }
    
    onDismiss();
    onTaskCreated?.();
  };

  const handleInvitationSubmit = () => {
    // For now, we'll just close the modal
    // In a full implementation, you might want to handle template invitation
    onDismiss();
  };

  // Animation variants for framer-motion
  const tabVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      content={
        <div className={styles.modalContent}>

        {/* Tab Navigation */}
        <div className={styles.tabContainer}>
          <div className={styles.tabNavigation}>
            <button
              className={`${styles.tabButton} ${activeTab === 'create' ? styles.activeTab : ''}`}
              onClick={() => handleTabChange('create')}
            >
              Create New Task
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'invitation' ? styles.activeTab : ''}`}
              onClick={() => handleTabChange('invitation')}
            >
              Use Template
            </button>
          </div>
        </div>

        {/* Tab Content with Framer Motion Animation */}
        <div className={styles.tabContent}>
          <motion.div
            key={activeTab}
            className={styles.tabPanel}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {activeTab === 'create' ? (
              <CoreChecklistForm
                onSubmit={onSubmit}
                initialValues={
                  {
                    selectedRecords: [],
                    checklistText: '',
                    weeklyHobbies: [getDay()],
                    startedAt: new Date().toISOString().split('T')[0],
                    selectedTime: '',
                    selectedIcon: 'material-symbols:checklist',
                    selectedColor: '#607d8b',
                    fieldGroups: [],
                    tags: [],
                  } as FormState
                }
                classes={{
                  container: styles.modalContainer,
                  footer: styles.modalFooter,
                  footerCenter: styles.modalFooterCenter,
                  submitButton: styles.modalSubmitButton,
                }}
              />
            ) : (
              <div className={styles.invitationContainer}>
                <div className={styles.invitationCard}>
                  <div className={styles.invitationContent}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>
                        Your invitation template id
                      </label>
                      <input
                        type="text"
                        value={invitationTemplateId}
                        onChange={e => setInvitationTemplateId(e.target.value)}
                        placeholder="Enter template ID"
                        className={styles.invitationInput}
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.footer}>
                  <div className={styles.footerCenter}>
                    <Button
                      type="primary"
                      className={styles.submitButton}
                      onClick={handleInvitationSubmit}
                      disabled={!invitationTemplateId.trim()}
                    >
                      SUBMIT
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      }
    />
  );
};

export default CreateTaskModal;
export { CreateTaskModal };
