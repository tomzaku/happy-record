import React from 'react';
import { useLocalStorage } from '@dreamer/global';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import dataset from './dataset.json';
import styles from './index.module.scss';

const StoryPageUi = () => {
  const [story, setStory] = useLocalStorage<any>('story_key', {
    story: {},
    seen: [],
  });
  const seenStory = (identifyKey: string) => {
    if (story.seen.includes(identifyKey)) {
      return;
    } else {
      setStory({
        ...story,
        seen: [...story.seen, identifyKey],
      });
    }
  };
  const [selectedIdentifyKey, setSelectedIdentifyKey] = React.useState('');

  const selectStory = (identifyKey: string) => {
    if (selectedIdentifyKey === identifyKey) {
      setSelectedIdentifyKey('');
    } else {
      setSelectedIdentifyKey(identifyKey);
    }
    seenStory(identifyKey);
  };

  return (
    <div>
      {dataset.map(({ name, detail, identify_key, lesson }) => {
        return (
          <Card
            onClick={() => {
              selectStory(identify_key);
            }}
            key={identify_key}
            className={styles.container}
          >
            <div className={styles.header}>
              <Typography.Title level={3} noMargin>
                {name}
              </Typography.Title>
              <Typography.Text>
                {story.seen?.includes(identify_key) && 'Seen'}
              </Typography.Text>
            </div>
            {selectedIdentifyKey === identify_key && (
              <div>
                <Typography.Title level={4} noMargin>
                  Detail
                </Typography.Title>
                <Typography.Paragraph>{detail}</Typography.Paragraph>
                <Typography.Title level={4} noMargin>
                  Lesson
                </Typography.Title>
                <Typography.Paragraph>{lesson}</Typography.Paragraph>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default StoryPageUi;
