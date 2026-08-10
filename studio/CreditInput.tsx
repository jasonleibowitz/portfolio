import { Autocomplete } from '@sanity/ui';
import { useCallback } from 'react';
import { set, unset, useFormValue, type StringInputProps } from 'sanity';

/**
 * The credit line, offering the areas found when the item was added.
 *
 * One control rather than a dropdown beside a text box. Those were two fields
 * showing the same value, which reads as a bug: pick from the list, or type
 * over it, in the same place.
 *
 * The options come from `creditOptions` on the item, saved by the picker. That
 * is what makes the choice revisitable: Google returns "Manhattan" where
 * OpenStreetMap knows "Flatiron District", and which one belongs under a name
 * is a judgement worth changing your mind about later.
 */
export function CreditInput(props: StringInputProps) {
  const { onChange, path, value = '' } = props;

  // `path` ends at this field, so a sibling step reaches what the picker saved.
  const optionsPath = [...path.slice(0, -1), 'creditOptions'];
  const saved = (useFormValue(optionsPath) as string[] | undefined) ?? [];

  const write = useCallback(
    (next: string) => onChange(next ? set(next) : unset()),
    [onChange]
  );

  // Nothing was saved, so there is nothing to offer: the plain field is the
  // honest control. Apple sources never populate these.
  if (!saved.length) return props.renderDefault(props);

  return (
    <Autocomplete
      id={props.id}
      value={value}
      options={saved.map((option) => ({ value: option }))}
      placeholder="Pick an area, or write one…"
      // Both are wired: `onChange` fires when an option is picked, and
      // `onQueryChange` as it is typed. Without the second, a typed credit
      // would be lost the moment the field lost focus.
      onChange={(next) => write(next ?? '')}
      onQueryChange={(query) => write(query ?? '')}
      openButton
    />
  );
}
