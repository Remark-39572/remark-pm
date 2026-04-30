import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Disable client-side Router Cache for dynamic routes so edits made
    // on one page show up immediately when navigating to Timeline /
    // Resources / etc. Static routes can still cache for 3 min.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
}

export default nextConfig
