import React from 'react';
import { useNavigate } from 'react-router-dom';

import ChecklistTodayDesktop from './components/checklist-today/ChecklistToday.desktop';
import WeeklyCalendarVertical from './components/weekly-calendar/WeeklyCalendarVertical';
import MusicAudioPlayer from '@pregnant/music-audio-player';
import { DesktopDrawer } from '@dreamer/header';
import styles from './index.module.scss';
import Card from '@moon-ui/card';
import cx from 'classnames';
import Select from '@moon-ui/select';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import { useTags } from '@dreamer/global/src/store/tags/useTags';

const TaskListPage = () => {
  const [startDate, setStartDate] = React.useState(new Date());
  const [key, setKey] = React.useState(0);
  const [flipping, setFlipping] = React.useState(false);
  const [selectedTag, setSelectedTag] = React.useState('all');
  const navigate = useNavigate();
  const { getAllTags } = useTags();

  // Update key and trigger flip when date changes
  React.useEffect(() => {
    setFlipping(true);
    const timeout = setTimeout(() => {
      setKey(prev => prev + 1);
      setFlipping(false);
    }, 200);
    return () => clearTimeout(timeout);
  }, [startDate]);

  const allTags = getAllTags();
  const tagOptions = [
    { label: 'All', value: 'all' },
    ...allTags.map(tag => ({ label: tag.name, value: tag.name }))
  ];

  return (
    <div className={styles.desktopContainer}>
      <DesktopDrawer />
      <div className={styles.desktopBody}>
        {/* Center Content - Always Shows Tasks */}
        <div className={styles.centerContent}>
          <div className={styles.taskListContainer}>
            <div className={styles.taskHeader}>
              <Typography.Title level={3} className={styles.taskTitle}>
                Today's Tasks
              </Typography.Title>
              <div className={styles.tagFilter}>
                <Typography.Text className={styles.filterLabel}>Filter by Tag:</Typography.Text>
                <Select
                  classes={{
                    container: styles.selectContainer,
                    input: styles.selectInput,
                    selectElement: styles.selectElement,
                  }}
                  options={tagOptions}
                  onChange={({ value }, { close }) => {
                    setSelectedTag(value);
                    close();
                  }}
                  renderInput={() => (
                    <>
                      <Typography.Text>{selectedTag === 'all' ? 'All Tags' : selectedTag}</Typography.Text>
                      <Icon
                        className={styles.selectIcon}
                        icon="grommet-icons:down"
                        width={10}
                      />
                    </>
                  )}
                  renderOption={option => (
                    <Typography.Text>{option.label}</Typography.Text>
                  )}
                />
              </div>
            </div>
            <div
              style={{
                transform: flipping ? 'perspective(1000px) rotateX(-180deg)' : 'perspective(1000px) rotateX(0deg)',
                opacity: flipping ? 0.3 : 1,
                transformOrigin: 'top',
                transition: 'all 0.2s ease',
              }}
            >
              <Card className={cx(styles.cardFooter, styles.flipper)}>
                <div className={styles.front} key={key}>
                  <ChecklistTodayDesktop 
                    date={startDate} 
                    selectedTag={selectedTag === 'all' ? undefined : selectedTag}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Right Calendar */}
        <div className={styles.rightCalendar}>
          <Card className={styles.calendarCard}>
            <WeeklyCalendarVertical 
              currentDate={startDate} 
              onDateChange={setStartDate} 
              selectedTag={selectedTag}
            />
          </Card>
        </div>
      </div>
      
      <MusicAudioPlayer className={styles.player} />
    </div>
  );
};

export default TaskListPage;
