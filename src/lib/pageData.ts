// Data every page with the railway needs, read once at build time from
// data/processed/. The year control, the store configuration and the "Data as
// of" dates are the same on the Congress, Governors and Senate pages.
import { loadMapData, defaultYear } from './mapData';
import { loadHeaderYears, storeConfig, stripColumns } from './dashboardData';
import { loadControlChart } from './chartData';
import { sourceAccessedAt, formatDate } from './data';

export function loadYearControl() {
  const mapData = loadMapData();
  const headerYears = loadHeaderYears(mapData);
  const dashConfig = storeConfig(mapData, headerYears);
  const controlChart = loadControlChart();
  const columns = stripColumns(controlChart, dashConfig);
  return { mapData, headerYears, dashConfig, controlChart, columns, startYear: defaultYear(mapData) };
}

/** The latest access date among sources, as "4 November 2026". */
export const asOf = (...ids: string[]) => {
  const dates = ids.map(sourceAccessedAt).filter((d): d is Date => d !== null);
  if (!dates.length) throw new Error(`No access date in manifest for ${ids.join(', ')}`);
  return formatDate(new Date(Math.max(...dates.map((d) => d.getTime()))));
};

export const CONTROL_AS_OF = () => asOf('house_historian_party_divisions', 'senate_party_division');
