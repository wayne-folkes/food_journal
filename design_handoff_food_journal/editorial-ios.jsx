// Concept A — Editorial × iOS hybrid
// iOS 26 chrome: large nav, grouped inset cards, calorie ring, liquid-glass compose.
// Editorial voice: Playfair serif headers, italic callouts, drop caps inside meal cards,
// striped tonal food tiles, hairline rules, small-caps section labels.

const EI = {
  bg:      '#F5F0E6',   // warm paper, slightly cooler than pure cream
  card:    '#FFFFFF',
  ink:     '#1C1A16',
  mute:    'rgba(60,50,38,0.62)',
  ter:     'rgba(60,50,38,0.32)',
  sep:     'rgba(28,26,22,0.09)',
  accent:  '#A32F22',    // editorial red — replaces system blue
  ring:    '#C7602F',    // warm ring
  ringBg:  '#E8DFCE',
  cream:   '#F6F1E7',
  serif:   '"Playfair Display", Georgia, "Times New Roman", serif',
  body:    '"EB Garamond", Georgia, serif',
  sans:    '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif',
};

// Tonal striped/dot food tile, same idea as Editorial
function EITile({ hue = 32, sat = 28, l = 72, pattern = 'stripe', size = 34 }) {
  const bg = `hsl(${hue} ${sat}% ${l}%)`;
  const fg = `hsl(${hue} ${sat}% ${l - 14}%)`;
  const patterns = {
    stripe: `repeating-linear-gradient(45deg, ${fg} 0 2px, transparent 2px 7px), ${bg}`,
    dot:    `radial-gradient(${fg} 1.2px, transparent 1.6px) 0 0 / 7px 7px, ${bg}`,
    cross:  `repeating-linear-gradient(0deg, ${fg} 0 1px, transparent 1px 6px), repeating-linear-gradient(90deg, ${fg} 0 1px, transparent 1px 6px), ${bg}`,
    solid:  bg,
    wave:   `repeating-radial-gradient(circle at 0 50%, ${fg} 0 1px, transparent 1px 5px), ${bg}`,
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, flexShrink: 0,
      background: patterns[pattern] || patterns.stripe,
      border: '0.5px solid rgba(0,0,0,0.12)',
    }}/>
  );
}

function EIMealItem({ tile, name, cal, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px 10px 14px',
      borderBottom: last ? 'none' : `0.5px solid ${EI.sep}`,
    }}>
      <EITile {...tile} size={30}/>
      <span style={{
        flex: 1, fontFamily: EI.body, fontSize: 16,
        fontStyle: 'italic', letterSpacing: 0.1, color: EI.ink,
      }}>{name}</span>
    </div>
  );
}

function EIMealCard({
  type, time, subtitle, headline, headlineItalic,
  dropCap, leadText, leadCal, items, totalCal, accent,
}) {
  return (
    <div style={{
      background: EI.card, borderRadius: 16, margin: '0 16px 20px',
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(28,26,22,0.04), 0 6px 20px rgba(28,26,22,0.04)',
    }}>
      {/* Kicker + time */}
      <div style={{
        padding: '14px 16px 8px',
        display: 'flex', alignItems: 'baseline', gap: 8,
      }}>
        <span style={{
          fontFamily: EI.sans, fontSize: 9.5, letterSpacing: 2.4,
          color: accent, textTransform: 'uppercase', fontWeight: 600,
        }}>— {type}</span>
        <div style={{ flex: 1, borderTop: `0.5px solid ${EI.sep}`, marginTop: 6 }}/>
        <span style={{
          fontFamily: EI.body, fontSize: 13, fontStyle: 'italic', color: EI.mute,
        }}>{time}</span>
      </div>

      {/* Editorial headline */}
      <div style={{ padding: '0 16px 10px' }}>
        <h3 style={{
          fontFamily: EI.serif, fontSize: 22, fontWeight: 500,
          letterSpacing: -0.3, lineHeight: 1.08, margin: 0, color: EI.ink,
        }}>
          {headline}{headlineItalic && (
            <> <span style={{ fontStyle: 'italic' }}>{headlineItalic}</span></>
          )}
        </h3>
        {subtitle && (
          <div style={{
            fontFamily: EI.sans, fontSize: 10.5, color: EI.mute,
            letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 6,
          }}>{subtitle}</div>
        )}
      </div>

      {/* Lede with drop cap (on first meal only) */}
      {leadText && (
        <div style={{
          padding: '2px 16px 14px',
          borderBottom: `0.5px solid ${EI.sep}`,
        }}>
          <span style={{
            fontFamily: EI.serif, fontSize: 46, fontWeight: 700, lineHeight: 0.9,
            float: 'left', margin: '2px 8px -2px 0', color: accent,
          }}>{dropCap}</span>
          <p style={{
            fontFamily: EI.body, fontSize: 15, lineHeight: 1.5, margin: 0,
            color: EI.ink, hyphens: 'auto',
          }}>
            {leadText}
          </p>
        </div>
      )}

      {/* Item list */}
      <div>
        {items.map((it, i) => (
          <EIMealItem key={it.name} {...it} last={i === items.length - 1}/>
        ))}
      </div>

      {/* Footer — quiet item count + optional calorie caption */}
      <div style={{
        borderTop: `0.5px solid ${EI.sep}`,
        padding: '9px 16px',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: EI.sans, fontSize: 9.5, color: EI.mute,
          letterSpacing: 1.6, textTransform: 'uppercase',
        }}>{items.length} items</span>
        <span style={{
          fontFamily: EI.body, fontSize: 12, color: EI.mute,
          fontStyle: 'italic',
        }}>~{totalCal} kcal</span>
      </div>
    </div>
  );
}

