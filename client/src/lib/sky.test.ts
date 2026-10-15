import { phaseOf, resolvePhase, skyCssVars, SKY_PALETTES } from './sky'

describe('phaseOf', () => {
  it.each([
    [4, 'night'],
    [5, 'morning'],
    [10, 'morning'],
    [11, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [20, 'evening'],
    [21, 'night'],
    [0, 'night'],
  ])('hour %i → %s', (hour, phase) => {
    expect(phaseOf(hour)).toBe(phase)
  })
})

describe('resolvePhase', () => {
  it('auto follows the clock', () => {
    expect(resolvePhase('auto', 8)).toBe('morning')
    expect(resolvePhase('auto', 19)).toBe('evening')
  })

  it('light keeps a light phase and falls back to afternoon after dark', () => {
    expect(resolvePhase('light', 8)).toBe('morning')
    expect(resolvePhase('light', 13)).toBe('afternoon')
    expect(resolvePhase('light', 19)).toBe('afternoon')
    expect(resolvePhase('light', 23)).toBe('afternoon')
  })

  it('dark keeps a dark phase and falls back to night during the day', () => {
    expect(resolvePhase('dark', 8)).toBe('night')
    expect(resolvePhase('dark', 13)).toBe('night')
    expect(resolvePhase('dark', 19)).toBe('evening')
    expect(resolvePhase('dark', 23)).toBe('night')
  })
})

describe('skyCssVars', () => {
  it('uses white ink-on-button and bright glass2 for light palettes', () => {
    const vars = skyCssVars(SKY_PALETTES.morning)
    expect(vars['--inv']).toBe('#FFFFFF')
    expect(vars['--glass2']).toBe('rgba(255,255,255,.7)')
    expect(vars['--ink']).toBe('#221C33')
  })

  it('uses dark ink-on-button and dim glass2 for dark palettes', () => {
    const vars = skyCssVars(SKY_PALETTES.night)
    expect(vars['--inv']).toBe('#14112A')
    expect(vars['--glass2']).toBe('rgba(255,255,255,.16)')
  })

  it('exposes the aurora opacity as --bo', () => {
    expect(skyCssVars(SKY_PALETTES.evening)['--bo']).toBe('0.45')
  })
})
