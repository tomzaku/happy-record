import React from 'react';
import MultiSelectButton from '@moon-ui/button/src/MultiSelectButton';
import List from '@moon-ui/list';
import Radio from '@moon-ui/radio';
import Toggle from '@moon-ui/toggle';
import IconCalendar from '@moon-ui/icon/IconCalendar';

// Hooks
import { useIntl } from '@dreamer/translation';
import { a, useSpring, config } from '@react-spring/web';

import styles from './index.module.scss';

// Types
import { Day } from '@dreamer/tasks-page-common';

type Props = {
  className?: string;
  values?: Day[];
  setValues: (values?: Day[]) => void;
};

const BuildWeeklyHobby = ({ className, values, setValues }: Props) => {
  const intl = useIntl();
  const animationStyles = useSpring({
    maxHeight: !values || values.length === 0 ? 0 : 80,
  });
  return (
    <>
      <List.ItemMeta
        className={className}
        logo={<IconCalendar />}
        title={intl.formatMessage({
          defaultMessage: 'Build Hobby',
          id: 'label-build-Hobby',
        })}
        description={intl.formatMessage({
          defaultMessage: 'Select days to achieve a good hobby',
          id: 'msg-eisenhower-matrix-explanation',
        })}
        rightComponent={
          <Toggle
            checked={values ? values.length !== 0 : false}
            onChange={checked => {
              if (checked) {
                setValues([Day.Mon]);
              } else {
                setValues(undefined);
              }
            }}
          />
        }
      />
      <a.div
        className={styles.container}
        style={{
          maxHeight: animationStyles.maxHeight,
        }}
      >
        <MultiSelectButton
          values={values}
          setValues={setValues}
          options={[
            { label: 'Mon', value: Day.Mon },
            { label: 'Tue', value: Day.Tue },
            { label: 'Thu', value: Day.Thu },
            { label: 'Wed', value: Day.Wed },
            { label: 'Fri', value: Day.Fri },
            { label: 'Sat', value: Day.Sat },
            { label: 'Sun', value: Day.Sun },
          ]}
        />
      </a.div>
    </>
  );
};

export default BuildWeeklyHobby;
