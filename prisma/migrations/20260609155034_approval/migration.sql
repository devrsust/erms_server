-- DropIndex
DROP INDEX "Approval_requestId_stepId_key";

-- CreateIndex
CREATE INDEX "Approval_requestId_stepId_idx" ON "Approval"("requestId", "stepId");
