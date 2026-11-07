import * as auditService from './audit.service.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);

    res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully.',
      data: result.logs,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};
