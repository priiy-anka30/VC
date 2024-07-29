import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/database';

export const POST: RequestHandler = async ({ request }) => {
  const { salesOrderId, username, role, action } = await request.json();

  try {
    const log = await db.activityLog.create({
      data: {
        salesOrderId,
        username,
        role,
        action,
      },
    });

    return json({ success: true, log }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return json({ error: 'Failed to create activity log' }, { status: 500 });
  }
};

