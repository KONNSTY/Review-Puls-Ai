import { Session } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import type { PrismaClient } from "@prisma/client";
import prisma from "../db.server";
import { openToken, sealToken, tokenNeedsSeal } from "./secrets.server";

function sealOnlineUser(session: Session) {
  const user = session.onlineAccessInfo?.associated_user;
  if (!user) return;
  if (user.email) user.email = sealToken(user.email);
  if (user.first_name) user.first_name = sealToken(user.first_name);
  if (user.last_name) user.last_name = sealToken(user.last_name);
}

function revealOnlineUser(session: Session) {
  const user = session.onlineAccessInfo?.associated_user;
  if (!user) return false;
  let migrated = false;
  for (const field of ["email", "first_name", "last_name"] as const) {
    const value = user[field];
    if (!value) continue;
    if (tokenNeedsSeal(value)) migrated = true;
    user[field] = openToken(value);
  }
  return migrated;
}

function revealSession(session: Session) {
  let migrated = revealOnlineUser(session);
  if (session.accessToken) {
    if (tokenNeedsSeal(session.accessToken)) migrated = true;
    session.accessToken = openToken(session.accessToken);
  }
  if (session.refreshToken) {
    if (tokenNeedsSeal(session.refreshToken)) migrated = true;
    session.refreshToken = openToken(session.refreshToken);
  }
  return migrated;
}

export class EncryptingPrismaSessionStorage extends PrismaSessionStorage<PrismaClient> {
  constructor() {
    super(prisma);
  }

  override async storeSession(session: Session): Promise<boolean> {
    const copy = Session.fromPropertyArray(session.toPropertyArray(true), true);
    if (copy.accessToken) copy.accessToken = sealToken(copy.accessToken);
    if (copy.refreshToken) copy.refreshToken = sealToken(copy.refreshToken);
    sealOnlineUser(copy);
    return super.storeSession(copy);
  }

  override async loadSession(id: string): Promise<Session | undefined> {
    const session = await super.loadSession(id);
    if (!session) return undefined;
    if (revealSession(session)) await this.storeSession(session);
    return session;
  }

  override async findSessionsByShop(shop: string): Promise<Session[]> {
    const sessions = await super.findSessionsByShop(shop);
    for (const session of sessions) {
      if (revealSession(session)) await this.storeSession(session);
    }
    return sessions;
  }
}
