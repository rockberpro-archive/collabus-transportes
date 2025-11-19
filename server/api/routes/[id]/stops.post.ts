import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação
    const session = await getUserSession(event)
    
    if (!session?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }

    const user = session.user as any

    // Verificar se o usuário é SUPERVISOR ou ADMINISTRADOR
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!currentUser || (currentUser.role !== 'SUPERVISOR' && currentUser.role !== 'ADMINISTRADOR')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only supervisors and administrators can edit routes',
      })
    }

    const routeId = getRouterParam(event, 'id')

    if (!routeId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Route ID is required',
      })
    }

    const body = await readBody(event)
    const { geoJson, stops } = body

    if (!geoJson || !stops || !Array.isArray(stops)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'GeoJSON and stops array are required',
      })
    }

    // Validar que há pelo menos 2 stops
    if (stops.length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least 2 stops are required',
      })
    }

    // Validar estrutura dos stops
    for (const stop of stops) {
      if (!stop.name || typeof stop.latitude !== 'number' || typeof stop.longitude !== 'number' || typeof stop.order !== 'number') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid stop data. Each stop must have name, latitude, longitude, and order',
        })
      }
    }

    // Usar transação para atualizar a rota e os stops
    const result = await prisma.$transaction(async (tx) => {
      // Atualizar a rota com o geoJson
      const updatedRoute = await tx.route.update({
        where: { id: routeId },
        data: {
          geoJson: geoJson,
        },
      })

      // Deletar os stops antigos
      await tx.stop.deleteMany({
        where: { routeId },
      })

      // Criar os novos stops
      const createdStops = await Promise.all(
        stops.map((stop) =>
          tx.stop.create({
            data: {
              name: stop.name,
              latitude: stop.latitude,
              longitude: stop.longitude,
              order: stop.order,
              routeId,
            },
          })
        )
      )

      return {
        route: updatedRoute,
        stops: createdStops,
      }
    })

    // Retornar a rota atualizada com os stops
    const routeWithStops = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        stops: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    return routeWithStops
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    console.error('Error saving route stops:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save route stops',
    })
  }
})
