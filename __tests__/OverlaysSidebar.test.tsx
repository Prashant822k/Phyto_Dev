import { render, screen, fireEvent } from '@testing-library/react';
import OverlaysSidebar from '@/components/OverlaysSidebar';
import '@testing-library/jest-dom';

const folders = [{
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
      { id: 'health_tiles', name: 'Health_Map_tiles', type: 'tile', path: 'tiles/{z}/{x}/{y}.png' },
      { id: 'contours', name: 'Contours.geojson', type: 'geojson', path: 'overlays/Contours.geojson' },
    ]
  }
}];

test('filters and toggles overlays', () => {
  const onToggle = vi.fn();
  render(<OverlaysSidebar folders={folders} active={{}} onToggle={onToggle} />);
  expect(screen.getByText(/Map Overlays/)).toBeInTheDocument();
  const input = screen.getByPlaceholderText(/Filter overlays/);
  fireEvent.change(input, { target: { value: 'health' } });
  expect(screen.getByText('Health_Map_tiles')).toBeInTheDocument();
  const toggle = screen.getAllByRole('switch')[0];
  fireEvent.click(toggle);
  expect(onToggle).toHaveBeenCalled();
});
