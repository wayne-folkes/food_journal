import { SKY_PHASES, SKY_PALETTES, type SkyPhase } from '../lib/sky'

export interface Bloom {
  id: string
  color: string
}

interface Props {
  phase: SkyPhase
  blooms: Bloom[]
}

/**
 * The living backdrop: four stacked gradients that cross-fade with the clock,
 * three drifting aurora ribbons, film grain, and meal-colored blooms that
 * radiate from the compose area whenever a meal lands.
 */
export function Sky({ phase, blooms }: Props) {
  return (
    <div className="gl-sky" aria-hidden="true">
      {SKY_PHASES.map((p) => (
        <div
          key={p}
          className={`gl-sky__layer${p === phase ? ' gl-sky__layer--on' : ''}`}
          style={{ background: SKY_PALETTES[p].bg }}
        />
      ))}
      <div className="gl-rib gl-rib--a" />
      <div className="gl-rib gl-rib--b" />
      <div className="gl-rib gl-rib--c" />
      {blooms.map((b) => (
        <div key={b.id} className="gl-bloom" style={{ '--bc': b.color } as React.CSSProperties} />
      ))}
      <div className="gl-grain" />
    </div>
  )
}
