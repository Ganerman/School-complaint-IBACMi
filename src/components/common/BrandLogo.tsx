import schoolLogo from '../../assets/branding/ibacmi-logo.png'

export function BrandLogo({ className = 'h-14 w-14' }: { className?: string }) {
  return <img src={schoolLogo} alt="IBA College of Mindanao, Inc. logo" className={`${className} object-cover object-center`} />
}
