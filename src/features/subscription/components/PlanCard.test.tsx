import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanCard } from './PlanCard';
import { PLAN_CONFIGS } from '../types';

describe('PlanCard', () => {
  it('should render plan information correctly', () => {
    const plan = PLAN_CONFIGS.pro;
    const { container } = render(<PlanCard plan={plan} />);

    expect(container).toHaveTextContent('Pro');
    expect(container).toHaveTextContent('100€');
    expect(container).toHaveTextContent('/mois');
    expect(container).toHaveTextContent('50 vidéos');
    expect(container).toHaveTextContent('par mois');

    plan.features.forEach((feature) => {
      expect(container).toHaveTextContent(feature);
    });
  });

  it('should display "Gratuit" for free plan', () => {
    const plan = PLAN_CONFIGS.free;
    const { container } = render(<PlanCard plan={plan} />);

    expect(container).toHaveTextContent('Gratuit');
    expect(container.textContent).not.toMatch(/\/mois/);
  });

  it('should display "Vidéos illimitées" for unlimited plan', () => {
    const plan = PLAN_CONFIGS.business;
    const { container } = render(<PlanCard plan={plan} />);

    expect(container).toHaveTextContent('Vidéos illimitées');
  });

  it('should display "Populaire" badge for popular plan', () => {
    const plan = PLAN_CONFIGS.pro;
    const { container } = render(<PlanCard plan={plan} />);

    expect(container).toHaveTextContent('Populaire');
  });

  it('should display "Votre plan" badge when isCurrentPlan is true', () => {
    const plan = PLAN_CONFIGS.pro;
    const { container } = render(<PlanCard plan={plan} isCurrentPlan={true} />);

    expect(container).toHaveTextContent('Votre plan');
  });

  it('should call onSubscribe when subscribe button is clicked', async () => {
    const user = userEvent.setup();
    const onSubscribe = vi.fn();
    const plan = PLAN_CONFIGS.pro;
    const { container } = render(<PlanCard plan={plan} onSubscribe={onSubscribe} />);

    const button = container.querySelector('button:not([disabled])') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button).toHaveTextContent("S'abonner");
    
    await user.click(button);

    expect(onSubscribe).toHaveBeenCalledTimes(1);
  });

  it('should disable button and show "Chargement..." when loading', () => {
    const plan = PLAN_CONFIGS.pro;
    const { container } = render(<PlanCard plan={plan} onSubscribe={vi.fn()} loading={true} />);

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button).toHaveTextContent('Chargement...');
    expect(button).toBeDisabled();
  });

  it('should show "Plan actuel" button when isCurrentPlan is true', () => {
    const plan = PLAN_CONFIGS.pro;
    const { container } = render(<PlanCard plan={plan} isCurrentPlan={true} />);

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button).toHaveTextContent('Plan actuel');
    expect(button).toBeDisabled();
  });

  it('should show "Plan gratuit" button for free plan', () => {
    const plan = PLAN_CONFIGS.free;
    const { container } = render(<PlanCard plan={plan} />);

    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button).toHaveTextContent('Plan gratuit');
    expect(button).toBeDisabled();
  });

  it('should apply special styling for popular plan', () => {
    const plan = PLAN_CONFIGS.pro;
    const { container } = render(<PlanCard plan={plan} />);

    const card = container.querySelector('.border-primary.shadow-lg');
    expect(card).toBeInTheDocument();
  });
});
