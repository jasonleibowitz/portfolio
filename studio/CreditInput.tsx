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
      /*
       * Every option, always.
       *
       * Autocomplete filters by what is in the field, so a credit already set
       * to "Flatiron District" matched only itself and the menu looked empty.
       * The list here is four areas for one place, not a searchable catalogue,
       * and the point of it is to see the alternatives.
       */
      filterOption={() => true}
      /*
       * Both are wired, and both ignore null.
       *
       * `onChange` fires when an option is picked and `onQueryChange` as it is
       * typed, so the second is needed or a typed credit is lost on blur. But
       * `onQueryChange` also fires with null when the menu closes, which is
       * what happens immediately after picking an option: writing that through
       * cleared the field a moment after the choice was made, and the value
       * looked like it would not stick.
       */
      onChange={(next) => {
        if (next != null) write(next);
      }}
      onQueryChange={(query) => {
        if (query != null) write(query);
      }}
      openButton
    />
  );
}
