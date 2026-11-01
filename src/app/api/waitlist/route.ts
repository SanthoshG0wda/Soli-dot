import { NextResponse } from "next/server";
import { z } from "zod";

const submissionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  firm: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(100),
  practiceArea: z.string().trim().max(120).optional(),
  teamSize: z.enum(["1", "2–10", "11–50", "51+"]),
});

const submissions: Array<z.infer<typeof submissionSchema> & { receivedAt: string }> = [];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please complete all required fields with valid details." }, { status: 400 });
  // shortcut: runtime-only placeholder storage; replace with the production CRM or database before deploying.
  submissions.push({ ...parsed.data, receivedAt: new Date().toISOString() });
  return NextResponse.json({ message: "Thank you. We will be in touch about early access." }, { status: 201 });
}
