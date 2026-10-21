import { of } from 'rxjs';
import { PersonComponent } from './person.component';

describe('PersonComponent Oscar filter', () => {
  function setup() {
    const badges = jasmine.createSpyObj('MovieOscarBadgeService', ['hasWon']);
    badges.hasWon.and.callFake((id: number) => of(id === 1));
    const component = new PersonComponent({} as any, badges, {} as any, {} as any, {} as any, {} as any);
    const credit = (id: number, type: 'movie' | 'tv', title: string) => ({
      id, type, title, date: '2020-01-01', poster_path: null, role: '', vote_average: 8
    });
    component.groups = [
      { key: 'actor', label: 'Cast', credits: [credit(1, 'movie', 'Winner'), credit(2, 'movie', 'Other'), credit(1, 'tv', 'Series')] },
      { key: 'Director', label: 'Director', credits: [credit(2, 'movie', 'Other')] }
    ];
    return { component, badges };
  }
  it('shows all credits by default and only winning movies with the filter', () => {
    const { component, badges } = setup();
    expect(component.activeCredits.length).toBe(3);
    component.setOscarFilter('oscar');
    expect(component.activeCredits.map(c => c.title)).toEqual(['Winner']);
    expect(badges.hasWon).toHaveBeenCalledTimes(2);
    expect(component.loadingOscars).toBeFalse();
    component.setOscarFilter('all');
    expect(component.activeCredits.length).toBe(3);
  });
  it('applies the filter when switching tabs and reuses known results', () => {
    const { component, badges } = setup();
    component.setOscarFilter('oscar');
    component.setGroup('Director');
    expect(component.activeCredits).toEqual([]);
    component.setGroup('actor');
    expect(component.activeCredits.length).toBe(1);
    expect(badges.hasWon).toHaveBeenCalledTimes(2);
  });
});
