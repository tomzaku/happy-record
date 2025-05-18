import Card from '@moon-ui/card';
import { Icon } from '@iconify/react';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';

import { useChecklistTemplates } from '@dreamer/global';
import { useIntl } from '@dreamer/translation';
import { useNavigate } from 'react-router-dom';

import cn from 'classnames';
import styles from './index.module.scss';

const ChecklistTemplatePageUi = () => {
  const {
    getRecommendChecklistTemplates,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
  } = useChecklistTemplates();
  const intl = useIntl();
  const navigate = useNavigate();

  const getRepeatText = (repeat?: { dayOfWeek: string }) => {
    const text = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = repeat?.dayOfWeek?.split(',') || [];
    if (days.includes('*')) {
      return [
        {
          enabled: true,
          text: intl.formatMessage({
            id: 'PregnantIntro.repeat.everyday',
            defaultMessage: 'Every day',
          }),
        },
      ];
    }
    return [0, 1, 2, 3, 4, 5, 6].map(i => {
      return {
        day: i,
        enabled: days.includes(i.toString()) || days.includes('*'),
        text: intl.formatMessage({
          id: `PregnantIntro.repeat.${i}`,
          defaultMessage: text[i],
        }),
      };
    });
  };
  return (
    <>
      <Card className={styles.card}>
        <>
          <p className={styles.label}>
            {intl.formatMessage({
              id: 'PregnantIntro.checklists-management',
              defaultMessage: 'Checklist Template Management',
            })}
          </p>
          {getRecommendChecklistTemplates().map(
            ({ id, title, avatar, repeat }) => (
              <div key={id} className={styles.checklistTemplateContainer}>
                <div className={styles.checklistItem}>
                  <Icon
                    color={avatar.color || '#8A8A8A'}
                    width={32}
                    height={32}
                    icon={avatar.name}
                  />
                  <div className={styles.checklistBody}>
                    <Typography.Text className={styles.text}>
                      {title}
                    </Typography.Text>
                  </div>
                  <Icon
                    className={styles.editIcon}
                    width={24}
                    height={24}
                    icon="material-symbols:edit-outline"
                    onClick={() => navigate(`/edit-checklist/${id}`)}
                  />
                  <Checkbox
                    checked={selectedChecklistTemplates.includes(id)}
                    onChange={event => {
                      const checked = event.target.checked;
                      if (checked) {
                        updateSelectedChecklistTemplate([
                          ...selectedChecklistTemplates,
                          id,
                        ]);
                      } else {
                        updateSelectedChecklistTemplate(
                          selectedChecklistTemplates.filter(i => i !== id)
                        );
                      }
                    }}
                    className={styles.checkbox}
                  />
                </div>
                <div className={styles.footer}>
                  {getRepeatText(repeat).map(({ enabled, text }) => (
                    <Typography.Text
                      key={text}
                      className={cn(styles.text, { [styles.enabled]: enabled })}
                    >
                      {text}
                    </Typography.Text>
                  ))}
                </div>
              </div>
            )
          )}
        </>
      </Card>
    </>
  );
};

export default ChecklistTemplatePageUi;
