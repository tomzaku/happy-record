import Card from '@moon-ui/card';
import { Icon } from '@iconify/react';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';

import { useChecklistTemplates } from '@dreamer/global';
import { useIntl } from '@dreamer/translation';

import cn from 'classnames';
import styles from './index.module.scss';

const ChecklistTemplatePageUi = () => {
  const {
    getRecommendChecklistTemplates,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
  } = useChecklistTemplates();
  const intl = useIntl();

  const getRepeatText = (repeat?: { dayOfWeek: string }) => {
    const text = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const days = repeat?.dayOfWeek?.split(',') || [];
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
