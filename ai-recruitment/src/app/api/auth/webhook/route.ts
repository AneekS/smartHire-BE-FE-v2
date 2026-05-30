import { NextResponse } from "next/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantId } from "@/lib/tenant-context";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);
  let event: WebhookEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const tenantId = await resolveTenantId();

  if (event.type === "user.created" || event.type === "user.updated") {
    const data = event.data;
    const clerkId = data.id;
    const email =
      data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
        ?.email_address ?? data.email_addresses?.[0]?.email_address;

    if (!email) {
      return NextResponse.json({ error: "No email on user" }, { status: 400 });
    }

    const name =
      [data.first_name, data.last_name].filter(Boolean).join(" ") ||
      email.split("@")[0];

    const user = await prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        email,
        name,
        image: data.image_url ?? null,
        tenantId,
      },
      update: {
        email,
        name,
        image: data.image_url ?? null,
        tenantId,
      },
    });

    const existingCandidate = await prisma.candidate.findUnique({
      where: { userId: user.id },
    });

    if (!existingCandidate) {
      const candidate = await prisma.candidate.create({
        data: {
          userId: user.id,
          email,
          name,
          tenantId,
        },
      });
      await prisma.profilePrivacy.create({ data: { candidateId: candidate.id } });
    } else {
      await prisma.candidate.update({
        where: { id: existingCandidate.id },
        data: { email, name, tenantId },
      });
    }
  }

  if (event.type === "user.deleted") {
    const clerkId = event.data.id;
    await prisma.user.deleteMany({ where: { clerkId } });
  }

  return NextResponse.json({ received: true });
}
