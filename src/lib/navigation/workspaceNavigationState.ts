import type { NavigationGroup, NavigationItem } from '@/components/navigationConfig';
import { isNavigationItemActive } from '@/components/navigationConfig';

function flattenItems(items: NavigationItem[]): NavigationItem[] {
  return items.flatMap(item => [item, ...(item.children ? flattenItems(item.children) : [])]);
}

function hrefSpecificity(href: string) {
  const [pathAndQuery, hash = ''] = href.split('#');
  const [path, query = ''] = pathAndQuery.split('?');

  // Exact hashes and query-backed destinations are more specific than their
  // base page. Path length then makes the deepest matching route win.
  return path.length + query.length * 2 + hash.length * 4;
}

/**
 * Returns one selected navigation item, even when broad prefix matching means
 * several configured hrefs match (for example /profile and
 * /profile/companies). The deepest, most specific destination wins.
 */
export function findSelectedNavigationItemId(
  activeSource: string,
  groups: Pick<NavigationGroup, 'items'>[],
  additionalItems: NavigationItem[] = [],
): string | null {
  const candidates = [
    ...groups.flatMap(group => flattenItems(group.items)),
    ...flattenItems(additionalItems),
  ].filter(item => item.href && isNavigationItemActive(activeSource, item.href));

  candidates.sort((left, right) => {
    const hrefDifference = hrefSpecificity(right.href ?? '') - hrefSpecificity(left.href ?? '');
    return hrefDifference || (right.href?.length ?? 0) - (left.href?.length ?? 0);
  });

  return candidates[0]?.id ?? null;
}

export function navigationItemContainsId(item: NavigationItem, itemId: string | null): boolean {
  if (!itemId) return false;
  return item.id === itemId
    || Boolean(item.children?.some(child => navigationItemContainsId(child, itemId)));
}

export function navigationGroupContainsId(
  group: Pick<NavigationGroup, 'items'>,
  itemId: string | null,
): boolean {
  return Boolean(itemId && group.items.some(item => navigationItemContainsId(item, itemId)));
}

export function getExpandableNavigationItemState(
  item: NavigationItem,
  selectedItemId: string | null,
  manuallyExpanded: boolean,
) {
  const descendantSelected = Boolean(
    selectedItemId
      && item.children?.some(child => navigationItemContainsId(child, selectedItemId)),
  );

  return {
    selected: item.id === selectedItemId,
    descendantSelected,
    expanded: Boolean(item.children?.length) && (descendantSelected || manuallyExpanded),
  };
}
