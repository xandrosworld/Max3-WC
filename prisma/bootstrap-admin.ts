import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { prisma } from "../src/lib/prisma";

const config = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9._]+$/)
      .transform((value) => value.toLowerCase()),
    password: z.string().min(12).max(128),
    name: z.string().trim().min(2).max(100),
    department: z.string().trim().max(100).default("Ban tổ chức"),
  })
  .parse({
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME,
    department: process.env.ADMIN_DEPARTMENT,
  });

async function main() {
  const email = `${config.username}@internal.local`;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username: config.username }] },
  });

  if (existing) {
    console.log(`Admin @${config.username} đã tồn tại; không thay đổi dữ liệu.`);
    return;
  }

  const userId = randomUUID();
  const password = await hashPassword(config.password);
  await prisma.user.create({
    data: {
      id: userId,
      email,
      emailVerified: true,
      username: config.username,
      displayUsername: config.username,
      name: config.name,
      department: config.department,
      role: "admin",
      mustChangePassword: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password,
        },
      },
    },
  });

  console.log(`Đã tạo admin @${config.username}. Đăng nhập và đổi mật khẩu ngay.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
