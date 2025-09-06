import React from 'react';
import { Motion, spring } from 'react-motion';

import ChecklistToday from './components/checklist-today';
import WeeklyCalendar from './components/weekly-calendar';
// import MusicAudioPlayer from '@pregnant/music-audio-player';
import styles from './index.module.scss';
import AppHeader from '@dreamer/header';
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
    <div className={styles.container}>
      <AppHeader />

      <div className={styles.body}>
        <div className={styles.tagSelectorContainer}>
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
        <Card className={styles.card}>
          <WeeklyCalendar 
            currentDate={startDate} 
            onDateChange={setStartDate} 
            selectedTag={selectedTag}
          />
        </Card>
        

        <div className={styles.taskListContainer}>
          <Motion
            style={{
              rotateX: spring(flipping ? -180 : 0, {
                stiffness: 200,
                damping: 25,
              }),
              opacity: spring(flipping ? 0.3 : 1, {
                stiffness: 200,
                damping: 25,
              }),
            }}
          >
            {({ rotateX, opacity }) => {
              // Hide component when it's flipped at the top (around 180 degrees)
              const isFlippedAtTop = flipping && rotateX > 150 && rotateX < 210;
              const displayOpacity = isFlippedAtTop ? 0 : opacity;

              return (
                <div
                  style={{
                    transform: `perspective(1000px) rotateX(${rotateX}deg)`,
                    opacity: displayOpacity,
                    transformOrigin: 'top',
                  }}
                >
                  <Card className={cx(styles.cardFooter, styles.flipper)}>
                    <div className={styles.front} key={key}>
                      <ChecklistToday 
                        date={startDate} 
                        selectedTag={selectedTag === 'all' ? undefined : selectedTag}
                      />
                    </div>
                    {/* <CreateChecklist /> */}
                  </Card>
                </div>
              );
            }}
          </Motion>
        </div>
      </div>
      {/* <MusicAudioPlayer className={styles.player} /> */}
    </div>
  );
};

export default TaskListPage;
