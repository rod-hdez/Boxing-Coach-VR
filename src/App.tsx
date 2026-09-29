import { useEffect, useRef, useState } from 'react';
import { BoxingScene, type ControllerState } from './xr/BoxingScene';

type XRStatus = 'checking' | 'ready' | 'unavailable';

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function App() {
  const canvasHost = useRef<HTMLDivElement>(null);
  const buttonHost = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<XRStatus>('checking');
  const [inSession, setInSession] = useState(false);
  const [controllers, setControllers] = useState<ControllerState>({ left: false, right: false });
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!canvasHost.current || !buttonHost.current) return;
    let scene: BoxingScene | undefined;
    try {
      scene = new BoxingScene(canvasHost.current, buttonHost.current, {
        onSessionChange: setInSession,
        onControllersChange: setControllers,
      });
    } catch (error) {
      console.error('Unable to initialize WebGL scene', error);
      setRenderError(true);
    }

    let active = true;
    if (!window.isSecureContext || !('xr' in navigator)) {
      setStatus('unavailable');
    } else {
      navigator.xr?.isSessionSupported('immersive-vr')
        .then((supported) => { if (active) setStatus(supported ? 'ready' : 'unavailable'); })
        .catch(() => { if (active) setStatus('unavailable'); });
    }
    return () => {
      active = false;
      scene?.dispose();
    };
  }, []);

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="scene-canvas" ref={canvasHost} aria-hidden="true" />
        <div className="scene-vignette" aria-hidden="true" />

        <header className="site-header page-width">
          <a className="brand-lockup" href="#top" aria-label="Boxing Coach home">
            <span className="brand-symbol" aria-hidden="true"><span /><span /></span>
            <span>BOXING<br />COACH<span className="brand-dot">.</span></span>
          </a>
          <div className="header-right">
            <span className="header-edition">WEBXR EXPERIENCE</span>
            <span className="header-phase"><span className="live-dot" /> PHASE 01 / FOUNDATION</span>
          </div>
        </header>

        <div className="hero-body page-width" id="top">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> THE FIRST STEP IS SHOWING UP</div>
            <h1 id="hero-title">BOXING<br /><em>COACH.</em></h1>
            <p>Your hands. In the game. Put on your headset, pick up your controllers, and see every movement come to life.</p>
            <div className="action-row">
              <div className="vr-button-host" ref={buttonHost} aria-label="Enter VR control" />
              <a href="#how-to-play" className="secondary-action">HOW TO TEST <ArrowIcon /></a>
            </div>
            <div className="system-line" role="status">
              <span className={`system-indicator ${status === 'ready' ? 'is-ready' : ''}`} />
              {status === 'checking' ? 'CHECKING YOUR DEVICE...' : status === 'ready' ? 'HEADSET READY / ENTER VR TO BEGIN' : 'DESKTOP PREVIEW / OPEN ON QUEST 3 FOR VR'}
            </div>
            {renderError && <p className="error-text">WebGL is unavailable in this browser. Enable hardware acceleration to view the scene.</p>}
          </div>
        </div>

        <div className="hero-footer page-width">
          <span>BUILT FOR META QUEST 3</span>
          <span className="footer-center">MOVE FREELY. STAY PRESENT.</span>
          <a href="#how-to-play">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a>
        </div>
        <span className="vertical-label" aria-hidden="true">PRECISION STARTS HERE / 001</span>
      </section>

      <section className="instructions page-width" id="how-to-play" aria-labelledby="instructions-title">
        <div className="section-meta"><span>01 / GET STARTED</span><span>THE SETUP</span></div>
        <div className="instructions-layout">
          <div>
            <h2 id="instructions-title">Ready when<br /><em>you are.</em></h2>
            <p className="section-intro">Phase 1 is all about presence. Your head tracks in 6DoF, your controllers become gloves, and a trigger press gives you a haptic pulse.</p>
          </div>
          <div className="steps">
            <div className="step"><span className="step-number">01</span><div><h3>OPEN ON YOUR HEADSET</h3><p>Visit this page over HTTPS in the Meta Quest Browser. WebXR requires a secure connection.</p></div></div>
            <div className="step"><span className="step-number">02</span><div><h3>ENTER VR</h3><p>Select the Enter VR button above and allow the browser to start an immersive session.</p></div></div>
            <div className="step"><span className="step-number">03</span><div><h3>FIND YOUR GUARD</h3><p>Pick up both controllers, move your hands, and squeeze either trigger to test vibration.</p></div></div>
          </div>
        </div>
        <div className="test-status" aria-live="polite">
          <div><span className="test-label">SESSION</span><strong>{inSession ? 'ACTIVE' : 'STANDBY'}</strong></div>
          <div><span className="test-label">LEFT GLOVE</span><strong>{controllers.left ? 'TRACKING' : 'WAITING'}</strong></div>
          <div><span className="test-label">RIGHT GLOVE</span><strong>{controllers.right ? 'TRACKING' : 'WAITING'}</strong></div>
          <span className="test-note">Live tracking status updates when you enter VR.</span>
        </div>
      </section>
      <footer className="site-footer page-width"><span>BOXING COACH / WEBXR</span><span>PHASE 01: FOUNDATION</span></footer>
    </main>
  );
}
