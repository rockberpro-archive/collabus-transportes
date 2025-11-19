import { defineEventHandler, getRouterParam, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const routeId = getRouterParam(event, 'id')

    if (!routeId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Route ID is required',
      })
    }

    // Buscar a rota com seus stops ordenados
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        stops: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!route) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Route not found',
      })
    }

    return {
      id: route.id,
      code: route.code,
      origin: route.origin,
      destination: route.destination,
      state: route.state,
      city: route.city,
      geoJson: route.geoJson,
      isActive: route.isActive,
      stops: route.stops,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    console.error('Error fetching route stops:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch route stops',
    })
  }
})
