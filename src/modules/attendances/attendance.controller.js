import * as attendanceService from './attendance.service.js';

export const checkIn = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const result = await attendanceService.checkIn({ eventId, userId });

    res.status(200).json({
      success: true,
      message: result.isAlreadyCheckedIn
        ? 'Already checked in for this event.'
        : 'Attendance recorded successfully.',
      data: result.attendance,
    });
  } catch (error) {
    next(error);
  }
};
