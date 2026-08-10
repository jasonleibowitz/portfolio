import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Select,
  Spinner,
  Stack,
  Text,
  TextInput,
} from '@sanity/ui';
import { useCallback, useState } from 'react';
import { insert, useClient, useFormValue, type ArrayOfObjectsInputProps } from 'sanity';

import { SOURCES, type ArtworkResult } from './artwork-sources';
import { uploadFromUrl } from './upload';

/**
 * Adds a "search and add" row above a list's items.
 *
 * This is the thing the whole CMS choice turned on: adding a podcast should be
 * typing its name, not typing a name, finding artwork, downloading it,
 * converting it, and pasting a path. Keystatic could not host this at all, and
 * it is why `scripts/list-artwork.mjs` exists as a separate command today.
 *
 * The default array input is still rendered underneath, so drag-to-reorder,
 * editing an item and moving one between groups all keep working. This only
 * adds a way in.
 */

const randomKey = () => Math.random().toString(36).slice(2, 10);

export function ArtworkInput(props: ArrayOfObjectsInputProps) {
  const { onChange, renderDefault } = props;
  const client = useClient({ apiVersion: '2025-08-15' });

  /*
   * The list says where its items come from. Reading `thumb` instead, as this
   * did at first, conflates how an item looks with where its data lives: a
   * coffee shop is square like a podcast and shares nothing else with one.
   */
  const sourceId = (useFormValue(['source']) as string | undefined) ?? 'manual';
  const source = SOURCES[sourceId] ?? SOURCES.manual;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArtworkResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set once a place is picked and it has several pictures to choose between.
  const [choosing, setChoosing] = useState<
    { result: ArtworkResult; images: string[]; credits: string[] } | null
  >(null);
  const [manualUrl, setManualUrl] = useState('');
  const [credit, setCredit] = useState('');

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    setResults([]);
    try {
      setResults(await source.search(query));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [query, source]);

  /**
   * Uploads the artwork and appends the item.
   *
   * The image becomes a real Sanity asset rather than a link to Apple's CDN:
   * a remote URL would put every list at the mercy of someone else's server,
   * which is the reason the file-backed schema refused remote images too.
   */
  /** Uploads the chosen picture, if any, and appends the item. */
  const commit = useCallback(
    async (result: ArtworkResult, artwork?: string, subtitle?: string) => {
      const name = result.name;
      setAdding(name);
      setError(null);
      try {
        const image = artwork
          ? await uploadFromUrl(client, artwork, name)
          : undefined;

        onChange(
          insert(
            [
              {
                _type: 'listItem',
                _key: randomKey(),
                name,
                href: result.href,
                subtitle: subtitle ?? result.subtitle,
                tags: [],
                ...(image ? { image } : {}),
              },
            ],
            'after',
            [-1]
          )
        );
        setResults([]);
        setChoosing(null);
        setManualUrl('');
        setCredit('');
        setQuery('');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setAdding(null);
      }
    },
    [client, onChange]
  );

  /**
   * A result was picked, so gather what it could become and ask.
   *
   * Always asks, even for a place with one picture and one credit. Skipping
   * the step when there was only one image also skipped the credit, which is
   * how every Manhattan shop silently ended up filed under "Manhattan".
   *
   * Sources with neither extra step, like Apple's, still add in one click:
   * there is nothing to choose between.
   */
  const pick = useCallback(
    async (result: ArtworkResult) => {
      if (!source.listImages && !source.listCredits) {
        return commit(result, result.imageUrl);
      }

      setAdding(result.name);
      setError(null);
      try {
        const [images, credits] = await Promise.all([
          source.listImages?.(result) ?? Promise.resolve([]),
          source.listCredits?.(result) ?? Promise.resolve(result.subtitleOptions ?? []),
        ]);
        setCredit(credits[0] ?? result.subtitle ?? '');
        setChoosing({ result, images, credits });
        setResults([]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setAdding(null);
      }
    },
    [commit, source]
  );

  // A list with no catalogue behind it gets the plain array editor, with no
  // search box promising something it cannot do.
  if (!source.search || source.id === 'manual') return renderDefault(props);

  return (
    <Stack space={3}>
      <Card padding={3} radius={2} tone="primary" border>
        <Stack space={3}>
          <Text size={1} weight="medium">
            Add from {source.label}
          </Text>

          <Flex gap={2}>
            <Box flex={1}>
              <TextInput
                value={query}
                placeholder={source.placeholder}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    search();
                  }
                }}
              />
            </Box>
            <Button
              text={busy ? 'Searching…' : 'Search'}
              disabled={busy}
              onClick={search}
              mode="default"
            />
          </Flex>

          {error && (
            <Text size={1} style={{ color: 'var(--card-fg-color)' }}>
              {error}
            </Text>
          )}

          {choosing && (
            <Stack space={3}>
              <Text size={1}>
                Choose a picture for <strong>{choosing.result.name}</strong>
              </Text>
              <Stack space={2}>
                <Text size={1} muted>
                  Credit
                </Text>
                {/* OpenStreetMap's neighbourhood leads, then Google's areas:
                    Google stops at "Manhattan" where OSM knows "Flatiron
                    District". */}
                <Select
                  value={credit}
                  onChange={(e) => setCredit(e.currentTarget.value)}
                >
                  {choosing.credits.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {!choosing.credits.includes(credit) && credit && (
                    <option value={credit}>{credit}</option>
                  )}
                </Select>
                {/* Neither source always has the right word, so it can be
                    written instead. */}
                <TextInput
                  value={credit}
                  placeholder="Or write one…"
                  onChange={(e) => setCredit(e.currentTarget.value)}
                />
              </Stack>

              {choosing.images.length > 0 && (
              <Grid columns={4} gap={2}>
                {choosing.images.map((url, i) => (
                  <Card
                    key={i}
                    padding={0}
                    radius={2}
                    overflow="hidden"
                    border
                    as="button"
                    onClick={() => commit(choosing.result, url, credit)}
                    disabled={adding !== null}
                    style={{ cursor: 'pointer', aspectRatio: '1', padding: 0 }}
                  >
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </Card>
                ))}
              </Grid>
              )}
              <Flex gap={2}>
                <Box flex={1}>
                  <TextInput
                    value={manualUrl}
                    placeholder="Or paste an image URL…"
                    onChange={(e) => setManualUrl(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualUrl.trim()) {
                        e.preventDefault();
                        commit(choosing.result, manualUrl.trim(), credit);
                      }
                    }}
                  />
                </Box>
                <Button
                  text="Use URL"
                  mode="default"
                  disabled={adding !== null || !manualUrl.trim()}
                  onClick={() => commit(choosing.result, manualUrl.trim(), credit)}
                />
              </Flex>

              <Flex gap={2}>
                <Button
                  text={choosing.images.length ? "Add without a picture" : "Add"}
                  mode="ghost"
                  disabled={adding !== null}
                  onClick={() => commit(choosing.result, undefined, credit)}
                />
                <Button
                  text="Cancel"
                  mode="bleed"
                  disabled={adding !== null}
                  onClick={() => setChoosing(null)}
                />
              </Flex>
            </Stack>
          )}

          {results.length > 0 && (
            <Stack space={2}>
              {results.map((result, i) => (
                <Card
                  key={i}
                  padding={2}
                  radius={2}
                  border
                  as="button"
                  onClick={() => pick(result)}
                  disabled={adding !== null}
                  style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <Flex align="center" gap={3}>
                    {result.imageUrl && (
                      <img
                        src={result.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                        style={{ borderRadius: 4, flexShrink: 0 }}
                      />
                    )}
                    <Stack space={2} flex={1}>
                      <Text size={1} weight="medium">
                        {result.name}
                      </Text>
                      {result.hint && (
                        <Text size={0} muted>
                          {result.hint}
                        </Text>
                      )}
                    </Stack>
                    {adding === result.name && <Spinner muted />}
                  </Flex>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>

      {renderDefault(props)}
    </Stack>
  );
}
