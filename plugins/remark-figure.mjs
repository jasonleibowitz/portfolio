/**
 * An image alone in a paragraph renders as a `<figure>`. An italic line in the
 * paragraph directly below it becomes that figure's `<figcaption>`.
 *
 *     ![Alt text](./photo.jpg)
 *
 *     _Caption, which may carry an [attribution](https://example.com) link._
 *
 * Post bodies stay plain markdown this way, with no imports and no JSX, so
 * anything that edits them needs to understand markdown and nothing else. The
 * caption is markdown too, which is where the link comes from.
 */

/** An image on its own, with no words beside it in the same paragraph. */
const isFigureImage = (node) =>
  node.type === 'paragraph' &&
  node.children.length === 1 &&
  node.children[0].type === 'image';

/** A whole paragraph in italics, and nothing else. */
const isCaption = (node) =>
  node !== undefined &&
  node.type === 'paragraph' &&
  node.children.length === 1 &&
  node.children[0].type === 'emphasis';

/** Change the element a node renders as, keeping its own children. */
const renderAs = (node, tagName) => {
  node.data = { ...node.data, hName: tagName };
};

/**
 * Walks a node's children, pairing each lone image with the caption under it.
 * Iterates rather than using `unist-util-visit` because the pair is two
 * siblings, and the second one is spliced out as the first is rewritten.
 */
function wrapFigures(parent) {
  for (let i = 0; i < parent.children.length; i++) {
    const node = parent.children[i];

    if (!isFigureImage(node)) {
      if (Array.isArray(node.children)) wrapFigures(node);
      continue;
    }

    const next = parent.children[i + 1];
    if (isCaption(next)) {
      parent.children.splice(i + 1, 1);
      // The emphasis itself is dropped. A `figcaption` already reads as a
      // caption, and the design system styles it; italics on top of that is
      // the markup saying the same thing twice.
      next.children = next.children[0].children;
      renderAs(next, 'figcaption');
      node.children.push(next);
    }

    renderAs(node, 'figure');
  }
}

export default function remarkFigure() {
  return (tree) => wrapFigures(tree);
}
