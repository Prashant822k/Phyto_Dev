import { renderHook, act } from '@testing-library/react';
import { useDatasets } from '@/hooks/useDatasets';

// Mock datasetService to avoid network
vi.mock('@/lib/datasetService', async () => {
  return {
    datasetService: {
      listDatasets: async () => ([{
        project: 'GolfCourse_01',
        date_time: '2025-10-27_07-30',
        urlBase: '/sample-data/datasets/GolfCourse_01/2025-10-27_07-30',
        metadata: {
          project: 'GolfCourse_01',
          date: '2025-10-27',
          time: '07:30',
          flight_id: 'flight_01',
          uploader: 'client_xyz',
          bbox: [72.82,18.93,72.84,18.945] as [number, number, number, number],
          layers: [
            { id: 'a', name: 'A', type: 'tile', path: 'tiles/{z}/{x}/{y}.png' },
            { id: 'b', name: 'B', type: 'tile', path: 'tiles/{z}/{x}/{y}.png' },
            { id: 'c', name: 'C', type: 'geojson', path: 'overlays/c.geojson' },
          ]
        }
      }]),
    }
  };
});

describe('useDatasets swipe activation', () => {
  it('enables swipe only when exactly two raster tile layers are active', async () => {
    const { result } = renderHook(() => useDatasets('GolfCourse_01'));
    // wait a tick for list to populate
    await act(async () => {});

    const folder = result.current.folders[0];
    // Initially false
    expect(result.current.canSwipe).toBe(false);

    // Toggle one tile layer
    await act(async () => { await result.current.toggleLayer(folder, 'a'); });
    expect(result.current.canSwipe).toBe(false);

    // Toggle second tile layer
    await act(async () => { await result.current.toggleLayer(folder, 'b'); });
    expect(result.current.canSwipe).toBe(true);

    // Toggle a geojson (should still be true)
    await act(async () => { await result.current.toggleLayer(folder, 'c'); });
    expect(result.current.canSwipe).toBe(true);

    // Toggle off one tile -> back to false
    await act(async () => { await result.current.toggleLayer(folder, 'a'); });
    expect(result.current.canSwipe).toBe(false);
  });
});
