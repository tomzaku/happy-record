import { RecordField } from '@dreamer/global/src/store/record-field';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';
import NoteEditor from '../note/NoteEditor';

import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';

type Props = {
  fields: RecordField[];
};
const ChecklistFieldGroupAdd = ({ fields }: Props) => {
  return (
    <>
      {fields.map(field => {
        // const field = fields.find(f => f.id === fieldId)
        switch (field?.type) {
          case 'metric': {
            return (
              <List.ItemMeta
                logo={<Icon width={24} icon={field.icon} />}
                title={field.title}
                rightComponent={
                  <>
                    <Input
                      onChange={e => {
                        // setFieldRecord({
                        //   ...fieldRecord,
                        //   [record.id]: Number(e.target.value),
                        // });
                      }}
                      border="dash"
                      className={styles.input}
                      type="number"
                    />
                    <Typography.Text className={styles.unit}>
                      {field.unit}
                    </Typography.Text>
                  </>
                }
              />
            );
          }
          case 'note': {
            return (
              <>
                <List.ItemMeta
                  logo={<Icon width={24} icon={field.icon} />}
                  title={field.title}
                />
                <NoteEditor
                  withoutBorder
                  // value={checklist.notes}
                  // setValue={checklist.setNotes}
                />
              </>
            );
          }
        }
      })}
      <div className={styles.footerCenter}>
        <Button
          size="lg"
          className={styles.submitBtn}
          onClick={() => {
            // if (currentChecklistTemplate) {
            //   addChecklistRecord({
            //     checklistId: checklistTemplateId,
            //     checklistTemplateId: currentChecklistTemplate.id,
            //     createdAt: currentDay,
            //     records: Object.entries(fieldRecord).map(([key, value]) => ({
            //       fieldId: key,
            //       value: value,
            //     })),
            //   });
            //   onSubmit?.();
            // }
          }}
        >
          Submit
        </Button>
      </div>
    </>
  );
};
export default ChecklistFieldGroupAdd;
