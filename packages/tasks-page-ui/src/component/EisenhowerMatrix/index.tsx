import IconBorderInner from '@moon-ui/icon/IconBorderInner';
import List from '@moon-ui/list';
import Toggle from '@moon-ui/toggle';
import Radio from '@moon-ui/radio';

// Hooks
import { useIntl } from '@dreamer/translation';
import { a, useSpring } from '@react-spring/web';

// Enums
import { EisenhowerMatrix } from '@dreamer/tasks-page-common';

import styles from './index.module.scss';

type Props = {
  value?: EisenhowerMatrix;
  setValue: (value?: EisenhowerMatrix) => void;
  className?: string;
};

const EisenhowerMatrixComponent = ({ value, setValue, className }: Props) => {
  const intl = useIntl();
  const animationStyles = useSpring({
    maxHeight: value ? 40 : 0,
  });
  return (
    <>
      <List.ItemMeta
        className={className}
        logo={<IconBorderInner />}
        title={intl.formatMessage({
          defaultMessage: 'Eisenhower Matrix',
          id: 'label-eisenhower-matrix',
        })}
        description={intl.formatMessage({
          defaultMessage: 'To organize tasks by urgency and importance',
          id: 'msg-eisenhower-matrix-explanation-description',
        })}
        rightComponent={
          <Toggle
            checked={Boolean(value)}
            onCheckedChange={checked => {
              if (checked) {
                setValue(EisenhowerMatrix.Do);
              } else {
                setValue(undefined);
              }
            }}
          />
        }
      />
      <a.div
        style={{
          maxHeight: animationStyles.maxHeight,
        }}
        className={styles.buttonGroup}
      >
        <Radio
          isButton
          value={value}
          onChangeValue={(value: EisenhowerMatrix) => setValue(value)}
          options={[
            { label: 'Do', value: EisenhowerMatrix.Do },
            { label: 'Schedule', value: EisenhowerMatrix.Schedule },
            { label: 'Delegate', value: EisenhowerMatrix.Delegate },
            { label: 'Eliminate', value: EisenhowerMatrix.Eliminate },
          ]}
          classNameOption={styles.button}
          getClassNameActiveOption={option => {
            switch (option.value as EisenhowerMatrix) {
              case EisenhowerMatrix.Do:
                return styles.do;
              case EisenhowerMatrix.Eliminate:
                return styles.eliminate;
              case EisenhowerMatrix.Delegate:
                return styles.delegate;
              case EisenhowerMatrix.Schedule:
                return styles.schedule;
            }
          }}
        />
      </a.div>
    </>
  );
};

export default EisenhowerMatrixComponent;
