import { Prisma } from "@prisma/client";
import db from "../db.server";
import { payloadHash, webhookEventId } from "./webhooks.server";

function isUniqueConstraint(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function beginWebhook(input: {
  topic: string;
  eventId: string | null;
  shopId?: string | null;
  payload: unknown;
}) {
  const topic = input.topic.slice(0, 128);
  const providerEventId = webhookEventId(input.eventId, input.payload);
  const existing = await db.webhookEvent.findUnique({
    where: { providerEventId_topic: { providerEventId, topic } },
    select: { status: true },
  });
  if (existing?.status === "processed") {
    return { duplicate: true, providerEventId, topic };
  }
  if (!existing) {
    try {
      await db.webhookEvent.create({
        data: {
          shopId: input.shopId ?? null,
          providerEventId,
          topic,
          payloadHash: payloadHash(JSON.stringify(input.payload ?? null)),
          status: "processing",
        },
      });
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
    }
  }
  return { duplicate: false, providerEventId, topic };
}

export async function finishWebhook(providerEventId: string, topic: string) {
  await db.webhookEvent.updateMany({
    where: { providerEventId, topic },
    data: { status: "processed", processedAt: new Date() },
  });
}

export async function handleWebhook(
  input: {
    topic: string;
    eventId: string | null;
    shopId?: string | null;
    payload: unknown;
  },
  work: () => Promise<void>,
) {
  const claim = await beginWebhook(input);
  if (claim.duplicate) return new Response(null, { status: 200 });
  await work();
  await finishWebhook(claim.providerEventId, claim.topic);
  return new Response(null, { status: 200 });
}
