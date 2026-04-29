import type { Request, Response, NextFunction } from 'express'

type RateLimitOptions = {
  keyPrefix: string
  maxRequests: number
  windowMs: number
}

type RateLimitBucket = {
  count: number
  expiresAt: number
}

const buckets = new Map<string, RateLimitBucket>()

const getClientIp = (req: Request): string => {
  // CF-Connecting-IP is the real visitor IP set by Cloudflare —
  // always prefer this over x-forwarded-for in CF-proxied deployments
  const cfIp = req.headers['cf-connecting-ip']
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim()
  }

  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].trim()
  }

  return req.ip || 'unknown'
}

const pruneExpiredBuckets = (now: number) => {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.expiresAt <= now) {
      buckets.delete(key)
    }
  }
}

export const createRateLimit = ({
  keyPrefix,
  maxRequests,
  windowMs,
}: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()
    pruneExpiredBuckets(now)

    const key = `${keyPrefix}:${getClientIp(req)}`
    const current = buckets.get(key)

    if (!current || current.expiresAt <= now) {
      buckets.set(key, { count: 1, expiresAt: now + windowMs })
      res.setHeader('X-RateLimit-Limit', String(maxRequests))
      res.setHeader('X-RateLimit-Remaining', String(maxRequests - 1))
      return next()
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.expiresAt - now) / 1000)
      )
      res.setHeader('Retry-After', String(retryAfterSeconds))
      res.setHeader('X-RateLimit-Limit', String(maxRequests))
      res.setHeader('X-RateLimit-Remaining', '0')
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }

    current.count += 1
    buckets.set(key, current)
    res.setHeader('X-RateLimit-Limit', String(maxRequests))
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, maxRequests - current.count))
    )
    next()
  }
}