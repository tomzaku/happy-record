import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { useNavigate } from 'react-router-dom';
import CoreChecklistForm, { FormState } from './CoreChecklistForm';
import { createTask } from './createTaskUtil';
import { BackHeader } from '@dreamer/header';
import React from 'react';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import { motion } from 'framer-motion';
import styles from './index.module.scss';

const CreateCheclistForm = () => {
  const { addChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'create' | 'invitation'>(
    'create',
  );
  const [invitationTemplateId, setInvitationTemplateId] = React.useState('');

  const handleTabChange = (newTab: 'create' | 'invitation') => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
  };

  const onSubmit = (formData: FormState) => {
    createTask(formData, addChecklistTemplate, addChecklist);
    navigate('/');
  };

  const handleInvitationSubmit = () => {
    navigate(`/checklist-template/shared/${invitationTemplateId}`);
  };

  // Animation variants for framer-motion
  const tabVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className={styles.rootContainer}>
      <BackHeader
        renderLeftComponent={() => <>Create Task</>}
        onClickLeftButton={() => navigate('/')}
      />

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
                  weeklyHobbies: [], // Start with no schedule (forever by default)
                  startedAt: new Date().toISOString().split('T')[0],
                  selectedTime: '',
                  selectedIcon: 'material-symbols:checklist',
                  selectedColor: '#607d8b',
                  fieldGroups: [],
                  tags: [],
                } as FormState
              }
            />
          ) : (
            <div className={styles.invitationContainer}>
              <div className={styles.invitationCard}>
                <div className={styles.invitationContent}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="invitation-template-id" className={styles.inputLabel}>
                      Your invitation template id
                    </label>
                    <Input
                      id="invitation-template-id"
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
  );
};
export default CreateCheclistForm;
