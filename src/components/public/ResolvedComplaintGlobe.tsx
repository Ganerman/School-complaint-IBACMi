import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { campusMomentService } from '../../services/campusMomentService'
import ibaLogo from '../../assets/branding/ibacmi-logo.png'
import ceilingLeak from '../../assets/complaints/ceiling-leak.png'
import maintenanceResponse from '../../assets/complaints/maintenance-response.png'
import studentReport from '../../assets/complaints/student-report.png'
import studentTeacherConcern from '../../assets/complaints/student-teacher-concern.png'

const showcaseImages = [
  { src: maintenanceResponse, alt: 'Maintenance staff completing a campus repair' },
  { src: ceilingLeak, alt: 'Campus classroom facility concern' },
  { src: studentReport, alt: 'A student documenting a facility concern' },
  { src: studentTeacherConcern, alt: 'A student concern being addressed' },
]

const rings = [
  { latitude: -60, count: 5, offset: 18 },
  { latitude: -30, count: 9, offset: 0 },
  { latitude: 0, count: 11, offset: 16 },
  { latitude: 30, count: 9, offset: 0 },
  { latitude: 60, count: 5, offset: 18 },
]

export function CampusMomentsGlobe() {
  const [images, setImages] = useState(showcaseImages)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const showcase = useRef<HTMLElement>(null)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', updateMotion)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    if (showcase.current) observer.observe(showcase.current)
    return () => {
      preference.removeEventListener('change', updateMotion)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    let active = true
    void campusMomentService.listPublished().then(({ data }) => {
      if (active && data?.length) {
        setImages(data.map(moment => ({ src: moment.image_url || '', alt: moment.title })))
      }
    }).catch(() => { /* Keep the local gallery available when the connection fails. */ })
    return () => { active = false }
  }, [])

  const tiles = useMemo(() => rings.flatMap((ring, ringIndex) =>
    Array.from({ length: ring.count }, (_, index) => ({
      ...images[(index + ringIndex) % images.length],
      angle: (360 / ring.count) * index + ring.offset,
      latitude: ring.latitude,
      scale: Math.abs(ring.latitude) === 60 ? .8 : 1,
      key: `${ringIndex}-${index}`,
    }))), [images])

  return (
    <figure ref={showcase} className="campus-showcase" aria-labelledby="campus-globe-title">
      <div className="campus-showcase__eyebrow">
        <span><i aria-hidden="true" /> The IBA community</span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </div>
      <div className="campus-showcase__stage" style={{ '--campus-motion-state': paused || reducedMotion || !visible ? 'paused' : 'running' } as CSSProperties}>
        <img className="campus-showcase__watermark" src={ibaLogo} alt="" aria-hidden="true" draggable={false} decoding="async" />
        <div className="campus-showcase__halo" aria-hidden="true" />
        <div className="campus-showcase__meridian" aria-hidden="true" />
        <div className="campus-showcase__orbit" aria-hidden="true"><i /></div>
        <div className="campus-showcase__shadow" aria-hidden="true" />
        <div className="campus-globe" aria-hidden="true">
        {tiles.map((tile, index) => (
          <figure
            className="campus-globe__tile"
            key={tile.key}
            style={{
              '--tile-position': `rotateY(${tile.angle}deg) rotateX(${tile.latitude}deg) translateZ(var(--globe-radius)) scale(${tile.scale})`,
            } as CSSProperties}
          >
            <img src={tile.src} alt="" loading={index < 14 ? 'eager' : 'lazy'} decoding="async" />
          </figure>
        ))}
        </div>
      </div>
      <figcaption className="campus-showcase__caption">
        <div>
          <span>Campus moments</span>
          <h2 id="campus-globe-title">A community that cares.</h2>
          <p>Every moment, part of a better campus.</p>
        </div>
        <button
          type="button"
          className="campus-showcase__motion"
          onClick={() => setPaused(value => !value)}
          aria-label={paused ? 'Resume globe rotation' : 'Pause globe rotation'}
          aria-pressed={paused}
          hidden={reducedMotion}
          title={paused ? 'Resume rotation' : 'Pause rotation'}
        >
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
      </figcaption>
    </figure>
  )
}
