// The owner's target/goal editor — see ChallengeConfigForm.tsx's own "Target / Goal" group,
// pulled out here to keep that already-large file from growing further. A target is a real
// formula (mathjs expression) over owner-picked fields, not a single field's own flat sum — see
// useChallenge.tsx's ChallengeTarget doc comment for why. Validation here is purely for
// immediate feedback; the server (supabase/dto/challenges/challenges-dto.ts's sanitizeTarget)
// re-validates and drops anything invalid, so a formula left broken here just silently doesn't
// save rather than blocking the rest of the config.
import * as React from 'react';
import Typography from '@moon-ui/typography';
import Input from '@moon-ui/input';
import Select from '@moon-ui/select';
import Icon from '@moon-ui/icon/Icon';
import { parse } from 'mathjs';
import { uniqueId, type ChallengeTarget } from '@dreamer/global';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import styles from './ChallengeConfigForm.module.scss';

type Props = {
  targets: ChallengeTarget[];
  numberFields: RecordField[];
  onChange: (targets: ChallengeTarget[]) => void;
};

function slugifyVariableName(title: string, taken: Set<string>): string {
  const base = title.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'value';
  const withLeadingLetter = /^[0-9]/.test(base) ? `_${base}` : base;
  let name = withLeadingLetter;
  let i = 2;
  while (taken.has(name)) {
    name = `${withLeadingLetter}${i}`;
    i += 1;
  }
  return name;
}

/** Mirrors the server's own check (challenges-dto.ts's `sanitizeTarget`) so the owner sees a
 * problem immediately instead of finding out their target silently didn't save. */
function validateFormula(formula: string, variables: Record<string, string>): string | null {
  if (!formula.trim()) return null;
  try {
    const node = parse(formula);
    const used = new Set<string>();
    node.traverse(n => {
      if (n.type === 'SymbolNode') used.add((n as unknown as { name: string }).name);
    });
    for (const name of used) {
      if (!(name in variables)) return `Unknown variable "${name}"`;
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Invalid formula';
  }
}

const emptyTarget = (): ChallengeTarget => ({ id: uniqueId(), title: '', unit: '', icon: '', goal: 0, variables: {}, formula: '' });

const TargetFormulaEditor = ({ targets, numberFields, onChange }: Props) => {
  const fieldOptions = numberFields.map(f => ({ label: f.title, value: f.id }));

  const updateTarget = (id: string, patch: Partial<ChallengeTarget>) =>
    onChange(targets.map(t => (t.id === id ? { ...t, ...patch } : t)));

  // Re-derives `icon` from whichever field the first declared variable now points at — the only
  // metadata a formula can still reasonably borrow from a single field once it spans several.
  const updateVariables = (target: ChallengeTarget, variables: Record<string, string>) => {
    const icon = numberFields.find(f => f.id === Object.values(variables)[0])?.icon ?? '';
    updateTarget(target.id, { variables, icon });
  };

  const addVariable = (target: ChallengeTarget) => {
    const field = numberFields.find(f => !Object.values(target.variables).includes(f.id));
    if (!field) return;
    const name = slugifyVariableName(field.title, new Set(Object.keys(target.variables)));
    updateVariables(target, { ...target.variables, [name]: field.id });
  };

  const renameVariable = (target: ChallengeTarget, oldName: string, raw: string) => {
    let newName = raw.replace(/[^a-zA-Z0-9_]/g, '');
    if (newName && /^[0-9]/.test(newName)) newName = `_${newName}`;
    if (!newName || newName === oldName || newName in target.variables) return;
    const next: Record<string, string> = {};
    for (const [name, fieldId] of Object.entries(target.variables)) next[name === oldName ? newName : name] = fieldId;
    updateVariables(target, next);
  };

  const removeVariable = (target: ChallengeTarget, name: string) => {
    const next = { ...target.variables };
    delete next[name];
    updateVariables(target, next);
  };

  const removeTarget = (id: string) => onChange(targets.filter(t => t.id !== id));
  const addTarget = () => onChange([...targets, emptyTarget()]);

  return (
    <div className={styles.targetFormulaList}>
      {targets.map(target => {
        const error = validateFormula(target.formula, target.variables);
        const availableFields = numberFields.filter(f => !Object.values(target.variables).includes(f.id));
        return (
          <div key={target.id} className={styles.targetFormulaCard}>
            <div className={styles.targetFormulaHeader}>
              <Input
                value={target.title}
                border="dash"
                placeholder="Title, e.g. Push-ups"
                onChange={e => updateTarget(target.id, { title: e.target.value })}
                renderRightInput={() => <></>}
              />
              <Icon
                width={18}
                icon="material-symbols:close-rounded"
                className={styles.removeTargetIcon}
                onClick={() => removeTarget(target.id)}
              />
            </div>

            <div className={styles.targetFormulaFieldsRow}>
              <Input
                value={target.goal || ''}
                type="number"
                border="dash"
                placeholder="Goal"
                onChange={e => updateTarget(target.id, { goal: Number(e.target.value) || 0 })}
                className={styles.targetInput}
                classes={{ input: styles.targetInputField }}
                renderRightInput={() => <></>}
              />
              <Input
                value={target.unit}
                border="dash"
                placeholder="Unit (optional)"
                onChange={e => updateTarget(target.id, { unit: e.target.value })}
                className={styles.targetInput}
                classes={{ input: styles.targetInputField }}
                renderRightInput={() => <></>}
              />
            </div>

            <div className={styles.variableList}>
              {Object.entries(target.variables).map(([name, fieldId]) => (
                <div key={name} className={styles.variableRow}>
                  <Select
                    options={fieldOptions}
                    value={fieldId}
                    onChange={option => updateVariables(target, { ...target.variables, [name]: option.value })}
                    classes={{ container: styles.variableSelect }}
                  />
                  <Input
                    value={name}
                    border="dash"
                    onChange={e => renameVariable(target, name, e.target.value)}
                    className={styles.variableNameInput}
                    classes={{ input: styles.targetInputField }}
                    renderRightInput={() => <></>}
                  />
                  <Icon
                    width={16}
                    icon="material-symbols:close-rounded"
                    className={styles.removeTargetIcon}
                    onClick={() => removeVariable(target, name)}
                  />
                </div>
              ))}
              {!!availableFields.length && (
                <button type="button" className={styles.addTargetButton} onClick={() => addVariable(target)}>
                  <Icon width={14} icon="material-symbols:add-rounded" />
                  Add field
                </button>
              )}
            </div>

            <Input
              value={target.formula}
              border="dash"
              placeholder="e.g. sets * reps"
              onChange={e => updateTarget(target.id, { formula: e.target.value })}
              renderRightInput={() => <></>}
            />
            {!!Object.keys(target.variables).length && (
              <Typography.Text className={styles.formulaLegend}>
                {Object.entries(target.variables)
                  .map(([name, fieldId]) => `${name} = ${numberFields.find(f => f.id === fieldId)?.title ?? '?'}`)
                  .join(' · ')}
              </Typography.Text>
            )}
            {!!error && <Typography.Text className={styles.formulaError}>{error}</Typography.Text>}
          </div>
        );
      })}

      <button type="button" className={styles.addTargetButton} onClick={addTarget}>
        <Icon width={16} icon="material-symbols:add-rounded" />
        Add target
      </button>
    </div>
  );
};

export default TargetFormulaEditor;
