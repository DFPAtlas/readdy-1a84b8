import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Link, useLocation } from 'react-router-dom';
import { useRsvpNavigationGuard } from '../useRsvpNavigationGuard';
function Fixture({ dirty }: { dirty: boolean }) {
  const { navigate, blocker } = useRsvpNavigationGuard(dirty);
  const location = useLocation();
  return <><span data-testid="path">{location.pathname}</span><button onClick={() => navigate('/dashboard')}>Dashboard</button><Link to="/travel">Travel</Link>{blocker.state === 'blocked' && <><button onClick={blocker.reset}>Keep editing</button><button onClick={blocker.proceed}>Leave page</button></>}</>;
}
describe('RSVP with a declarative router', () => {
  it('renders and navigates without requiring a data router', () => {
    render(<MemoryRouter><Fixture dirty={false}/></MemoryRouter>);
    fireEvent.click(screen.getByText('Dashboard'));
    expect(screen.getByTestId('path')).toHaveTextContent('/dashboard');
  });
  it('guards buttons and internal links and honours both choices', () => {
    render(<MemoryRouter><Fixture dirty/></MemoryRouter>);
    fireEvent.click(screen.getByText('Dashboard'));
    expect(screen.getByTestId('path')).toHaveTextContent('/');
    fireEvent.click(screen.getByText('Keep editing'));
    expect(screen.queryByText('Leave page')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Travel'));
    fireEvent.click(screen.getByText('Leave page'));
    expect(screen.getByTestId('path')).toHaveTextContent('/travel');
  });
});
