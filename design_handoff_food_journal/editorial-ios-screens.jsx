// Editorial × iOS — additional screens
// Compose, Meal detail, Week / history, Empty state
// Reuses EI palette + EITile exposed by editorial-ios.jsx

const EIS = window.EI;
const EISTile = window.EITile;

// ───────────────────────────── shared bits ─────────────────────────────

function EISStatusSpacer() {
  return <div style={{ height: 54 }}/>;
}

function EISNavBar({ left, right, center }) {
  return (
    <div style={{
      padding: '6px 16px 10px', display: 'flex', alignItems: 'center',
      gap: 8,
    }}>
      <div style={{
        color: EIS.accent, fontSize: 16,
        display: 'flex', alignItems: 'center', gap: 3,
        fontFamily: EIS.body, fontStyle: 'italic',
      }}>{left}</div>
      <div style={{ flex: 1, textAlign: 'center' }}>{center}</div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{right}</div>
    </div>
  );
}

function EISBackChev({ label = 'Back' }) {
  return (
    <>
      <svg width="10" height="16" viewBox="0 0 10 16" style={{ marginTop: 1 }}>
        <path d="M8 1L2 8l6 7" stroke={EIS.accent} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </>
  );
}

function EISKicker({ children, color }) {
  return (
    <span style={{
      fontFamily: EIS.sans, fontSize: 9.5, letterSpacing: 2.6,
      color: color || EIS.mute, textTransform: 'uppercase', fontWeight: 600,
    }}>{children}</span>
  );
}

function EISRule() {
  return <div style={{ borderTop: `0.5px solid ${EIS.sep}`, margin: '0 16px' }}/>;
}

// ───────────────────────────── Compose ─────────────────────────────
// Quick capture: one text field, parsed items appear as editorial rows below.

