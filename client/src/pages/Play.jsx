import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Pitch from '../game/Pitch.jsx';
import Scoreboard from '../game/Scoreboard.jsx';
import {
  LEVELS, ZONES, ballPath, clampAim, cpuShot, goalsOf, inAimBox, keeperPose, matchStatus, playerShot, resolveSave,
} from '../game/engine.js';

const SHOOT_TEXT = { goal: 'GOL! ⚽', saved: 'Darvozabon qaytardi! 🧤', miss: "Mo'ljaldan tashqari! 😬", post: 'Ustunga tegdi! 😱' };
const KEEP_TEXT = { goal: 'Kompyuter gol urdi 😞', saved: 'Ajoyib sakrash! 🧤', miss: "Kompyuter mo'ljalga tegmadi! 🍀", post: 'Ustun qutqardi! 🍀' };
const HINTS = {
  aim: "Zarba navbati sizda: darvozaning istalgan nuqtasiga bosib mo'ljal oling",
  power: 'Kuchni tanlang: chiziqli zonada bosing (yoki Probel)',
  keep: 'Siz darvozabonsiz! Sakrash tomonini tanlang (Q W E / A S D)',
};
const EMPTY = { player: [], cpu: [] };

export default function Play() {
  const { user, request } = useAuth();
  const [params] = useSearchParams();
  const level = LEVELS[params.get('level')] ? params.get('level') : 'medium';
  const L = LEVELS[level];

  const [match, setMatchState] = useState(EMPTY);
  const [phase, setPhaseState] = useState('intro'); // intro | aim | power | keep | flying | result | over
  const [cursor, setCursor] = useState(null);
  const [aim, setAimState] = useState(null);
  const [power, setPower] = useState(0);
  const [turn, setTurn] = useState('player');
  const [message, setMessage] = useState(null);
  const [keepLeft, setKeepLeft] = useState(1);
  const [saveState, setSaveState] = useState('idle');

  // taymer va klaviatura ishlovchilari eskirgan state'ni ko'rmasligi uchun
  const matchRef = useRef(match);
  const phaseRef = useRef(phase);
  const aimRef = useRef(null);
  const powerRef = useRef(0);
  const ballRef = useRef(null);
  const keeperRef = useRef(null);
  const timers = useRef([]);

  const setMatch = (m) => { matchRef.current = m; setMatchState(m); };
  const setPhase = (p) => { phaseRef.current = p; setPhaseState(p); };
  const setAim = (a) => { aimRef.current = a; setAimState(a); };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => clearTimers, []);

  function resetAnimations() {
    [ballRef, keeperRef].forEach((r) => r.current?.getAnimations().forEach((a) => a.cancel()));
  }

  function beginTurn(m) {
    resetAnimations();
    setAim(null);
    setMessage(null);
    const status = matchStatus(m);
    if (status) {
      setPhase('over');
      saveGame(m);
      return;
    }
    if (m.player.length === m.cpu.length) {
      setTurn('player');
      setPhase('aim');
    } else {
      setTurn('cpu');
      setKeepLeft(1);
      setPhase('keep');
    }
  }

  function start() {
    clearTimers();
    setSaveState('idle');
    setMatch(EMPTY);
    beginTurn(EMPTY);
  }

  async function saveGame(m) {
    setSaveState('saving');
    try {
      await request('/games', { body: { difficulty: level, player: m.player, cpu: m.cpu } });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  function launch(kick) {
    setPhase('flying');
    const total = Math.round(kick.duration * 1.4);
    const frames = ballPath(kick).map((f) => ({
      transform: `translate(${f.x}px, ${f.y}px) scale(${f.s})`,
      ...(f.offset != null && { offset: f.offset }),
    }));
    ballRef.current.animate(frames, { duration: total, easing: 'ease-out', fill: 'forwards' });

    const pose = keeperPose(kick.outcome === 'saved' ? kick.ball : kick.dive);
    keeperRef.current.animate(
      [{ transform: 'translate(0px, 0px) rotate(0deg)' }, { transform: `translate(${pose.tx}px, ${pose.ty}px) rotate(${pose.deg}deg)` }],
      { duration: 450, delay: 80, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }
    );

    later(() => {
      const cur = matchRef.current;
      const next = { ...cur, [kick.by]: [...cur[kick.by], kick.outcome] };
      setMatch(next);
      const mine = kick.by === 'player';
      setMessage({
        text: (mine ? SHOOT_TEXT : KEEP_TEXT)[kick.outcome],
        good: mine ? kick.outcome === 'goal' : kick.outcome !== 'goal',
      });
      setPhase('result');
      later(() => beginTurn(next), 1700);
    }, total + 100);
  }

  function shoot() {
    if (phaseRef.current !== 'power') return;
    const p = Math.round(powerRef.current);
    launch({ by: 'player', ...playerShot(aimRef.current, p, level) });
  }

  function dive(zone) {
    if (phaseRef.current !== 'keep') return;
    const ball = cpuShot(level);
    const at = zone ? { x: zone.x, y: zone.y } : null;
    launch({ by: 'cpu', ball, dive: at, outcome: resolveSave(ball, at, level), duration: 480 + Math.random() * 160 });
  }

  function onPoint(p) {
    if (phaseRef.current === 'aim' && inAimBox(p)) {
      setAim(clampAim(p));
      setCursor(null);
      setPhase('power');
    } else if (phaseRef.current === 'power') {
      shoot();
    }
  }

  function onMove(p) {
    if (phaseRef.current === 'aim') setCursor(inAimBox(p) ? clampAim(p) : null);
  }

  // kuch shkalasi tebranishi
  useEffect(() => {
    if (phase !== 'power') return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const pos = ((t - t0) * 0.1 * L.meterSpeed) % 200;
      powerRef.current = pos < 100 ? pos : 200 - pos;
      setPower(powerRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, L.meterSpeed]);

  // darvozabon uchun vaqt — tugasa, joyida qoladi
  useEffect(() => {
    if (phase !== 'keep') return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const left = 1 - (t - t0) / L.keepTime;
      if (left <= 0) {
        setKeepLeft(0);
        dive(null);
        return;
      }
      setKeepLeft(left);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (phaseRef.current === 'power' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        shoot();
      } else if (phaseRef.current === 'keep') {
        const z = ZONES.find((zone) => zone.key === e.key.toLowerCase());
        if (z) dive(z);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const result = phase === 'over' ? matchStatus(match) : null;

  return (
    <div className="play">
      <Scoreboard user={user} match={match} level={level} turn={turn} />

      <div className={`hint ${message ? (message.good ? 'good' : 'bad') : ''}`}>
        {message?.text ?? HINTS[phase] ?? ' '}
      </div>

      <div className="stage">
        <Pitch
          phase={phase}
          cursor={cursor}
          aim={aim}
          power={power}
          keeperColor={turn === 'player' ? '#f77f00' : '#3a86ff'}
          keepLeft={keepLeft}
          onPoint={onPoint}
          onMove={onMove}
          onZone={dive}
          ballRef={ballRef}
          keeperRef={keeperRef}
        />

        {phase === 'intro' && (
          <div className="overlay">
            <div className="overlay-card">
              <h2>Penaltilar seriyasi</h2>
              <ul className="rules">
                <li>Har bir tomon <b>5 tadan</b> zarba beradi, durang bo'lsa — qo'shimcha seriya.</li>
                <li><b>Zarba:</b> darvozaga bosib mo'ljal oling, keyin kuchni chiziqli zonada to'xtating.</li>
                <li>Juda kuchli zarba to'sindan oshadi, kuchsizini darvozabon oson ushlaydi.</li>
                <li><b>Darvozabon:</b> vaqt tugaguncha zonani tanlang (sichqoncha yoki Q W E / A S D).</li>
              </ul>
              <p className="muted">Daraja: <b>{L.label}</b> — {L.desc}</p>
              <button onClick={start}>Boshlash ⚽</button>
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div className="overlay">
            <div className="overlay-card">
              <div className="big-emoji">{result === 'win' ? '🏆' : '😔'}</div>
              <h2>{result === 'win' ? "G'alaba!" : "Mag'lubiyat"}</h2>
              <div className="final-score">
                {goalsOf(match.player)} : {goalsOf(match.cpu)}
              </div>
              <p className="muted">
                {saveState === 'saving' && 'Natija saqlanmoqda...'}
                {saveState === 'saved' && 'Natija profilingizga saqlandi ✓'}
                {saveState === 'error' && 'Natijani saqlab bo‘lmadi'}
              </p>
              <div className="actions">
                <button onClick={start}>Qayta o'ynash</button>
                <Link className="btn secondary" to="/">Bosh menyu</Link>
                <Link className="btn secondary" to="/profile">Profil</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
