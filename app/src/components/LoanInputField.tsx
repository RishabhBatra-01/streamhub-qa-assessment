import { useId, useState, type ChangeEvent } from 'react';
import { formatIndianWords, formatNumber, formatRupees } from '../lib/format';
import { isWithin, type Range } from '../lib/loanTypes';

export type FieldUnit = 'rupees' | 'percent' | 'years';

interface LoanInputFieldProps {
  label: string;
  value: number;
  range: Range;
  unit: FieldUnit;
  /** Called only with valid values. */
  onChange: (value: number) => void;
  onValidityChange: (valid: boolean) => void;
}

function formatForUnit(value: number, unit: FieldUnit): string {
  if (unit === 'rupees') return formatRupees(value);
  if (unit === 'percent') return `${formatNumber(value)}%`;
  return `${value} ${value === 1 ? 'Year' : 'Years'}`;
}

function validate(text: string, label: string, range: Range, unit: FieldUnit): string | null {
  if (text.trim() === '') return `Enter the ${label.toLowerCase()}.`;
  const value = Number(text);
  if (!Number.isFinite(value)) return `${label} must be a number.`;
  if (unit === 'years' && !Number.isInteger(value)) return `${label} must be a whole number of years.`;
  if (unit === 'percent' && !/^\d+(\.\d{1,2})?$/.test(text.trim())) {
    return `${label} can have at most 2 decimal places.`;
  }
  if (!isWithin(value, range)) {
    return `${label} must be between ${formatForUnit(range.min, unit)} and ${formatForUnit(range.max, unit)}.`;
  }
  return null;
}

/**
 * A labelled number box paired with a slider. The box keeps whatever the user
 * typed (even if invalid) so the error can be shown next to it; the slider and
 * the rest of the app only ever see valid values.
 */
export function LoanInputField({
  label,
  value,
  range,
  unit,
  onChange,
  onValidityChange,
}: LoanInputFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);
  const error = draft === null ? null : validate(draft, label, range, unit);
  const messageId = `${id}-message`;

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    const nextError = validate(next, label, range, unit);
    setDraft(next);
    onValidityChange(nextError === null);
    if (nextError === null) onChange(Number(next));
  };

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(null);
    onValidityChange(true);
    onChange(Number(event.target.value));
  };

  const handleBlur = () => {
    // Once the typed value is valid, normalise the box (e.g. "010" -> "10").
    if (draft !== null && error === null) setDraft(null);
  };

  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <div className="field__header">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        <div className="field__box">
          {unit === 'rupees' && <span className="field__affix">₹</span>}
          <input
            id={id}
            className="field__input"
            type="number"
            inputMode="decimal"
            min={range.min}
            max={range.max}
            step="any"
            value={text}
            aria-invalid={error ? true : undefined}
            aria-describedby={messageId}
            onChange={handleTextChange}
            onBlur={handleBlur}
          />
          {unit === 'percent' && <span className="field__affix">%</span>}
          {unit === 'years' && <span className="field__affix">Yr</span>}
        </div>
      </div>

      <input
        className="field__slider"
        type="range"
        aria-label={`${label} slider`}
        aria-valuetext={formatForUnit(value, unit)}
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={handleSliderChange}
      />
      <div className="field__scale" aria-hidden="true">
        <span>{formatForUnit(range.min, unit)}</span>
        <span>{formatForUnit(range.max, unit)}</span>
      </div>

      {error ? (
        <p id={messageId} className="field__error" role="alert">
          {error}
        </p>
      ) : (
        <p id={messageId} className="field__hint">
          {unit === 'rupees'
            ? `${formatRupees(value)} (${formatIndianWords(value)})`
            : formatForUnit(value, unit)}
        </p>
      )}
    </div>
  );
}
