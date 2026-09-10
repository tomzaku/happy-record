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
import Dropdown from '@moon-ui/dropdown';
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

// Carries a variable's own fallback along when it gets renamed (a plain rename, or the re-name a
// field swap does) — same slot in the formula, just under a new name. `undefined` in means "no
// defaults ever set for this target," which stays `undefined` out (nothing to touch).
function renameDefaultsKey(
  defaults: Record<string, number> | undefined,
  oldName: string,
  newName: string,
): Record<string, number> | undefined {
  if (!defaults || !(oldName in defaults)) return defaults;
  const { [oldName]: value, ...rest } = defaults;
  return { ...rest, [newName]: value };
}

const TargetFormulaEditor = ({ targets, numberFields, onChange }: Props) => {
  const fieldOptions = numberFields.map(f => ({ label: f.title, value: f.id }));
  // Which variable rows currently show their fallback-value input — keyed by `${targetId}:${name}`
  // since more than one target/row can have it open at once.
  const [expandedFallback, setExpandedFallback] = React.useState<Set<string>>(new Set());
  const fallbackKey = (targetId: string, name: string) => `${targetId}:${name}`;
  const toggleFallback = (key: string) =>
    setExpandedFallback(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const updateTarget = (id: string, patch: Partial<ChallengeTarget>) =>
    onChange(targets.map(t => (t.id === id ? { ...t, ...patch } : t)));

  // Re-derives `icon` from whichever field the first declared variable now points at — the only
  // metadata a formula can still reasonably borrow from a single field once it spans several.
  // `variableDefaults` left `undefined` means "don't touch" — only rename/remove ever need to
  // actually rewrite it, addVariable/a plain field swap-with-no-rename leave it alone.
  const updateVariables = (
    target: ChallengeTarget,
    variables: Record<string, string>,
    variableDefaults?: Record<string, number>,
  ) => {
    const icon = numberFields.find(f => f.id === Object.values(variables)[0])?.icon ?? '';
    updateTarget(target.id, {
      variables,
      icon,
      ...(variableDefaults !== undefined ? { variableDefaults } : {}),
    });
  };

  const addVariable = (target: ChallengeTarget) => {
    const field = numberFields.find(f => !Object.values(target.variables).includes(f.id));
    if (!field) return;
    const name = slugifyVariableName(field.title, new Set(Object.keys(target.variables)));
    updateVariables(target, { ...target.variables, [name]: field.id });
  };

  // Re-keys the variable to match the newly picked field's own title (same auto-name `addVariable`
  // gives a brand-new row) rather than leaving it pointed at the old field's name — picking a
  // different field is meant to replace it outright, not silently keep calling it by the old name.
  const changeVariableField = (target: ChallengeTarget, oldName: string, fieldId: string) => {
    const field = numberFields.find(f => f.id === fieldId);
    const rest = { ...target.variables };
    delete rest[oldName];
    const name = field ? slugifyVariableName(field.title, new Set(Object.keys(rest))) : oldName;
    updateVariables(target, { ...rest, [name]: fieldId }, renameDefaultsKey(target.variableDefaults, oldName, name));
  };

  const renameVariable = (target: ChallengeTarget, oldName: string, raw: string) => {
    let newName = raw.replace(/[^a-zA-Z0-9_]/g, '');
    if (newName && /^[0-9]/.test(newName)) newName = `_${newName}`;
    if (!newName || newName === oldName || newName in target.variables) return;
    const next: Record<string, string> = {};
    for (const [name, fieldId] of Object.entries(target.variables)) next[name === oldName ? newName : name] = fieldId;
    updateVariables(target, next, renameDefaultsKey(target.variableDefaults, oldName, newName));
  };

  const removeVariable = (target: ChallengeTarget, name: string) => {
    const next = { ...target.variables };
    delete next[name];
    const nextDefaults = target.variableDefaults ? { ...target.variableDefaults } : undefined;
    if (nextDefaults) delete nextDefaults[name];
    updateVariables(target, next, nextDefaults);
  };

  // The fallback used in the target's formula when a participant never recorded this field at all
  // (see challenges-service.ts's getTargets) — blank clears it back to the implicit 0.
  const setVariableDefault = (target: ChallengeTarget, name: string, raw: string) => {
    const value = raw === '' ? undefined : Number(raw);
    const defaults = { ...(target.variableDefaults ?? {}) };
    if (value === undefined || !Number.isFinite(value)) delete defaults[name];
    else defaults[name] = value;
    updateTarget(target.id, { variableDefaults: defaults });
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
              {Object.entries(target.variables).map(([name, fieldId]) => {
                // A field already claimed by a sibling variable in this same target can't be
                // picked again here — a formula referencing the same field twice under two names
                // is never what "add another field" means. This row's own current field stays
                // selectable (it must, to render as selected at all).
                const usedBySiblings = new Set(
                  Object.entries(target.variables)
                    .filter(([otherName]) => otherName !== name)
                    .map(([, otherFieldId]) => otherFieldId),
                );
                const rowOptions = fieldOptions.filter(o => !usedBySiblings.has(o.value));
                const key = fallbackKey(target.id, name);
                const isFallbackOpen = expandedFallback.has(key);
                const fallbackValue = target.variableDefaults?.[name];
                return (
                  <React.Fragment key={name}>
                    <div className={styles.variableRow}>
                      <Select
                        options={rowOptions}
                        value={fieldId}
                        onChange={(option, { close }) => {
                          changeVariableField(target, name, option.value);
                          close();
                        }}
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
                      <Dropdown
                        trigger={<Icon icon="solar:menu-dots-bold" width={16} />}
                        triggerClassName={styles.variableMenuTrigger}
                        triggerAriaLabel={`${name} options`}
                        items={[
                          {
                            label: isFallbackOpen ? 'Hide fallback value' : 'Set fallback value',
                            icon: 'solar:widget-add-linear',
                            onClick: () => toggleFallback(key),
                          },
                          {
                            label: 'Remove',
                            icon: 'material-symbols:close-rounded',
                            danger: true,
                            onClick: () => removeVariable(target, name),
                          },
                        ]}
                      />
                    </div>
                    {isFallbackOpen && (
                      <div className={styles.variableFallbackRow}>
                        <Typography.Text className={styles.variableFallbackLabel}>
                          If not submitted, {name} =
                        </Typography.Text>
                        <Input
                          type="number"
                          value={fallbackValue === undefined ? '' : String(fallbackValue)}
                          border="dash"
                          placeholder="0"
                          onChange={e => setVariableDefault(target, name, e.target.value)}
                          className={styles.variableFallbackInput}
                          classes={{ input: styles.targetInputField }}
                          renderRightInput={() => <></>}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
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
                  .map(([name, fieldId]) => {
                    const label = `${name} = ${numberFields.find(f => f.id === fieldId)?.title ?? '?'}`;
                    const fallback = target.variableDefaults?.[name];
                    return fallback === undefined ? label : `${label} (else ${fallback})`;
                  })
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
