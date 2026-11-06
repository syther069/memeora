import type { CSSProperties } from 'react';

const COLUMNS = [0, 1, 2, 3, 4, 5];
const NAME = 'Memeora';

/** Runs before the first paint, so a repeat visit in this tab never flashes the intro. */
const SEEN_SCRIPT = `try{if(sessionStorage.getItem('memeora-intro'))document.documentElement.setAttribute('data-intro-seen','');sessionStorage.setItem('memeora-intro','1')}catch(e){document.documentElement.setAttribute('data-intro-seen','')}`;

/**
 * Memeora's own opening: the name rises, a ledger rule is drawn under it, and two
 * rows of blue steps part to show the page. The parting takes its idea from the
 * Skiper 10 preview (https://skiper-ui.com/v1/preview/skiper10). Its source is paid
 * and was not used.
 *
 * Plain CSS, so it runs and ends without script and never waits on the network. It
 * reports no progress because there is none to report. It is hidden unless motion
 * is allowed, and clicks pass straight through it.
 */
export function Preloader() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SEEN_SCRIPT }} />
      <div aria-hidden className="intro">
        <div className="intro-row intro-top">{COLUMNS.map((step) => <span key={step} style={{ '--s': step } as CSSProperties} />)}</div>
        <div className="intro-row intro-bottom">{COLUMNS.map((step) => <span key={step} style={{ '--s': 5 - step } as CSSProperties} />)}</div>
        <div className="intro-word">
          <p className="intro-letters text-[clamp(3rem,10vw,7rem)] font-bold leading-none tracking-[-0.04em]">
            {NAME.split('').map((letter, index) => <span key={index} style={{ '--i': index } as CSSProperties}>{letter}</span>)}
          </p>
          <span className="intro-rule" />
        </div>
      </div>
    </>
  );
}