function EditorialIOSComposeScreen() {
  return (
    <div style={{ background: EIS.bg, minHeight: '100%', color: EIS.ink }}>
      <EISStatusSpacer/>
      <EISNavBar
        left={<span style={{ fontFamily: EIS.sans, fontSize: 15, color: EIS.mute }}>Cancel</span>}
        center={
          <span style={{
            fontFamily: EIS.sans, fontSize: 10, letterSpacing: 2.4,
            color: EIS.mute, textTransform: 'uppercase', fontWeight: 600,
          }}>New entry</span>
        }
        right={
          <span style={{
            fontFamily: EIS.body, fontSize: 15, color: EIS.accent,
            fontStyle: 'italic', fontWeight: 500,
          }}>Save</span>
        }
      />

      {/* Meal type chips */}
      <div style={{
        padding: '8px 16px 14px', display: 'flex', gap: 6,
        borderBottom: `0.5px solid ${EIS.sep}`,
      }}>
        {[
          { l: 'Breakfast', active: false },
          { l: 'Lunch',     active: true  },
          { l: 'Snack',     active: false },
          { l: 'Dinner',    active: false },
        ].map(c => (
          <span key={c.l} style={{
            fontFamily: EIS.sans, fontSize: 11, letterSpacing: 1.4,
            textTransform: 'uppercase', fontWeight: 600,
            padding: '6px 10px', borderRadius: 999,
            color: c.active ? '#fff' : EIS.mute,
            background: c.active ? EIS.accent : 'transparent',
            border: c.active ? 'none' : `0.5px solid ${EIS.ter}`,
          }}>{c.l}</span>
        ))}
        <div style={{ flex: 1 }}/>
        <span style={{
          fontFamily: EIS.body, fontSize: 13, fontStyle: 'italic', color: EIS.mute,
          alignSelf: 'center',
        }}>12:46</span>
      </div>

      {/* The sheet of paper */}
      <div style={{
        margin: '20px 16px 0',
        background: EIS.card,
        borderRadius: 14,
        padding: '20px 20px 16px',
        boxShadow: '0 1px 2px rgba(28,26,22,0.04), 0 8px 24px rgba(28,26,22,0.05)',
        position: 'relative',
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0 27px, ${EIS.sep} 27px 27.5px)`,
      }}>
        {/* Kicker */}
        <div style={{ marginBottom: 6 }}>
          <EISKicker color={EIS.accent}>— Lunch, Friday</EISKicker>
        </div>

        {/* What you're writing */}
        <div style={{
          fontFamily: EIS.body, fontSize: 20, lineHeight: 1.35,
          color: EIS.ink, minHeight: 108,
        }}>
          chicken caesar with parmesan, sourdough croutons, and a sparkling water<span style={{
            display: 'inline-block', width: 2, height: 18, background: EIS.accent,
            marginLeft: 2, verticalAlign: '-2px',
            animation: 'none',
          }}/>
        </div>

        {/* Hint line */}
        <div style={{
          fontFamily: EIS.body, fontSize: 13, fontStyle: 'italic',
          color: EIS.mute, marginTop: 6,
        }}>
          Write a sentence. Separate items with commas or “and”.
        </div>
      </div>

      {/* Parsed items preview */}
      <div style={{
        margin: '18px 16px 0', padding: '0 4px 0 4px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          padding: '0 12px 8px',
        }}>
          <EISKicker>— Recognized, 5 items</EISKicker>
          <div style={{ flex: 1, borderTop: `0.5px solid ${EIS.ter}`, marginTop: 6 }}/>
          <span style={{
            fontFamily: EIS.body, fontSize: 12, fontStyle: 'italic', color: EIS.accent,
          }}>Edit</span>
        </div>

        <div style={{
          background: EIS.card, borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(28,26,22,0.04), 0 6px 20px rgba(28,26,22,0.04)',
        }}>
          {[
            { name: 'Grilled chicken',    qty: '150 g',   tile: { hue: 30,  sat: 28, l: 58, pattern: 'stripe' } },
            { name: 'Romaine + caesar',   qty: '1 bowl',  tile: { hue: 90,  sat: 32, l: 56, pattern: 'wave' } },
            { name: 'Parmesan, shaved',   qty: '20 g',    tile: { hue: 50,  sat: 30, l: 80, pattern: 'dot' } },
            { name: 'Sourdough croutons', qty: '¼ cup',   tile: { hue: 35,  sat: 34, l: 66, pattern: 'cross' } },
            { name: 'Sparkling water',    qty: '500 ml',  tile: { hue: 200, sat: 10, l: 88, pattern: 'stripe' } },
          ].map((it, i, arr) => (
            <div key={it.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px',
              borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${EIS.sep}`,
            }}>
              <EISTile {...it.tile} size={28}/>
              <span style={{
                flex: 1, fontFamily: EIS.body, fontSize: 16,
                fontStyle: 'italic', color: EIS.ink,
              }}>{it.name}</span>
              <span style={{
                fontFamily: EIS.sans, fontSize: 11, color: EIS.mute,
                letterSpacing: 0.6, fontFeatureSettings: '"tnum"',
              }}>{it.qty}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ opacity: 0.35 }}>
                <path d="M4 2l4 4-4 4" stroke={EIS.ink} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          ))}
        </div>

        <div style={{
          fontFamily: EIS.body, fontSize: 12, fontStyle: 'italic',
          color: EIS.mute, padding: '10px 14px 0', textAlign: 'center',
        }}>
          Tap any item to adjust it.
        </div>
      </div>

      {/* Keyboard region (fake) */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 280,
        background: `linear-gradient(180deg, ${EIS.bg}, #E7DFC9)`,
        borderTop: `0.5px solid ${EIS.sep}`,
        padding: '10px 6px',
      }}>
        {/* suggestion strip */}
        <div style={{
          display: 'flex', gap: 8, padding: '6px 8px 10px',
          borderBottom: `0.5px solid rgba(28,26,22,0.08)`,
        }}>
          {['caesar', 'parmesan', 'and'].map((w, i) => (
            <span key={w} style={{
              flex: 1, textAlign: 'center',
              fontFamily: EIS.body, fontSize: 15,
              color: i === 1 ? EIS.ink : EIS.mute,
              fontStyle: 'italic',
              padding: '4px 0',
              background: i === 1 ? 'rgba(255,255,255,0.6)' : 'transparent',
              borderRadius: 6,
            }}>{w}</span>
          ))}
        </div>
        {/* rows */}
        {[
          'qwertyuiop',
          'asdfghjkl',
          'zxcvbnm',
        ].map((row, ri) => (
          <div key={ri} style={{
            display: 'flex', justifyContent: 'center', gap: 5,
            padding: '5px 2px',
          }}>
            {row.split('').map(k => (
              <div key={k} style={{
                width: 30, height: 38, borderRadius: 5,
                background: '#fff', boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
                fontFamily: EIS.sans, fontSize: 15, color: EIS.ink,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{k}</div>
            ))}
          </div>
        ))}
        <div style={{
          display: 'flex', gap: 5, padding: '5px 2px', justifyContent: 'center',
        }}>
          <div style={{
            width: 62, height: 38, borderRadius: 5, background: 'rgba(0,0,0,0.08)',
            fontFamily: EIS.sans, fontSize: 11, color: EIS.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>123</div>
          <div style={{
            flex: 1, maxWidth: 180, height: 38, borderRadius: 5, background: '#fff',
            boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
            fontFamily: EIS.sans, fontSize: 13, color: EIS.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>space</div>
          <div style={{
            width: 62, height: 38, borderRadius: 5, background: EIS.accent,
            fontFamily: EIS.body, fontStyle: 'italic', fontSize: 14, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 500,
          }}>save</div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Meal detail ─────────────────────────────

function EditorialIOSDetailScreen() {
  return (
    <div style={{ background: EIS.bg, minHeight: '100%', color: EIS.ink }}>
      <EISStatusSpacer/>
      <EISNavBar
        left={<EISBackChev label="Today"/>}
        right={
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v14M2 9h14" stroke={EIS.ink} strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="4.5" cy="9" r="1.4" fill={EIS.ink}/>
              <circle cx="9" cy="9" r="1.4" fill={EIS.ink}/>
              <circle cx="13.5" cy="9" r="1.4" fill={EIS.ink}/>
            </svg>
          </>
        }
      />

      {/* Hero */}
      <div style={{ padding: '6px 22px 14px' }}>
        <EISKicker color={EIS.accent}>— Lunch · Fri, Apr 17</EISKicker>
        <h1 style={{
          fontFamily: EIS.serif, fontSize: 40, fontWeight: 700,
          letterSpacing: -0.8, lineHeight: 1.02, margin: '6px 0 4px',
        }}>
          Chicken caesar,<br/>
          <span style={{ fontStyle: 'italic', fontWeight: 500 }}>at the desk.</span>
        </h1>
        <div style={{
          fontFamily: EIS.body, fontSize: 14, color: EIS.mute,
          letterSpacing: 0.1,
        }}>
          12:46 · 5 items · ~610 kcal
        </div>
      </div>

      {/* Full-bleed tonal strip — editorial equivalent of a hero photo */}
      <div style={{
        margin: '0 16px 22px', height: 120, borderRadius: 10, overflow: 'hidden',
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
        boxShadow: '0 1px 2px rgba(28,26,22,0.04), 0 6px 20px rgba(28,26,22,0.04)',
      }}>
        <EISTile hue={30}  sat={28} l={58} pattern="stripe" size={'100%'}/>
        <EISTile hue={90}  sat={32} l={56} pattern="wave"   size={'100%'}/>
        <EISTile hue={50}  sat={30} l={80} pattern="dot"    size={'100%'}/>
        <EISTile hue={35}  sat={34} l={66} pattern="cross"  size={'100%'}/>
        <EISTile hue={200} sat={10} l={88} pattern="stripe" size={'100%'}/>
      </div>

      {/* The lede — drop cap */}
      <div style={{ padding: '0 22px 22px' }}>
        <span style={{
          fontFamily: EIS.serif, fontSize: 54, fontWeight: 700, lineHeight: 0.9,
          float: 'left', margin: '4px 10px -2px 0', color: EIS.accent,
        }}>A</span>
        <p style={{
          fontFamily: EIS.body, fontSize: 17, lineHeight: 1.5, margin: 0,
          color: EIS.ink, hyphens: 'auto',
        }}>
          standing-desk lunch. Grilled chicken over romaine with caesar, shaved
          parmesan, and a handful of sourdough croutons. Sparkling water on the side.
        </p>
      </div>

      {/* Items list */}
      <div style={{
        padding: '0 22px 8px',
        display: 'flex', alignItems: 'baseline', gap: 8,
      }}>
        <EISKicker color={EIS.accent}>— Ingredients</EISKicker>
        <div style={{ flex: 1, borderTop: `0.5px solid ${EIS.ter}` }}/>
      </div>

      <div style={{
        background: EIS.card, borderRadius: 14, margin: '0 16px 20px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(28,26,22,0.04), 0 6px 20px rgba(28,26,22,0.04)',
      }}>
        {[
          { name: 'Grilled chicken',    qty: '150 g',   note: 'lemon · pepper',     tile: { hue: 30,  sat: 28, l: 58, pattern: 'stripe' } },
          { name: 'Romaine + caesar',   qty: '1 bowl',  note: 'house dressing',     tile: { hue: 90,  sat: 32, l: 56, pattern: 'wave' } },
          { name: 'Parmesan, shaved',   qty: '20 g',    note: null,                  tile: { hue: 50,  sat: 30, l: 80, pattern: 'dot' } },
          { name: 'Sourdough croutons', qty: '¼ cup',   note: 'from yesterday',      tile: { hue: 35,  sat: 34, l: 66, pattern: 'cross' } },
          { name: 'Sparkling water',    qty: '500 ml',  note: null,                  tile: { hue: 200, sat: 10, l: 88, pattern: 'stripe' } },
        ].map((it, i, arr) => (
          <div key={it.name} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${EIS.sep}`,
          }}>
            <EISTile {...it.tile} size={30}/>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: EIS.body, fontSize: 16, fontStyle: 'italic', color: EIS.ink,
              }}>{it.name}</div>
              {it.note && (
                <div style={{
                  fontFamily: EIS.body, fontSize: 12, color: EIS.mute,
                  fontStyle: 'italic', marginTop: 1,
                }}>{it.note}</div>
              )}
            </div>
            <span style={{
              fontFamily: EIS.sans, fontSize: 11, color: EIS.mute,
              letterSpacing: 0.6, fontFeatureSettings: '"tnum"',
            }}>{it.qty}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div style={{
        padding: '0 22px 8px',
        display: 'flex', alignItems: 'baseline', gap: 8,
      }}>
        <EISKicker color={EIS.accent}>— Notes</EISKicker>
        <div style={{ flex: 1, borderTop: `0.5px solid ${EIS.ter}` }}/>
      </div>
      <div style={{
        margin: '0 16px 20px', background: EIS.card, borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 1px 2px rgba(28,26,22,0.04), 0 6px 20px rgba(28,26,22,0.04)',
        fontFamily: EIS.body, fontSize: 15, fontStyle: 'italic',
        color: EIS.ink, lineHeight: 1.5,
      }}>
        Ate faster than usual &mdash; back-to-back calls. Croutons were the highlight.
      </div>

      {/* Meta row */}
      <div style={{
        margin: '0 22px 110px',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: EIS.sans, fontSize: 10.5, letterSpacing: 1.6,
        textTransform: 'uppercase', color: EIS.mute,
      }}>
        <span>Logged 12:46</span>
        <span>Edited 12:51</span>
        <span style={{ color: EIS.accent }}>Delete</span>
      </div>
    </div>
  );
}

// ───────────────────────────── Week / history ─────────────────────────────

function EISDayRow({ day, date, kicker, items, tiles, current, empty }) {
  return (
    <div style={{
      padding: '14px 20px 16px',
      borderBottom: `0.5px solid ${EIS.sep}`,
      display: 'grid', gridTemplateColumns: '38px 1fr',
      columnGap: 14,
      background: current ? 'rgba(255,253,247,0.55)' : 'transparent',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: EIS.sans, fontSize: 10, letterSpacing: 1.8,
          color: current ? EIS.accent : EIS.mute, textTransform: 'uppercase',
          fontWeight: 600,
        }}>{day}</div>
        <div style={{
          fontFamily: EIS.serif, fontSize: 24, fontWeight: 600,
          color: current ? EIS.accent : EIS.ink,
          letterSpacing: -0.3, lineHeight: 1, marginTop: 2,
          fontStyle: current ? 'italic' : 'normal',
        }}>{date}</div>
      </div>

      <div>
        {empty ? (
          <div style={{
            fontFamily: EIS.body, fontSize: 15, fontStyle: 'italic',
            color: EIS.mute, padding: '6px 0',
          }}>
            Nothing logged.
          </div>
        ) : (
          <>
            <div style={{
              fontFamily: EIS.body, fontSize: 15, color: EIS.ink,
              lineHeight: 1.35,
            }}>
              {kicker}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {tiles.map((t, i) => <EISTile key={i} {...t} size={22}/>)}
              <div style={{ flex: 1 }}/>
              <span style={{
                fontFamily: EIS.sans, fontSize: 10, letterSpacing: 1.4,
                color: EIS.mute, textTransform: 'uppercase', alignSelf: 'center',
              }}>{items} items</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditorialIOSWeekScreen() {
  return (
    <div style={{ background: EIS.bg, minHeight: '100%', color: EIS.ink }}>
      <EISStatusSpacer/>
      <EISNavBar
        left={<EISBackChev label="Today"/>}
        right={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke={EIS.ink} strokeWidth="1.6"/>
            <path d="M13.5 13.5L18 18" stroke={EIS.ink} strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        }
      />

      {/* Masthead */}
      <div style={{ padding: '4px 22px 16px', borderBottom: `0.5px solid ${EIS.sep}` }}>
        <EISKicker>Week 16 · Apr 13 – 19</EISKicker>
        <h1 style={{
          fontFamily: EIS.serif, fontSize: 38, fontWeight: 700,
          letterSpacing: -0.8, lineHeight: 1.02, margin: '4px 0 6px',
          fontStyle: 'italic',
        }}>The week</h1>
        <div style={{
          fontFamily: EIS.body, fontSize: 14, color: EIS.mute, lineHeight: 1.4,
        }}>
          19 meals, 68 items &middot; <span style={{ color: EIS.accent }}>8-day streak</span>
        </div>
      </div>

      {/* Week ribbon — tonal bars per day */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: `0.5px solid ${EIS.sep}`,
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 56 }}>
          {[
            { d: 'M', h: 32, c: [28, 34] },
            { d: 'T', h: 40, c: [40, 56, 20] },
            { d: 'W', h: 28, c: [20, 34] },
            { d: 'T', h: 46, c: [58, 34, 40] },
            { d: 'F', h: 44, c: [40, 90, 25], current: true },
            { d: 'S', h: 0,  c: [] },
            { d: 'S', h: 0,  c: [] },
          ].map((b, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 2,
                justifyContent: 'flex-end', height: 48,
              }}>
                {b.c.length === 0 ? (
                  <div style={{
                    height: 4, background: EIS.ter, borderRadius: 1,
                    opacity: 0.4,
                  }}/>
                ) : (
                  b.c.map((hue, ci) => (
                    <div key={ci} style={{
                      height: 10 + ci * 3,
                      background: `hsl(${hue} ${ci === 1 ? 45 : 30}% ${60 - ci * 6}%)`,
                      borderRadius: 1,
                      outline: b.current ? `1px solid ${EIS.accent}` : 'none',
                    }}/>
                  ))
                )}
              </div>
              <div style={{
                fontFamily: EIS.sans, fontSize: 10, letterSpacing: 1.2,
                color: b.current ? EIS.accent : EIS.mute,
                textTransform: 'uppercase', marginTop: 4, fontWeight: 600,
              }}>{b.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section label */}
      <div style={{
        padding: '16px 22px 6px',
        display: 'flex', alignItems: 'baseline', gap: 8,
      }}>
        <EISKicker color={EIS.accent}>— The days</EISKicker>
        <div style={{ flex: 1, borderTop: `0.5px solid ${EIS.ter}` }}/>
      </div>

      <div style={{
        background: EIS.card, margin: '0 16px 110px',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(28,26,22,0.04), 0 6px 20px rgba(28,26,22,0.04)',
      }}>
        <EISDayRow
          day="Fri" date="17" current
          kicker={<><i>Oats and coffee</i> · <i>chicken caesar</i> · <i>almonds, apple</i></>}
          items={11}
          tiles={[
            { hue: 40, sat: 30, l: 72, pattern: 'dot' },
            { hue: 30, sat: 28, l: 58, pattern: 'stripe' },
            { hue: 90, sat: 32, l: 56, pattern: 'wave' },
            { hue: 8,  sat: 55, l: 54, pattern: 'solid' },
          ]}
        />
        <EISDayRow
          day="Thu" date="16"
          kicker={<><i>Toast and eggs</i> · <i>poke bowl</i> · <i>roast chicken, kale</i></>}
          items={14}
          tiles={[
            { hue: 45, sat: 35, l: 68, pattern: 'cross' },
            { hue: 10, sat: 40, l: 58, pattern: 'dot' },
            { hue: 90, sat: 30, l: 52, pattern: 'wave' },
          ]}
        />
        <EISDayRow
          day="Wed" date="15"
          kicker={<><i>Granola, yogurt</i> · <i>leftover pasta</i> · <i>salmon, rice</i></>}
          items={9}
          tiles={[
            { hue: 50, sat: 40, l: 70, pattern: 'dot' },
            { hue: 22, sat: 38, l: 62, pattern: 'stripe' },
            { hue: 12, sat: 50, l: 62, pattern: 'wave' },
          ]}
        />
        <EISDayRow
          day="Tue" date="14"
          kicker={<><i>Banana &amp; coffee</i> · <i>ramen</i> · <i>chicken stir-fry</i></>}
          items={13}
          tiles={[
            { hue: 50, sat: 60, l: 62, pattern: 'solid' },
            { hue: 20, sat: 30, l: 52, pattern: 'wave' },
            { hue: 90, sat: 35, l: 50, pattern: 'cross' },
          ]}
        />
        <EISDayRow
          day="Mon" date="13"
          kicker={<><i>Oats</i> · <i>caprese</i> · <i>fish tacos</i></>}
          items={10}
          tiles={[
            { hue: 40, sat: 30, l: 72, pattern: 'dot' },
            { hue: 0,  sat: 45, l: 62, pattern: 'solid' },
            { hue: 30, sat: 30, l: 64, pattern: 'stripe' },
          ]}
        />
        <EISDayRow day="Sun" date="12" empty/>
      </div>
    </div>
  );
}

// ───────────────────────────── Empty state ─────────────────────────────

function EditorialIOSEmptyScreen() {
  return (
    <div style={{
      background: EIS.bg, minHeight: '100%', color: EIS.ink,
      position: 'relative',
    }}>
      <EISStatusSpacer/>

      {/* Nav (empty right side, no avatar yet) */}
      <div style={{ padding: '6px 16px 10px', display: 'flex' }}>
        <div style={{ flex: 1 }}/>
        <div style={{
          width: 28, height: 28, borderRadius: 14,
          border: `1px dashed ${EIS.ter}`,
        }}/>
      </div>

      {/* Masthead */}
      <div style={{ padding: '4px 22px 14px' }}>
        <EISKicker>Week 1 · Day 1</EISKicker>
        <h1 style={{
          fontFamily: EIS.serif, fontSize: 44, fontWeight: 700,
          letterSpacing: -0.8, lineHeight: 1.02, margin: '4px 0 6px',
          fontStyle: 'italic',
        }}>Today</h1>
        <div style={{
          fontFamily: EIS.body, fontSize: 15, color: EIS.mute,
          letterSpacing: 0.1,
        }}>Friday, April 17</div>
      </div>

      <div style={{ padding: '0 16px 0 16px' }}>
        <div style={{ borderTop: `0.5px solid ${EIS.sep}` }}/>
      </div>

      {/* Centerpiece */}
      <div style={{
        margin: '48px 28px 0',
        textAlign: 'center',
      }}>
        {/* Little ornament */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, marginBottom: 22,
        }}>
          <div style={{ width: 40, borderTop: `0.5px solid ${EIS.ter}` }}/>
          <span style={{
            fontFamily: EIS.serif, fontSize: 22, color: EIS.accent,
            fontStyle: 'italic', fontWeight: 500,
          }}>&sect;</span>
          <div style={{ width: 40, borderTop: `0.5px solid ${EIS.ter}` }}/>
        </div>

        <h2 style={{
          fontFamily: EIS.serif, fontSize: 32, fontWeight: 600,
          letterSpacing: -0.6, lineHeight: 1.1, margin: 0,
          fontStyle: 'italic',
        }}>
          A blank page.
        </h2>
        <p style={{
          fontFamily: EIS.body, fontSize: 16, lineHeight: 1.5,
          color: EIS.mute, margin: '12px auto 0', maxWidth: 280,
        }}>
          Start by writing what you had. A sentence is enough &mdash; we&rsquo;ll pull
          out the items.
        </p>
      </div>

      {/* Three example prompts — tap to prefill */}
      <div style={{ margin: '28px 20px 0' }}>
        <div style={{ padding: '0 2px 8px' }}>
          <EISKicker>— Try one</EISKicker>
        </div>
        <div style={{
          background: EIS.card, borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(28,26,22,0.04), 0 6px 20px rgba(28,26,22,0.04)',
        }}>
          {[
            'Oatmeal with blueberries and a coffee',
            'Chicken caesar at the desk',
            'Handful of almonds and an apple',
          ].map((t, i, arr) => (
            <div key={t} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: i === arr.length - 1 ? 'none' : `0.5px solid ${EIS.sep}`,
            }}>
              <span style={{
                fontFamily: EIS.serif, fontSize: 16, color: EIS.accent,
                fontWeight: 600, width: 14, fontStyle: 'italic',
              }}>{i + 1}.</span>
              <span style={{
                flex: 1, fontFamily: EIS.body, fontSize: 15,
                fontStyle: 'italic', color: EIS.ink,
              }}>{t}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ opacity: 0.35 }}>
                <path d="M4 2l4 4-4 4" stroke={EIS.ink} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Floating compose pill (same as home) */}
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
          <path d="M11.5 2.5L13.5 4.5L5 13l-3 1 1-3 8.5-8.5z" stroke={EIS.ink} strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
        </svg>
        <span style={{
          flex: 1, fontFamily: EIS.body, fontStyle: 'italic',
          color: EIS.mute, fontSize: 15,
        }}>
          Log a meal…
        </span>
        <div style={{
          width: 42, height: 42, borderRadius: 21, background: EIS.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: EIS.serif, fontSize: 20, fontStyle: 'italic',
          fontWeight: 600,
        }}>✎</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  EditorialIOSComposeScreen,
  EditorialIOSDetailScreen,
  EditorialIOSWeekScreen,
  EditorialIOSEmptyScreen,
});
