'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function HomeClient() {
  useEffect(() => {
    logger.info('HomeClient component mounted')
  }, [])

  return null
}
