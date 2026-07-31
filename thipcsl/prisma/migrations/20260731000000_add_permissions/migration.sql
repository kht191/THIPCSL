-- CreateTable: Permission
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique key
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex: group_name for grouping queries
CREATE INDEX "Permission_group_name_idx" ON "Permission"("group_name");

-- CreateTable: UserPermission (junction)
CREATE TABLE "UserPermission" (
    "user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("user_id","permission_id")
);

-- AddForeignKey: UserPermission -> User
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserPermission -> Permission
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
