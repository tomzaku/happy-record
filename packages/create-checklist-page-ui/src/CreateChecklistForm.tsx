import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { useNavigate } from 'react-router-dom';
import CoreChecklistForm, { FormState } from './CoreChecklistForm';
import { calculateRepeat } from './calculateRepeat';
import { getDay } from './getDay';
import { BackHeader } from '@dreamer/header';
import React from 'react';
import Card from '@moon-ui/card';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import styles from './index.module.scss';

const CreateCheclistForm = () => {
  const { addChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'create' | 'invitation'>(
    'create',
  );
  const [invitationTemplateId, setInvitationTemplateId] = React.useState('');
  const [slideDirection, setSlideDirection] = React.useState<
    'left' | 'right' | null
  >(null);

  const handleTabChange = (newTab: 'create' | 'invitation') => {
    if (newTab === activeTab) return;

    // Determine slide direction
    const tabOrder = ['create', 'invitation'];
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(newTab);
    const direction = newIndex > currentIndex ? 'right' : 'left';

    setSlideDirection(direction);
    setActiveTab(newTab);

    // Reset slide direction after animation
    setTimeout(() => {
      setSlideDirection(null);
    }, 300);
  };

  const onSubmit = ({
    startedAt,
    selectedRecords,
    selectedColor,
    selectedIcon,
    checklistText,
    weeklyHobbies,
    fieldGroups,
  }: FormState) => {
    const repeat = calculateRepeat({ weeklyHobbies });
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
    navigate('/');
  };

  const handleInvitationSubmit = () => {
    navigate(`/checklist-template/shared/${invitationTemplateId}`);
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

      {/* Tab Content with Slide Animation */}
      <div className={styles.tabContent}>
        <div
          className={`${styles.tabPanel} ${
            activeTab === 'create'
              ? styles.active
              : slideDirection === 'left'
                ? styles.slideLeft
                : styles.slideRight
          }`}
        >
          <CoreChecklistForm
            onSubmit={onSubmit}
            initialValues={
              {
                selectedRecords: [],
                checklistText: '',
                weeklyHobbies: [getDay()],
                startedAt: new Date().toISOString().split('T')[0],
                selectedIcon: 'material-symbols:checklist',
                selectedColor: '#607d8b',
                fieldGroups: [],
              } as FormState
            }
          />
        </div>

        <div
          className={`${styles.tabPanel} ${
            activeTab === 'invitation'
              ? styles.active
              : slideDirection === 'left'
                ? styles.slideLeft
                : styles.slideRight
          }`}
        >
          <div className={styles.invitationContainer}>
            <div className={styles.invitationCard}>
              <div className={styles.invitationContent}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    Your invitation template id
                  </label>
                  <Input
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
        </div>
      </div>
    </div>
  );
};
export default CreateCheclistForm;
