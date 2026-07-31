-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "field" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topicId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "max_attempts" INTEGER NOT NULL DEFAULT 1,
    "max_violations" INTEGER NOT NULL DEFAULT 3,
    "question_ids" TEXT NOT NULL,
    "allowed_users" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pass_score" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "type" TEXT NOT NULL DEFAULT 'OFFICIAL',
    "creatorId" UUID,
    "settings" TEXT,
    "practiceSourceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "session_id" UUID,
    "score" DOUBLE PRECISION NOT NULL,
    "is_passed" BOOLEAN NOT NULL DEFAULT false,
    "is_printed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "details" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_token" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ExamToExamSession" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_department_idx" ON "User"("department");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- CreateIndex
CREATE INDEX "Question_category_idx" ON "Question"("category");

-- CreateIndex
CREATE INDEX "Topic_parentId_idx" ON "Topic"("parentId");

-- CreateIndex
CREATE INDEX "Topic_isActive_idx" ON "Topic"("isActive");

-- CreateIndex
CREATE INDEX "Topic_order_idx" ON "Topic"("order");

-- CreateIndex
CREATE INDEX "Exam_status_idx" ON "Exam"("status");

-- CreateIndex
CREATE INDEX "Exam_type_idx" ON "Exam"("type");

-- CreateIndex
CREATE INDEX "Exam_creatorId_idx" ON "Exam"("creatorId");

-- CreateIndex
CREATE INDEX "Exam_createdAt_idx" ON "Exam"("createdAt");

-- CreateIndex
CREATE INDEX "ExamSession_status_idx" ON "ExamSession"("status");

-- CreateIndex
CREATE INDEX "ExamSession_startTime_idx" ON "ExamSession"("startTime");

-- CreateIndex
CREATE INDEX "ExamSession_endTime_idx" ON "ExamSession"("endTime");

-- CreateIndex
CREATE INDEX "Result_user_id_idx" ON "Result"("user_id");

-- CreateIndex
CREATE INDEX "Result_exam_id_idx" ON "Result"("exam_id");

-- CreateIndex
CREATE INDEX "Result_session_id_idx" ON "Result"("session_id");

-- CreateIndex
CREATE INDEX "Result_status_idx" ON "Result"("status");

-- CreateIndex
CREATE INDEX "Result_started_at_idx" ON "Result"("started_at");

-- CreateIndex
CREATE INDEX "Result_is_passed_idx" ON "Result"("is_passed");

-- CreateIndex
CREATE UNIQUE INDEX "_ExamToExamSession_AB_unique" ON "_ExamToExamSession"("A", "B");

-- CreateIndex
CREATE INDEX "_ExamToExamSession_B_index" ON "_ExamToExamSession"("B");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_practiceSourceId_fkey" FOREIGN KEY ("practiceSourceId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ExamSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExamToExamSession" ADD CONSTRAINT "_ExamToExamSession_A_fkey" FOREIGN KEY ("A") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExamToExamSession" ADD CONSTRAINT "_ExamToExamSession_B_fkey" FOREIGN KEY ("B") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
