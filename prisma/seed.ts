import { PrismaClient, LocationType, Role, WarehouseStatus } from "@prisma/client";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminPasswordHash = await hashPassword(adminPassword);

  const store = await prisma.store.upsert({
    where: { code: "MAIN" },
    update: {},
    create: {
      code: "MAIN",
      name: "Демо организация"
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.OWNER
    },
    create: {
      email: "admin@example.com",
      name: "Администратор",
      passwordHash: adminPasswordHash,
      role: Role.OWNER
    }
  });

  await prisma.storeUser.upsert({
    where: { storeId_userId: { storeId: store.id, userId: user.id } },
    update: { role: Role.OWNER },
    create: { storeId: store.id, userId: user.id, role: Role.OWNER }
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { storeId_code: { storeId: store.id, code: "WH-1" } },
    update: {},
    create: {
      storeId: store.id,
      code: "WH-1",
      name: "Основной склад",
      status: WarehouseStatus.ACTIVE
    }
  });

  const receivingLocation = await prisma.warehouseLocation.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: "RECV-1" } },
    update: {},
    create: {
      storeId: store.id,
      warehouseId: warehouse.id,
      code: "RECV-1",
      barcode: "LOC-RECV-1",
      type: LocationType.RECEIVING,
      isReceivable: true
    }
  });

  const pickingLocation = await prisma.warehouseLocation.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: "A-01-01" } },
    update: {},
    create: {
      storeId: store.id,
      warehouseId: warehouse.id,
      code: "A-01-01",
      barcode: "LOC-A-01-01",
      type: LocationType.PICKING,
      isPickable: true,
      isSellable: true
    }
  });

  await prisma.warehouseWorkTemplate.upsert({
    where: {
      storeId_warehouseId_type_name: {
        storeId: store.id,
        warehouseId: warehouse.id,
        type: "PICK",
        name: "Сборка по ячейкам"
      }
    },
    update: { active: true, priority: 10 },
    create: {
      storeId: store.id,
      warehouseId: warehouse.id,
      type: "PICK",
      name: "Сборка по ячейкам",
      priority: 10
    }
  });

  const defaultReceivingDirective = await prisma.warehouseLocationDirective.findFirst({
    where: {
      storeId: store.id,
      warehouseId: warehouse.id,
      type: "DEFAULT_RECEIVING_LOCATION",
      locationId: receivingLocation.id
    }
  });
  if (!defaultReceivingDirective) {
    await prisma.warehouseLocationDirective.create({
      data: {
        storeId: store.id,
        warehouseId: warehouse.id,
        type: "DEFAULT_RECEIVING_LOCATION",
        name: "Приёмка по умолчанию",
        priority: 1,
        locationId: receivingLocation.id
      }
    });
  }

  const pickDirective = await prisma.warehouseLocationDirective.findFirst({
    where: {
      storeId: store.id,
      warehouseId: warehouse.id,
      type: "PICKABLE_LOCATION",
      locationId: pickingLocation.id
    }
  });
  if (!pickDirective) {
    await prisma.warehouseLocationDirective.create({
      data: {
        storeId: store.id,
        warehouseId: warehouse.id,
        type: "PICKABLE_LOCATION",
        name: "Ячейка сборки по умолчанию",
        priority: 1,
        locationId: pickingLocation.id
      }
    });
  }

  const product = await prisma.product.upsert({
    where: { storeId_sku: { storeId: store.id, sku: "SKU-001" } },
    update: {},
    create: {
      storeId: store.id,
      sku: "SKU-001",
      barcode: "000000000001",
      name: "Тестовый товар"
    }
  });

  const order = await prisma.customerOrder.upsert({
    where: { storeId_number: { storeId: store.id, number: "ORDER-1001" } },
    update: {},
    create: {
      storeId: store.id,
      number: "ORDER-1001",
      lines: {
        create: {
          productId: product.id,
          variantKey: "BASE",
          quantity: 1
        }
      }
    }
  });

  console.log(`Seeded ${store.code}, ${warehouse.code}, ${product.sku}, ${order.number}`);
  console.log("Seed admin: admin@example.com. Password is SEED_ADMIN_PASSWORD or the .env.example default.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