function EditorialIOSScreen() {
  return (
    <div style={{
      background: EI.bg, color: EI.ink, minHeight: '100%', fontFamily: EI.sans,
    }}>
      {/* Status bar spacer */}
      <div style={{ height: 54 }}/>

      {/* Large nav — iOS shape, editorial voice */}
      <div style={{
        padding: '6px 16px 10px',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          color: EI.accent, fontSize: 16, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', gap: 3,
          fontFamily: EI.body, fontStyle: 'italic',
        }}>
          <svg width="10" height="16" viewBox="0 0 10 16" style={{ marginTop: 1 }}>
            <path d="M8 1L2 8l6 7" stroke={EI.accent} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Archive
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke={EI.ink} strokeWidth="1.6"/>
            <path d="M13.5 13.5L18 18" stroke={EI.ink} strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <div style={{
            width: 26, height: 26, borderRadius: 13,
            background: `linear-gradient(135deg, #C7602F, #A32F22)`,
            color: '#fff', fontFamily: EI.serif, fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>A</div>
        </div>
      </div>

      {/* Masthead block */}
      <div style={{
        padding: '4px 18px 14px',
        borderBottom: `0.5px solid ${EI.sep}`,
      }}>
        <div style={{
          fontFamily: EI.sans, fontSize: 9.5, letterSpacing: 3,
          color: EI.mute, textTransform: 'uppercase',
        }}>Week 16 · Day 107</div>
        <h1 style={{
          fontFamily: EI.serif, fontSize: 42, fontWeight: 700,
          letterSpacing: -0.8, lineHeight: 1.02, margin: '4px 0 2px',
          fontStyle: 'italic',
        }}>Today</h1>
        <div style={{
          fontFamily: EI.body, fontSize: 15, color: EI.mute,
          letterSpacing: 0.1, fontStyle: 'italic',
        }}>Friday, April 17 · 3 meals logged</div>
      </div>

      {/* Day summary card — calorie reframed as a quiet footnote */}
      <div style={{
        margin: '16px 16px 22px', background: EI.card, borderRadius: 16,
        padding: '18px 18px 16px',
        boxShadow: '0 1px 2px rgba(28,26,22,0.04), 0 6px 20px rgba(28,26,22,0.04)',
      }}>
        <div style={{
          fontFamily: EI.sans, fontSize: 9.5, letterSpacing: 2.6,
          color: EI.mute, textTransform: 'uppercase', marginBottom: 10,
        }}>— Today</div>
        <div style={{
          fontFamily: EI.serif, fontSize: 22, fontWeight: 500,
          fontStyle: 'italic', letterSpacing: -0.3, lineHeight: 1.2,
          color: EI.ink,
        }}>
          3 meals, 11 items<span style={{ color: EI.accent }}>.</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12,
          borderTop: `0.5px solid ${EI.sep}`, paddingTop: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: EI.sans, fontSize: 9.5, color: EI.mute,
              letterSpacing: 1.6, textTransform: 'uppercase',
            }}>Streak</div>
            <div style={{
              fontFamily: EI.serif, fontSize: 20, fontWeight: 600, color: EI.accent,
              letterSpacing: -0.3, marginTop: 2,
            }}>8 days</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: EI.sans, fontSize: 9.5, color: EI.mute,
              letterSpacing: 1.6, textTransform: 'uppercase',
            }}>Next</div>
            <div style={{
              fontFamily: EI.body, fontSize: 15, fontStyle: 'italic', color: EI.ink,
              marginTop: 2,
            }}>Dinner, likely</div>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{
              fontFamily: EI.sans, fontSize: 9.5, color: EI.mute,
              letterSpacing: 1.6, textTransform: 'uppercase',
            }}>kcal</div>
            <div style={{
              fontFamily: EI.body, fontSize: 14, color: EI.mute,
              fontStyle: 'italic', marginTop: 4,
            }}>~1,842</div>
          </div>
        </div>
      </div>

      {/* Section header */}
      <div style={{
        padding: '0 22px 8px',
        display: 'flex', alignItems: 'baseline', gap: 8,
      }}>
        <span style={{
          fontFamily: EI.sans, fontSize: 10, color: EI.accent,
          letterSpacing: 2.8, textTransform: 'uppercase', fontWeight: 600,
        }}>— Today's Menu</span>
        <div style={{ flex: 1, borderTop: `0.5px solid ${EI.ter}` }}/>
      </div>

      {/* First course — with drop cap lede */}
      <EIMealCard
        type="Breakfast · 8:14"
        time=""
        accent={EI.accent}
        subtitle="4 items"
        headline="Oats, honey, and"
        headlineItalic="a second coffee."
        dropCap="S"
        leadText="Steel-cut oats with a spoon of honey, blueberries, and two cortados before the morning meeting."
        leadCal={412}
        totalCal="412"
        items={[
          { name: 'Steel-cut oats',   cal: 180, tile: { hue: 40, sat: 30, l: 72, pattern: 'dot' } },
          { name: 'Honey',            cal: 64,  tile: { hue: 45, sat: 60, l: 62, pattern: 'solid' } },
          { name: 'Blueberries',      cal: 42,  tile: { hue: 235, sat: 35, l: 44, pattern: 'cross' } },
          { name: 'Cortado ×2',       cal: 126, tile: { hue: 25, sat: 30, l: 34, pattern: 'solid' } },
        ]}
      />

      {/* Second course — no drop cap (keeps rhythm) */}
      <EIMealCard
        type="Lunch · 12:46"
        time=""
        accent={EI.accent}
        subtitle="5 items"
        headline="Chicken caesar,"
        headlineItalic="at the desk."
        totalCal="610"
        items={[
          { name: 'Grilled chicken',    cal: 280, tile: { hue: 30, sat: 28, l: 58, pattern: 'stripe' } },
          { name: 'Romaine + caesar',   cal: 180, tile: { hue: 90, sat: 32, l: 56, pattern: 'wave' } },
          { name: 'Parmesan, shaved',   cal: 95,  tile: { hue: 50, sat: 30, l: 80, pattern: 'dot' } },
          { name: 'Sourdough croutons', cal: 55,  tile: { hue: 35, sat: 34, l: 66, pattern: 'cross' } },
          { name: 'Sparkling water',    cal: null, tile: { hue: 200, sat: 10, l: 88, pattern: 'stripe' } },
        ]}
      />

      <EIMealCard
        type="Snack · 15:22"
        time=""
        accent={EI.accent}
        subtitle="2 items"
        headline="Almonds and"
        headlineItalic="an apple."
        totalCal="240"
        items={[
          { name: 'Almonds, handful', cal: 160, tile: { hue: 30, sat: 20, l: 62, pattern: 'dot' } },
          { name: 'Apple',            cal: 80,  tile: { hue: 8,  sat: 55, l: 54, pattern: 'solid' } },
        ]}
      />

      {/* Footer — tomorrow's plan, editorial voice */}
      <div style={{
        margin: '4px 20px 110px',
        borderTop: `0.5px solid ${EI.sep}`,
        paddingTop: 16, textAlign: 'center',
      }}>
        <div style={{
          fontFamily: EI.sans, fontSize: 9.5, letterSpacing: 2.8,
          color: EI.mute, textTransform: 'uppercase', marginBottom: 6,
        }}>— Up next</div>
        <div style={{
          fontFamily: EI.serif, fontSize: 16, fontStyle: 'italic',
          color: EI.ink, lineHeight: 1.5,
        }}>
          Dinner · salmon &amp; rice
        </div>
      </div>

      {/* Floating compose bar — liquid glass, but editorial placeholder */}
      <div style={{
        position: 'absolute', bottom: 28, left: 16, right: 16,
        height: 54, borderRadius: 27,
        background: 'rgba(255,253,247,0.76)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 12px 32px rgba(28,26,22,0.14), 0 0 0 0.5px rgba(28,26,22,0.08)',
        display: 'flex', alignItems: 'center', padding: '0 6px 0 20px', gap: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" style={{ opacity: 0.55 }}>
          <path d="M11.5 2.5L13.5 4.5L5 13l-3 1 1-3 8.5-8.5z" stroke={EI.ink} strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
        </svg>
        <span style={{
          flex: 1, fontFamily: EI.body, fontStyle: 'italic',
          color: EI.mute, fontSize: 15, letterSpacing: 0.1,
        }}>
          Log a meal…
        </span>
        <div style={{
          width: 42, height: 42, borderRadius: 21, background: EI.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: EI.serif, fontSize: 20, fontStyle: 'italic',
          fontWeight: 600,
        }}>✎</div>
      </div>
    </div>
  );
}

window.EditorialIOSScreen = EditorialIOSScreen;
window.EI = EI;
window.EITile = EITile;
