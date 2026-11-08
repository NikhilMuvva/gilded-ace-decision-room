// World coordinates are the supplied x metres and inverted y metres. No marker jitter.
export function floorBounds(locations) {
  const xs = locations.map((l) => l.x_m),
    ys = locations.map((l) => -l.y_m);
  return {
    x: Math.min(...xs) - 5,
    y: Math.min(...ys) - 5,
    width: Math.max(...xs) - Math.min(...xs) + 10,
    height: Math.max(...ys) - Math.min(...ys) + 10,
  };
}
export function viewBox(bounds, view) {
  const width = bounds.width / view.scale,
    height = bounds.height / view.scale;
  return {
    x: bounds.x + (bounds.width - width) / 2 + view.x,
    y: bounds.y + (bounds.height - height) / 2 + view.y,
    width,
    height,
  };
}
export function constrainView(bounds, view) {
  const scale = Math.max(1, Math.min(14, view.scale)),
    box = viewBox(bounds, { ...view, scale }),
    x = Math.max(
      bounds.x - box.width * 0.12,
      Math.min(bounds.x + bounds.width - box.width * 0.88, box.x),
    ),
    y = Math.max(
      bounds.y - box.height * 0.12,
      Math.min(bounds.y + bounds.height - box.height * 0.88, box.y),
    );
  return {
    scale,
    x: x - (bounds.x + (bounds.width - box.width) / 2),
    y: y - (bounds.y + (bounds.height - box.height) / 2),
  };
}
export function pixelToWorld(clientX, clientY, rect, box) {
  const unitsPerPixel =
      1 /
      Math.min(
        (rect.width || 800) / box.width,
        (rect.height || 500) / box.height,
      ),
    padX = ((rect.width || 800) - box.width / unitsPerPixel) / 2,
    padY = ((rect.height || 500) - box.height / unitsPerPixel) / 2;
  return {
    x: box.x + (clientX - rect.left - padX) * unitsPerPixel,
    y: box.y + (clientY - rect.top - padY) * unitsPerPixel,
    unitsPerPixel,
  };
}
export function zoomAt(bounds, view, factor, world) {
  const old = viewBox(bounds, view),
    scale = Math.max(1, Math.min(14, view.scale * factor)),
    width = bounds.width / scale,
    height = bounds.height / scale,
    fx = (world.x - old.x) / old.width,
    fy = (world.y - old.y) / old.height;
  return constrainView(bounds, {
    scale,
    x: world.x - fx * width - (bounds.x + (bounds.width - width) / 2),
    y: world.y - fy * height - (bounds.y + (bounds.height - height) / 2),
  });
}
export function focusPoint(bounds, point, scale = 4) {
  const width = bounds.width / scale,
    height = bounds.height / scale;
  return constrainView(bounds, {
    scale,
    x: point.x - width / 2 - (bounds.x + (bounds.width - width) / 2),
    y: point.y - height / 2 - (bounds.y + (bounds.height - height) / 2),
  });
}
export function snapshotMachines(data, rows, scores, dateIndex) {
  const byId = new Map(scores.map((s) => [s.machineIndex, s]));
  return rows
    .filter((r) => r[0] === dateIndex)
    .map((r) => {
      const s = byId.get(r[1]),
        location = data.locations[r[16]];
      return {
        ...s,
        machineIndex: r[1],
        id: data.machines[r[1]].id,
        location: r[16],
        position: location,
        zone: data.zones[r[2]],
        bank: r[3],
        x: location.x_m,
        y: -location.y_m,
      };
    });
}
export function nearestMachines(markers, point, radiusPx = 11) {
  const candidates = markers
    .map((m) => ({
      m,
      distance: Math.hypot(m.x - point.x, m.y - point.y) / point.unitsPerPixel,
    }))
    .filter((o) => o.distance <= radiusPx)
    .sort((a, b) => a.distance - b.distance);
  if (!candidates.length) return [];
  return candidates
    .filter((o) => o.distance - candidates[0].distance < 1)
    .map((o) => o.m);
}
