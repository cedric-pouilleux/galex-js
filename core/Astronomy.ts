// Astronomical scaling. The procedural grid uses dimensionless world units;
// gameplay code needs a physical unit it can reason about. The convention is
// anchored on the cube (one stellar neighbourhood) rather than on the galaxy
// as a whole: one cube spans LIGHT_YEARS_PER_CUBE light-years end-to-end,
// whatever world-unit `cubeSize` the caller picks. The galactic diameter
// therefore scales with the cube count along the disc.

/** Conventional astronomical span of one cube of the galactic grid, in light-years. */
export const LIGHT_YEARS_PER_CUBE = 50;

/**
 * Light-years per world unit, derived from the grid cube size. A cube of size
 * `cubeSize` (world units) always covers `LIGHT_YEARS_PER_CUBE` light-years,
 * regardless of the absolute value the caller chose for the board geometry.
 */
export function lightYearsPerUnit(cubeSize: number): number {
  return LIGHT_YEARS_PER_CUBE / cubeSize;
}

/** Converts a world-unit distance to light-years for the given grid cube size. */
export function worldUnitsToLightYears(cubeSize: number, distance: number): number {
  return distance * lightYearsPerUnit(cubeSize);
}
