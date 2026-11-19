BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Roles] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(255),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Roles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Roles_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [id] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(100) NOT NULL,
    [lastName] NVARCHAR(100) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [mobileNumber] NVARCHAR(20) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [roleId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Users_status_df] DEFAULT 'ACTIVE',
    [isDeleted] BIT NOT NULL CONSTRAINT [Users_isDeleted_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Users_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [Users_mobileNumber_key] UNIQUE NONCLUSTERED ([mobileNumber])
);

-- CreateTable
CREATE TABLE [dbo].[Batches] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Batches_status_df] DEFAULT 'ACTIVE',
    [isDeleted] BIT NOT NULL CONSTRAINT [Batches_isDeleted_df] DEFAULT 0,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Batches_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Batches_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Batches_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Students] (
    [id] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(100) NOT NULL,
    [lastName] NVARCHAR(100) NOT NULL,
    [mobileNumber] NVARCHAR(20) NOT NULL,
    [email] NVARCHAR(255),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Students_status_df] DEFAULT 'ACTIVE',
    [isDeleted] BIT NOT NULL CONSTRAINT [Students_isDeleted_df] DEFAULT 0,
    [batchId] NVARCHAR(1000) NOT NULL,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Students_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Students_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Students_mobileNumber_key] UNIQUE NONCLUSTERED ([mobileNumber])
);

-- CreateTable
CREATE TABLE [dbo].[Fingerprints] (
    [id] NVARCHAR(1000) NOT NULL,
    [studentId] NVARCHAR(1000) NOT NULL,
    [fingerIndex] NVARCHAR(20) NOT NULL,
    [templateHash] NVARCHAR(255) NOT NULL,
    [encryptedData] NVARCHAR(max) NOT NULL,
    [qualityScore] INT NOT NULL CONSTRAINT [Fingerprints_qualityScore_df] DEFAULT 0,
    [deviceModel] NVARCHAR(50) NOT NULL CONSTRAINT [Fingerprints_deviceModel_df] DEFAULT 'MFS100',
    [isEnrolled] BIT NOT NULL CONSTRAINT [Fingerprints_isEnrolled_df] DEFAULT 1,
    [registeredAt] DATETIME2 NOT NULL CONSTRAINT [Fingerprints_registeredAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Fingerprints_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Fingerprints_studentId_fingerIndex_key] UNIQUE NONCLUSTERED ([studentId],[fingerIndex])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLogs] (
    [id] NVARCHAR(1000) NOT NULL,
    [actorId] NVARCHAR(1000),
    [action] NVARCHAR(100) NOT NULL,
    [entity] NVARCHAR(100) NOT NULL,
    [entityId] NVARCHAR(100),
    [details] NVARCHAR(max),
    [ipAddress] NVARCHAR(45),
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [AuditLogs_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLogs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshTokens] (
    [id] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(255) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [isRevoked] BIT NOT NULL CONSTRAINT [RefreshTokens_isRevoked_df] DEFAULT 0,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshTokens_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RefreshTokens_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RefreshTokens_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Users_roleId_idx] ON [dbo].[Users]([roleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Users_email_idx] ON [dbo].[Users]([email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Users_mobileNumber_idx] ON [dbo].[Users]([mobileNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Users_isDeleted_idx] ON [dbo].[Users]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Batches_status_idx] ON [dbo].[Batches]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Batches_isDeleted_idx] ON [dbo].[Batches]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Batches_createdById_idx] ON [dbo].[Batches]([createdById]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Students_batchId_idx] ON [dbo].[Students]([batchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Students_status_idx] ON [dbo].[Students]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Students_isDeleted_idx] ON [dbo].[Students]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Students_createdById_idx] ON [dbo].[Students]([createdById]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Fingerprints_studentId_idx] ON [dbo].[Fingerprints]([studentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_actorId_idx] ON [dbo].[AuditLogs]([actorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_action_idx] ON [dbo].[AuditLogs]([action]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_entity_idx] ON [dbo].[AuditLogs]([entity]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_timestamp_idx] ON [dbo].[AuditLogs]([timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshTokens_userId_idx] ON [dbo].[RefreshTokens]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [Users_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Batches] ADD CONSTRAINT [Batches_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[Users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Students] ADD CONSTRAINT [Students_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[Batches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Students] ADD CONSTRAINT [Students_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[Users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Fingerprints] ADD CONSTRAINT [Fingerprints_studentId_fkey] FOREIGN KEY ([studentId]) REFERENCES [dbo].[Students]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLogs] ADD CONSTRAINT [AuditLogs_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[Users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RefreshTokens] ADD CONSTRAINT [RefreshTokens_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
