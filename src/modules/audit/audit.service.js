import * as auditRepository from './audit.repository.js';

export const log = ({
  actorId,
  targetId = null,
  action,
  oldValues = null,
  newValues = null,
  ipAddress,
}) =>
  auditRepository.createAuditLog({
    actorId,
    targetId,
    action,
    oldValues,
    newValues,
    ipAddress,
  });

export const getAuditLogs = async ({
  page = 1,
  limit = 10,
  actorId,
  action,
}) => {
  const skip = (page - 1) * limit;
  const where = {
    ...(actorId ? { actorId } : {}),
    ...(action ? { action } : {}),
  };

  const [logs, totalItems] = await Promise.all([
    auditRepository.findAuditLogs({ skip, take: limit, where }),
    auditRepository.countAuditLogs(where),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    logs,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
};
