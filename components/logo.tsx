import React from 'react'

interface LogoProps {
  className?: string
  variant?: 'icon' | 'full'
}

export function Logo({ className = 'h-8 w-8', variant = 'full' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <div className={`overflow-hidden relative rounded-lg ${className}`}>
        <img
          src="/logo.png"
          className="absolute inset-x-0 top-0 w-full h-[162%] object-cover object-top scale-105 origin-top"
          alt="Tatami Icon"
        />
      </div>
    )
  }

  return (
    <img
      src="/logo.png"
      className={`${className} object-contain`}
      alt="Tatami Logo"
    />
  )
}
