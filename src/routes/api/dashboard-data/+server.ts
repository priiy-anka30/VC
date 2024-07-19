// /api/dashboard-data/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/database';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { start, end } = await request.json();

    const dateFilter = {};
    if (start && end) {
      dateFilter.createdAt = {
        gte: new Date(start),
        lte: new Date(end)
      };
    }

    const [totalOrders, totalRevenue, activeInstallations, activeServices, orderCategories, recentOrders] = await Promise.all([
      db.stage0.count({ where: dateFilter }),
      db.stage0.aggregate({ 
        _sum: { Total: true },
        where: dateFilter
      }),
      db.installation.count({ 
        where: { 
          ...dateFilter,
          InstReport: { not: null } 
        } 
      }),
      db.service.count({ 
        where: { 
          ...dateFilter,
          ServiceReport: { not: null } 
        } 
      }),
      db.stage0.groupBy({
        by: ['SOCategory'],
        _count: true,
        where: dateFilter
      }),
      db.stage0.findMany({
        where: dateFilter,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          SONumber: true,
          clientName: true,
          Total: true,
          currentStage: true,
          createdAt: true
        }
      })
    ]);

    return json({
      totalOrders,
      totalRevenue: totalRevenue._sum.Total || 0,
      activeInstallations,
      activeServices,
      orderCategories: orderCategories.map(c => ({
        category: c.SOCategory,
        count: c._count,
      })),
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};