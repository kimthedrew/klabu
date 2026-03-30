-- CreateTable
CREATE TABLE "users" (
    "id" STRING NOT NULL,
    "email" STRING NOT NULL,
    "password" STRING NOT NULL,
    "role" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resetToken" STRING,
    "resetTokenExpiry" TIMESTAMP(3),
    "pendingPasswordReset" BOOL NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stall_owners" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "fullName" STRING NOT NULL,
    "businessName" STRING,
    "phoneNumber" STRING NOT NULL,
    "photo" STRING,
    "stallPhoto" STRING,
    "paymentMode" STRING,
    "mpesaNumber" STRING,
    "tillNumber" STRING,
    "isApproved" BOOL NOT NULL DEFAULT false,
    "isActive" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stall_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_persons" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "fullName" STRING NOT NULL,
    "phoneNumber" STRING NOT NULL,
    "idNumber" STRING NOT NULL,
    "photo" STRING,
    "isApproved" BOOL NOT NULL DEFAULT false,
    "isActive" BOOL NOT NULL DEFAULT false,
    "rating" FLOAT8 NOT NULL DEFAULT 5.0,
    "totalDeliveries" INT4 NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stalls" (
    "id" STRING NOT NULL,
    "stallOwnerId" STRING NOT NULL,
    "name" STRING NOT NULL,
    "description" STRING,
    "isActive" BOOL NOT NULL DEFAULT true,
    "averageRating" FLOAT8 NOT NULL DEFAULT 0,
    "reviewCount" INT4 NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stalls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" STRING NOT NULL,
    "stallId" STRING NOT NULL,
    "name" STRING NOT NULL,
    "description" STRING,
    "price" FLOAT8 NOT NULL,
    "image" STRING,
    "isAvailable" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" STRING NOT NULL,
    "stallId" STRING NOT NULL,
    "customerName" STRING NOT NULL,
    "customerPhone" STRING NOT NULL,
    "deliveryLocation" STRING NOT NULL,
    "roomNumber" STRING,
    "totalAmount" FLOAT8 NOT NULL,
    "deliveryFee" FLOAT8 NOT NULL,
    "status" STRING NOT NULL DEFAULT 'PENDING',
    "mpesaPayerName" STRING,
    "paymentStatus" STRING NOT NULL DEFAULT 'PENDING',
    "deliveryPersonId" STRING,
    "deliveryStatus" STRING NOT NULL DEFAULT 'PENDING',
    "deliveryAcceptedAt" TIMESTAMP(3),
    "deliveryCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" STRING NOT NULL,
    "orderId" STRING NOT NULL,
    "menuItemId" STRING NOT NULL,
    "quantity" INT4 NOT NULL,
    "price" FLOAT8 NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" STRING NOT NULL,
    "orderId" STRING NOT NULL,
    "deliveryPersonId" STRING NOT NULL,
    "status" STRING NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_assignments" (
    "id" STRING NOT NULL,
    "orderId" STRING NOT NULL,
    "deliveryPersonId" STRING NOT NULL,
    "status" STRING NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_rejections" (
    "id" STRING NOT NULL,
    "assignmentId" STRING NOT NULL,
    "reason" STRING NOT NULL,
    "rejectedBy" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_rejections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" STRING NOT NULL,
    "orderId" STRING,
    "stallId" STRING,
    "deliveryId" STRING,
    "rating" INT4 NOT NULL,
    "comment" STRING NOT NULL,
    "reviewerName" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" STRING NOT NULL,
    "orderId" STRING NOT NULL,
    "amount" FLOAT8 NOT NULL,
    "mpesaCode" STRING,
    "status" STRING NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "merchantRequestID" STRING,
    "checkoutRequestID" STRING,
    "resultCode" INT4,
    "resultDesc" STRING,
    "mpesaReceiptNumber" STRING,
    "transactionDate" STRING,
    "paymentMethod" STRING NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" STRING NOT NULL,
    "entityType" STRING NOT NULL,
    "entityId" STRING NOT NULL,
    "sourceType" STRING NOT NULL,
    "sourceId" STRING NOT NULL,
    "direction" STRING NOT NULL,
    "amount" FLOAT8 NOT NULL,
    "status" STRING NOT NULL DEFAULT 'OPEN',
    "notes" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "clearedBy" STRING,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_config" (
    "id" STRING NOT NULL DEFAULT 'singleton',
    "stkPushEnabled" BOOL NOT NULL DEFAULT false,
    "deliveryFee" FLOAT8 NOT NULL DEFAULT 50,
    "deliveryFeeNote" STRING,

    CONSTRAINT "payment_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "type" STRING NOT NULL,
    "title" STRING NOT NULL,
    "message" STRING NOT NULL,
    "isRead" BOOL NOT NULL DEFAULT false,
    "data" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_requests" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "status" STRING NOT NULL DEFAULT 'PENDING',
    "resolvedBy" STRING,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stall_owners_userId_key" ON "stall_owners"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_persons_userId_key" ON "delivery_persons"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_persons_idNumber_key" ON "delivery_persons"("idNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stalls_stallOwnerId_key" ON "stalls"("stallOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_orderId_key" ON "deliveries"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_orderId_key" ON "reviews"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "ledger_entries_entityType_entityId_idx" ON "ledger_entries"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ledger_entries_status_idx" ON "ledger_entries"("status");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "password_reset_requests_status_idx" ON "password_reset_requests"("status");

-- AddForeignKey
ALTER TABLE "stall_owners" ADD CONSTRAINT "stall_owners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_persons" ADD CONSTRAINT "delivery_persons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stalls" ADD CONSTRAINT "stalls_stallOwnerId_fkey" FOREIGN KEY ("stallOwnerId") REFERENCES "stall_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_stallId_fkey" FOREIGN KEY ("stallId") REFERENCES "stalls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_stallId_fkey" FOREIGN KEY ("stallId") REFERENCES "stalls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "delivery_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "delivery_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "delivery_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_rejections" ADD CONSTRAINT "delivery_rejections_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "delivery_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_stallId_fkey" FOREIGN KEY ("stallId") REFERENCES "stalls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
