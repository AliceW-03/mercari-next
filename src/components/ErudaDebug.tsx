'use client'

import { useEffect } from 'react'

export function ErudaDebug() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('eruda').then(({ default: eruda }) => {
        eruda.init()
      })
    }
  }, [])

  return null
} 