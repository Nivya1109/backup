'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react'

const CATEGORIES = [
  'Bug Report',
  'Search Issue',
  'Missing Library',
  'Feature Request',
  'General Question',
]

interface FormState {
  name: string
  email: string
  subject: string
  category: string
  message: string
}

const EMPTY_FORM: FormState = { name: '', email: '', subject: '', category: '', message: '' }

export default function SupportPage() {
  const [form, setForm]     = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  function validate(): Partial<FormState> {
    const e: Partial<FormState> = {}
    if (!form.name.trim())                                    e.name     = 'Name is required'
    if (!form.email.trim())                                   e.email    = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email    = 'Enter a valid email address'
    if (!form.category)                                       e.category = 'Please select a category'
    if (!form.subject.trim())                                 e.subject  = 'Subject is required'
    if (!form.message.trim())                                 e.message  = 'Message is required'
    else if (form.message.trim().length < 10)                 e.message  = 'Message must be at least 10 characters'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setStatus('submitting')
    try {
      const res = await fetch('/api/support', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submit failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  if (status === 'success') {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Request Submitted!</h1>
        <p className="text-muted-foreground mb-6">
          Thanks for reaching out. We read every submission and will follow up if needed.
        </p>
        <button
          onClick={() => { setForm(EMPTY_FORM); setStatus('idle') }}
          className="text-sm text-primary hover:underline"
        >
          Submit another request
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Support</h1>
        </div>
        <p className="text-muted-foreground">
          Report a bug, request a missing library, or send feedback. We read every submission.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit a Request</CardTitle>
          <CardDescription>All fields are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" value={form.name} onChange={set('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="Brief summary of your request" value={form.subject} onChange={set('subject')} />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                rows={5}
                placeholder="Describe your issue or request in detail…"
                value={form.message}
                onChange={set('message')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>

            {/* API error */}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Something went wrong. Please try again.
              </div>
            )}

            <Button type="submit" disabled={status === 'submitting'} className="w-full">
              {status === 'submitting' ? 'Submitting…' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
