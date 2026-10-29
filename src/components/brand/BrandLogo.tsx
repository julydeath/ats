import Image from 'next/image'

import { BRAND } from '@/lib/constants/brand'

type BrandLogoProps = {
  className?: string
  /** Rendered height in px; width follows the logo's aspect ratio. */
  height: number
  priority?: boolean
  variant?: 'default' | 'onDark' | 'mark'
}

const ASSETS = {
  default: BRAND.logo,
  mark: BRAND.mark,
  onDark: BRAND.logoOnDark,
} as const

export function BrandLogo({ className, height, priority = false, variant = 'default' }: BrandLogoProps) {
  const asset = ASSETS[variant]
  const width = Math.round((asset.width / asset.height) * height)

  return (
    <Image
      alt={`${BRAND.productName} logo`}
      className={className}
      height={height}
      priority={priority}
      sizes={`${width}px`}
      src={asset.src}
      width={width}
    />
  )
}
