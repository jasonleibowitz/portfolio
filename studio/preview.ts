import type { DocumentActionComponent, DocumentActionsContext } from 'sanity';

/**
 * Where a document lives on the built site.
 *
 * The studio has to know the site's routing to link at it. Keeping that in one
 * function means a route change is a change here, not in three document
 * actions -- and `/writing` rather than `/blog` is the kind of detail that
 * would otherwise be wrong in only one of them.
 */
function pathFor(doc: any) {
  const slug = doc?.slug?.current;
  if (!slug) return undefined;
  if (doc._type === 'post') return `/writing/${slug}/`;
  if (doc._type === 'list') return `/lists/${slug}/`;
  if (doc._type === 'project') return `/projects/${slug}/`;
  return undefined;
}

const PREVIEW_ORIGIN =
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN ?? 'http://localhost:4321';

/**
 * "Open preview" on every document.
 *
 * Deliberately a link out rather than an embedded iframe pane: the preview is
 * a real build of the real site at a real URL, so it can be opened on a phone,
 * shared, or checked at a narrow width. An iframe would show the same page in
 * a box the size of half the studio, which is the one place layout problems
 * hide.
 */
export const previewAction: DocumentActionComponent = (props) => {
  const doc = props.draft ?? props.published;
  const path = pathFor(doc);

  return {
    label: 'Open preview',
    disabled: !path,
    title: path
      ? `${PREVIEW_ORIGIN}${path}`
      : 'Give the document a slug first',
    onHandle: () => {
      if (path) window.open(`${PREVIEW_ORIGIN}${path}`, '_blank', 'noopener');
      props.onComplete?.();
    },
  };
};

/** Adds the action to every document type without listing them one by one. */
export const documentActions = (
  prev: DocumentActionComponent[],
  _context: DocumentActionsContext
) => [...prev, previewAction];
