/**
 * Shared table sort utility
 * Usage:
 *   const sort = { key: null, dir: 'asc' };
 *   // In render, use: thSort(sort, 'name', 'Name') for each <th>
 *   // After render, call: attachSort(container, sort, () => renderFn());
 */

export function sortData(data, key, dir) {
  if (!key) return data;
  return [...data].sort((a, b) => {
    let av = a[key] ?? '';
    let bv = b[key] ?? '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

export function thSort(sort, key, label) {
  const active = sort.key === key;
  const arrow = active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕';
  return `<th data-sort="${key}" style="cursor:pointer;user-select:none;white-space:nowrap">${label}<span style="opacity:${active ? 1 : 0.3};font-size:10px;margin-left:2px">${arrow}</span></th>`;
}

export function attachSort(scope, sort, onSort) {
  scope.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sort.key === key) {
        sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        sort.key = key;
        sort.dir = 'asc';
      }
      onSort();
    });
  });
}
