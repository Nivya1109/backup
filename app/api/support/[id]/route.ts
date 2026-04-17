import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = ['open', 'in_progress', 'resolved']

// PATCH /api/support/[id] — admin only: update ticket status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: params.id },
      data:  { status },
    })

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('Support ticket update error:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}
