import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Modal } from '@moon-ui/modal';
import { Icon } from '@moon-ui/icon/Icon';
import CoreChecklistForm, { FormState } from '@pregnant/create-checklist-page-ui/src/CoreChecklistForm';
import { createTask } from '@pregnant/create-checklist-page-ui/src/createTaskUtil';
import AiChecklistGenerate from '@dreamer/detail-task-page/src/components/AiChecklistGenerate';
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
  const [isAiModalVisible, setIsAiModalVisible] = React.useState(false);

  const handleTabChange = (newTab: 'create' | 'invitation') => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
  };

  const onSubmit = (formData: FormState) => {
    createTask(formData, addChecklistTemplate, addChecklist);
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
    <>
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      // A real form lives inside (CoreChecklistForm — title, icon, color, fields, schedule,
      // tags), not a plain confirm/info dialog — see Modal.tsx's own comment on why this
      // shouldn't be dismissible by a stray click on the backdrop.
      closeOnOverlayClick={false}
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
            <button
              className={styles.tabButton}
              onClick={() => setIsAiModalVisible(true)}
            >
              <Icon icon="solar:magic-stick-3-bold-duotone" width={16} style={{ marginRight: 4 }} />
              Generate with AI
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
                    weeklyHobbies: [], // Start with no schedule (forever by default)
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
                      <label htmlFor="invitation-template-id" className={styles.inputLabel}>
                        Your invitation template id
                      </label>
                      <input
                        id="invitation-template-id"
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
    <AiChecklistGenerate
      visible={isAiModalVisible}
      onDismiss={() => setIsAiModalVisible(false)}
      mode="new"
      onApplied={() => {
        setIsAiModalVisible(false);
        onDismiss();
        onTaskCreated?.();
      }}
    />
    </>
  );
};

export default CreateTaskModal;
export { CreateTaskModal };
