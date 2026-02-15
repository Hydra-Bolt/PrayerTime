import { React } from 'uebersicht';

export const refreshFrequency = false;

const parseTime = (timeString) => {
  const [h, m] = timeString.split(':').map(Number);
  return { h, m };
};

const DEFAULT_PRAYER_TIMES = [
  { name: 'Fajr', time: '05:28', parsed: parseTime('05:28') },
  { name: 'Dhuhr', time: '12:21', parsed: parseTime('12:21') },
  { name: 'Asr', time: '15:46', parsed: parseTime('15:46') },
  { name: 'Maghrib', time: '18:09', parsed: parseTime('18:09') },
  { name: 'Isha', time: '19:31', parsed: parseTime('19:31') },
];

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const API_TIMING_KEYS = {
  Fajr: 'Fajr',
  Dhuhr: 'Dhuhr',
  Asr: 'Asr',
  Maghrib: 'Maghrib',
  Isha: 'Isha',
};

const FALLBACK_COORDS = {
  latitude: 24.866793937143527,
  longitude: 67.01059830949353,
};

const PRAYER_THEME = {
  Fajr: {
    gradient: 'linear-gradient(135deg, rgba(79, 129, 255, 0.7), rgba(102, 201, 255, 0.5), rgba(40, 80, 160, 0.6))',
    accent: '#80b9ff',
    segment: 'rgba(145, 189, 255, 0.9)',
  },
  Dhuhr: {
    gradient: 'linear-gradient(145deg, rgba(124, 206, 255, 0.7), rgba(85, 164, 255, 0.5), rgba(30, 90, 180, 0.6))',
    accent: '#98d7ff',
    segment: 'rgba(127, 208, 255, 0.95)',
  },
  Asr: {
    gradient: 'linear-gradient(140deg, rgba(255, 198, 96, 0.7), rgba(255, 151, 92, 0.5), rgba(120, 80, 30, 0.6))',
    accent: '#ffd48b',
    segment: 'rgba(255, 194, 112, 0.95)',
  },
  Maghrib: {
    gradient: 'linear-gradient(140deg, rgba(255, 145, 95, 0.7), rgba(255, 114, 153, 0.5), rgba(100, 40, 40, 0.6))',
    accent: '#ffb087',
    segment: 'rgba(255, 160, 126, 0.95)',
  },
  Isha: {
    gradient: 'linear-gradient(145deg, rgba(51, 95, 215, 0.7), rgba(33, 61, 153, 0.5), rgba(15, 25, 60, 0.8))',
    accent: '#8ea8ff',
    segment: 'rgba(136, 163, 255, 0.95)',
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toTwoDigits = (value) => String(value).padStart(2, '0');

const normalizeTimeString = (value) => {
  const raw = String(value || '');
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const h = clamp(Number(match[1]), 0, 23);
  const m = clamp(Number(match[2]), 0, 59);
  return `${toTwoDigits(h)}:${toTwoDigits(m)}`;
};

const isValidTime = (value) => /^\d{2}:\d{2}$/.test(String(value || ''));

const prayerTimesEqual = (a, b) => {
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i].name !== b[i].name || a[i].time !== b[i].time) {
      return false;
    }
  }

  return true;
};

const buildPrayerTimesFromApi = (timings) => {
  const mapped = PRAYER_ORDER.map((name, idx) => {
    const key = API_TIMING_KEYS[name];
    const fallback = DEFAULT_PRAYER_TIMES[idx].time;
    const normalized = normalizeTimeString(timings && timings[key]);
    const finalTime = normalized || fallback;

    return {
      name,
      time: finalTime,
      parsed: parseTime(finalTime),
    };
  });

  if (!mapped.every((p) => isValidTime(p.time))) {
    return DEFAULT_PRAYER_TIMES;
  }

  return mapped;
};

