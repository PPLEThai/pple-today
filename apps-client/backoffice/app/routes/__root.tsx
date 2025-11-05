import '../app.css'

import React from 'react'

import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

import { RouterContext } from '~/main'

export const Route = createRootRouteWithContext<RouterContext>()({ component: RootLayout })

function RootLayout() {
  return <Outlet />
}
