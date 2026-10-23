import { NextResponse } from 'next/server';
import { auditDeliverability } from '@/lib/deliverability-auditor';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, html, fromEmail } = body;

    const audit = await auditDeliverability(
      subject || '',
      html || '',
      fromEmail || 'pitch@thefounders.co.in'
    );

    return NextResponse.json({
      success: true,
      audit,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