const formatCoords = (latitude, longitude) => {
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat} · ${lon}`;
};

// parseTime moved to top

const atTime = (baseDate, time, dayOffset = 0) => {
  const { h, m } = typeof time === 'string' ? parseTime(time) : time;
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + dayOffset,
    h,
    m,
    0,
    0,
  );
};

const formatTime = (date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  return `${minutes}m`;
};

const getCycleStart = (now, fajr) => {
  const todayFajr = atTime(now, fajr, 0);
  if (now >= todayFajr) {
    return todayFajr;
  }

  return atTime(now, fajr, -1);
};

const buildCycle = (now, prayerTimes = DEFAULT_PRAYER_TIMES, arcSpec) => {
  const times = prayerTimes && prayerTimes.length === 5 ? prayerTimes : DEFAULT_PRAYER_TIMES;

  // Add 90 min padding before Fajr and after Isha for "trough" effect
  const paddingMs = 90 * 60 * 1000;
  
  const cycleStart = getCycleStart(now, times[0].parsed);
  const cycleEnd = atTime(cycleStart, times[0].parsed, 1);
  
  const prayerPoints = times.map((prayer) => ({
    ...prayer,
    date: atTime(cycleStart, prayer.parsed, 0),
  }));

  // Re-calculate visual window
  const visualStart = new Date(prayerPoints[0].date.getTime() - paddingMs);
  const visualEnd = new Date(prayerPoints[4].date.getTime() + paddingMs);
  const visualDuration = visualEnd.getTime() - visualStart.getTime();
  
  const nowMs = now.getTime();
  const vStartMs = visualStart.getTime();
  const visualProgress = clamp((nowMs - vStartMs) / visualDuration, 0, 1);

  let currentPrayer = { name: 'Isha', date: atTime(cycleStart, times[4].parsed, -1) };
  let nextPrayer = prayerPoints[0];

  for (let i = 0; i < prayerPoints.length; i += 1) {
    if (now >= prayerPoints[i].date) {
      currentPrayer = prayerPoints[i];
      nextPrayer = prayerPoints[i + 1] || { name: 'Fajr', date: cycleEnd, time: times[0].time, parsed: times[0].parsed };
    }
  }

  if (now >= prayerPoints[4].date) {
    currentPrayer = prayerPoints[4];
    nextPrayer = { name: 'Fajr', date: cycleEnd, time: times[0].time, parsed: times[0].parsed };
  }

  const pointsWithProgress = prayerPoints.map((prayer) => {
    const progress = clamp((prayer.date.getTime() - vStartMs) / visualDuration, 0, 1);
    const pos = arcSpec ? getWavePos(arcSpec.cx, arcSpec.cy, arcSpec.rx, arcSpec.ry, progress) : null;
    return {
      ...prayer,
      progress,
      pos,
    };
  });

  const currentIndex = times.findIndex((p) => p.name === currentPrayer.name);
  const nextIndex = nextPrayer.name === 'Fajr' ? pointsWithProgress.length : times.findIndex((p) => p.name === nextPrayer.name);

  return {
    currentPrayer,
    nextPrayer,
    countdownMs: nextPrayer.date.getTime() - nowMs,
    progress: visualProgress,
    sunPos: arcSpec ? getWavePos(arcSpec.cx, arcSpec.cy, arcSpec.rx, arcSpec.ry, visualProgress) : null,
    points: pointsWithProgress,
    segmentStart: currentIndex < 0 ? 0 : pointsWithProgress[currentIndex].progress,
    segmentEnd:
      nextIndex >= pointsWithProgress.length
        ? 1
        : pointsWithProgress[nextIndex].progress,
  };
};

const getWavePos = (cx, cy, rx, ry, progress) => {
  const x = cx - rx + (progress * 2 * rx);
  // Standard trough-to-trough sine wave.
  // The "windowing" logic in buildCycle now handles the sunrise/sunset positioning.
  const y = cy - ry * Math.sin((progress * 2 * Math.PI) - (Math.PI / 2));
  return { x, y };
};

const buildWavePath = (cx, cy, rx, ry, startP, endP) => {
  const points = [];
  const steps = 30;
  for (let i = 0; i <= steps; i += 1) {
    const p = startP + (i / steps) * (endP - startP);
    const pos = getWavePos(cx, cy, rx, ry, p);
    points.push(`${pos.x},${pos.y}`);
  }
  return `M ${points.join(' L ')}`;
};

const wavePosition = (progress, spec) => {
  return getWavePos(spec.cx, spec.cy, spec.rx, spec.ry, progress);
};

class PrayerArcWidget extends React.PureComponent {
  constructor(props) {
    super(props);

    const now = new Date();
    const arc = {
      cx: 185,
      cy: 170,
      rx: 185,
      ry: 50,
    };

    const cycle = buildCycle(now, DEFAULT_PRAYER_TIMES, arc);

    this.state = {
      now,
      cycle,
      prayerTimes: DEFAULT_PRAYER_TIMES,
      locationLabel: 'Locating…',
      dataSource: 'Fallback',
      lastSyncAt: null,
    };

    this.arc = arc;
    this.baseArc = buildWavePath(arc.cx, arc.cy, arc.rx, arc.ry, 0, 1);

    this.lastSecond = now.getSeconds();
    this.lastCoords = null;
    this.lastFetchedCoords = null;
    this.lastPrayerFetchAt = 0;
    this.prayerFetchController = null;

    this.tick = this.tick.bind(this);
    this.startLocationWatch = this.startLocationWatch.bind(this);
    this.onLocationUpdate = this.onLocationUpdate.bind(this);
    this.refreshPrayerTimes = this.refreshPrayerTimes.bind(this);
  }

  componentDidMount() {
    this.clock = setInterval(this.tick, 60 * 1000);
    this.tick();
    this.startLocationWatch();

    this.locationFallbackTimeout = setTimeout(() => {
      if (!this.lastCoords) {
        this.lastCoords = FALLBACK_COORDS;
        this.setState({
          locationLabel: `Fallback ${formatCoords(FALLBACK_COORDS.latitude, FALLBACK_COORDS.longitude)}`,
        });
        this.refreshPrayerTimes(FALLBACK_COORDS);
      }
    }, 5000);

    this.prayerRefreshClock = setInterval(() => {
      if (this.lastCoords) {
        this.refreshPrayerTimes(this.lastCoords);
      }
    }, 15 * 60 * 1000);

  }

  componentWillUnmount() {
    clearInterval(this.clock);
    clearInterval(this.prayerRefreshClock);
    clearTimeout(this.locationFallbackTimeout);

    if (this.geoProvider && this.geoWatchId !== undefined && this.geoWatchId !== null) {
      this.geoProvider.clearWatch(this.geoWatchId);
    }

    if (this.prayerFetchController) {
      this.prayerFetchController.abort();
    }
  }

  tick() {
    const now = new Date();
    const cycle = buildCycle(now, this.state.prayerTimes, this.arc);

    this.setState({
      now,
      cycle,
    });
  }

  startLocationWatch() {
    const geo =
      (typeof window !== 'undefined' && window.geolocation)
      || (typeof navigator !== 'undefined' && navigator.geolocation)
      || null;

    if (!geo) {
      this.setState({
        locationLabel: 'Location unavailable',
        dataSource: 'Fallback',
      });
      return;
    }

    this.geoProvider = geo;

    const geoOptions = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    };

    geo.getCurrentPosition(
      this.onLocationUpdate,
      () => {
        this.setState({
          locationLabel: 'Location permission needed',
          dataSource: 'Fallback',
        });
      },
      geoOptions,
    );

    if (typeof geo.watchPosition === 'function') {
      this.geoWatchId = geo.watchPosition(
        this.onLocationUpdate,
        () => {
          this.setState({
            locationLabel: 'Location permission needed',
            dataSource: 'Fallback',
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 2 * 60 * 1000,
        },
      );
    }
  }

  onLocationUpdate(position) {
    if (!position || !position.coords) {
      return;
    }

    const latitude = Number(position.coords.latitude);
    const longitude = Number(position.coords.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const coords = { latitude, longitude };
    this.lastCoords = coords;
    clearTimeout(this.locationFallbackTimeout);

    this.setState({
      locationLabel: formatCoords(latitude, longitude),
    });

    const movedEnough =
      !this.lastFetchedCoords
      || Math.abs(this.lastFetchedCoords.latitude - latitude) > 0.01
      || Math.abs(this.lastFetchedCoords.longitude - longitude) > 0.01;

    const staleData = Date.now() - this.lastPrayerFetchAt > 10 * 60 * 1000;

    if (movedEnough || staleData) {
      this.refreshPrayerTimes(coords);
    }
  }

  refreshPrayerTimes(coords) {
    if (!coords) {
      return;
    }

    if (this.prayerFetchController) {
      this.prayerFetchController.abort();
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.prayerFetchController = controller;

    const url =
      `https://api.aladhan.com/v1/timings?latitude=${coords.latitude}&longitude=${coords.longitude}&method=2&school=1`;

    fetch(url, controller ? { signal: controller.signal } : undefined)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        if (!payload || payload.code !== 200 || !payload.data || !payload.data.timings) {
          throw new Error('Invalid prayer API response');
        }

        const prayerTimes = buildPrayerTimesFromApi(payload.data.timings);
        const now = new Date();
        const cycle = buildCycle(now, prayerTimes, this.arc);

        this.lastFetchedCoords = coords;
        this.lastPrayerFetchAt = Date.now();
        this.setState((prev) => ({
          now,
          cycle,
          prayerTimes: prayerTimesEqual(prev.prayerTimes, prayerTimes)
            ? prev.prayerTimes
            : prayerTimes,
          dataSource: 'Live',
          lastSyncAt: now,
          locationLabel:
            payload.data.meta && payload.data.meta.timezone
              ? payload.data.meta.timezone
              : prev.locationLabel,
        }));
      })
      .catch((error) => {
        if (error && error.name === 'AbortError') {
          return;
        }

        this.setState({
          dataSource: 'Fallback',
        });
      });
  }

  render() {
    const {
      cycle,
      locationLabel,
      dataSource,
      lastSyncAt,
    } = this.state;
    const theme = PRAYER_THEME[cycle.currentPrayer.name] || PRAYER_THEME.Fajr;
    const { sunPos } = cycle;

    const activeSegment = buildWavePath(
      this.arc.cx,
      this.arc.cy,
      this.arc.rx,
      this.arc.ry,
      cycle.segmentStart,
      cycle.segmentEnd,
    );

    return (
      <div className="prayer-widget" style={{ backgroundImage: theme.gradient }}>
        <div className="glass-reflection" />
        
        <div className="header-info">
          <div className="status-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7l-5 5h10l-5-5z M5 13h14v2H5z M12 21l5-5H7l5 5z" />
            </svg>
            NEXT: {cycle.nextPrayer.name}
          </div>
          <div className="main-time">
            {formatTime(cycle.nextPrayer.date).replace(/ /g, '')}
          </div>
        </div>

        <svg className="arc-canvas" viewBox="0 0 370 320" preserveAspectRatio="none" role="img">
          <defs>
            <filter id="sunGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="darkOverlay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0.35)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
            </linearGradient>
          </defs>

          {/* Darkness area below horizon */}
          <rect x="0" y="195" width="370" height="125" fill="url(#darkOverlay)" rx="5" />
          
          <line x1="0" y1="195" x2="370" y2="195" className="horizon-line" />
          
          {/* Sunrise/Sunset Labels - Approx 16% and 83% of visual window */}
          <text x="35" y="188" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.55)" letterSpacing="0.1em">SUNRISE</text>
          <text x="310" y="188" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.55)" letterSpacing="0.1em">SUNSET</text>

          <path d={this.baseArc} className="arc-track" />
          <path d={activeSegment} className="arc-active" style={{ stroke: theme.segment }} />

          {cycle.points.map((point) => {
            const { pos } = point;
            const isActive = point.name === cycle.currentPrayer.name;
            return (
              <circle
                key={point.name}
                cx={pos.x}
                cy={pos.y}
                r={isActive ? 4 : 3}
                className={isActive ? 'prayer-dot prayer-dot-active' : 'prayer-dot'}
                style={isActive ? { fill: theme.accent } : null}
              />
            );
          })}

          <circle cx={sunPos.x} cy={sunPos.y} r="8" className="sun-core" style={{ fill: '#fff' }} filter="url(#sunGlow)" />
        </svg>

        <div className="footer-info">
          <div className="current-namaz">{cycle.currentPrayer.name}: {formatTime(cycle.currentPrayer.date)}</div>
          <div className="countdown-text">
            {formatCountdown(cycle.countdownMs)} remaining
          </div>
        </div>
        
        <div className="status-overlay">
          <span>{locationLabel} · {dataSource}</span>
        </div>
      </div>
    );
  }
}

