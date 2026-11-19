BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Fingerprints] DROP CONSTRAINT [Fingerprints_isEnrolled_df];
ALTER TABLE [dbo].[Fingerprints] DROP CONSTRAINT [Fingerprints_registeredAt_df];
ALTER TABLE [dbo].[Fingerprints] DROP COLUMN [registeredAt];
ALTER TABLE [dbo].[Fingerprints] ADD CONSTRAINT [Fingerprints_isEnrolled_df] DEFAULT 0 FOR [isEnrolled];
ALTER TABLE [dbo].[Fingerprints] ADD [createdAt] DATETIME2 NOT NULL CONSTRAINT [Fingerprints_createdAt_df] DEFAULT CURRENT_TIMESTAMP;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
