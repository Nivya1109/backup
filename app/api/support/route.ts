import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/support — public: submit a support ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, category, message } = body

    // Server-side validation
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !category?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (message.trim().length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        subject:  subject.trim(),
        category: category.trim(),
        message:  message.trim(),
        status:   'open',
      },
    })

    return NextResponse.json({ success: true, id: ticket.id }, { status: 201 })
  } catch (error) {
    console.error('Support ticket creation error:', error)
    return NextResponse.json({ error: 'Failed to submit ticket' }, { status: 500 })
  }
}

// GET /api/support — admin only: list all tickets, optionally filtered by status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = request.nextUrl.searchParams.get('status') || ''

    const tickets = await prisma.supportTicket.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Support ticket list error:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}