export const render = () => <PrayerArcWidget />;

export const className = `
  top: 50%;
  left: 24px;
  transform: translateY(-50%);

  .prayer-widget {
    width: 370px;
    box-sizing: border-box;
    padding: 30px 28px 22px;
    color: #fff;
    border-radius: 38px;
    position: relative;
    overflow: hidden;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.28);
    backdrop-filter: blur(45px) saturate(190%);
    -webkit-backdrop-filter: blur(45px) saturate(190%);
    box-shadow:
      0 30px 60px rgba(0, 0, 0, 0.35),
      inset 0 1px 1px rgba(255, 255, 255, 0.35);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif;
  }

  .glass-reflection {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.15) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      transparent 100%
    );
    pointer-events: none;
  }

  .header-info {
    margin-bottom: 5px;
    position: relative;
    z-index: 1;
  }

  .status-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    opacity: 0.85;
    text-transform: uppercase;
  }

  .main-time {
    font-size: 40px;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 8px 0;
  }

  .arc-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: block;
    z-index: 0;
  }

  .horizon-line {
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 1.5;
  }

  .arc-track {
    fill: none;
    stroke: rgba(255, 255, 255, 0.15);
    stroke-width: 5;
    stroke-linecap: round;
  }

  .arc-active {
    fill: none;
    stroke-width: 5;
    stroke-linecap: round;
  }

  .prayer-dot {
    fill: rgba(255, 255, 255, 0.3);
  }

  .prayer-dot-active {
    fill: #fff;
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
  }

  .sun-core {
    stroke: rgba(255, 255, 255, 0.8);
    stroke-width: 1;
  }

  .footer-info {
    margin-top: 4px;
    position: relative;
    z-index: 1;
    margin-top: 140px; /* Space for the arc track in the middle */
  }

  .current-namaz {
    font-size: 18px;
    font-weight: 600;
    opacity: 0.9;
  }

  .countdown-text {
    font-size: 12px;
    font-weight: 500;
    opacity: 0.65;
    margin-top: 3px;
  }

  .status-overlay {
    margin-top: 18px;
    font-size: 10px;
    opacity: 0.4;
    text-align: center;
    letter-spacing: 0.02em;
    position: relative;
    z-index: 1;
  }

`;
