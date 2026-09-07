import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Camera, Sparkles } from 'lucide-react'
import { campusMomentService } from '../../services/campusMomentService'
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
  { latitude: -46, count: 7, offset: 12 },
  { latitude: -17, count: 9, offset: -8 },
  { latitude: 17, count: 9, offset: 8 },
  { latitude: 46, count: 7, offset: -12 },
]

export function CampusMomentsGlobe() {
  const [images, setImages] = useState(showcaseImages)

  useEffect(() => {
    let active = true
    void campusMomentService.listPublished().then(({ data }) => {
      if (active && data?.length) {
        setImages(data.map(moment => ({ src: moment.image_url || '', alt: moment.title })))
      }
    })
    return () => { active = false }
  }, [])

  const tiles = useMemo(() => rings.flatMap((ring, ringIndex) =>
    Array.from({ length: ring.count }, (_, index) => ({
      ...images[(index + ringIndex) % images.length],
      angle: (360 / ring.count) * index + ring.offset,
      latitude: ring.latitude,
      key: `${ringIndex}-${index}`,
    }))), [images])

  return (
    <div className="resolved-showcase" aria-label="Rotating gallery of campus life and school events">
      <div className="resolved-showcase__halo" aria-hidden="true" />
      <div className="resolved-showcase__orbit resolved-showcase__orbit--one" aria-hidden="true" />
      <div className="resolved-showcase__orbit resolved-showcase__orbit--two" aria-hidden="true" />

      <div className="resolved-globe" aria-hidden="true">
        {tiles.map((tile, index) => (
          <figure
            className="resolved-globe__tile"
            key={tile.key}
            style={{
              '--tile-position': `rotateY(${tile.angle}deg) rotateX(${tile.latitude}deg) translateZ(var(--globe-radius))`,
            } as CSSProperties}
          >
            <img src={tile.src} alt="" loading={index < 10 ? 'eager' : 'lazy'} />
            <span title={tile.alt}><Camera size={11} /> {tile.alt}</span>
          </figure>
        ))}
      </div>

      <div className="resolved-showcase__caption">
        <span><Sparkles size={14} /> Campus moments</span>
        <strong>Life at IBA, in motion</strong>
        <small>IBA College of Mindanao, Inc.</small>
      </div>
    </div>
  )
}
