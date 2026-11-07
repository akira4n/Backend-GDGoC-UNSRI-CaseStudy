import * as attendanceRepository from './attendance.repository.js';
import * as eventRepository from '../events/event.repository.js';

export const checkIn = async ({ eventId, userId }) => {
  const event = await eventRepository.findEventById(eventId);

  if (!event) {
    const err = new Error('Event not found.');
    err.status = 404;
    throw err;
  }

  const currentTime = new Date();
  if (currentTime < event.startTime || currentTime > event.endTime) {
    const err = new Error('Attendance check-in window is not active.');
    err.status = 400;
    throw err;
  }

  const registration = await eventRepository.findRegistration(
    eventId,
    userId,
  );
  if (!registration) {
    const err = new Error('You are not registered for this event.');
    err.status = 403;
    throw err;
  }

  const existingAttendance = await attendanceRepository.findAttendance(
    eventId,
    userId,
  );
  if (existingAttendance) {
    return {
      attendance: existingAttendance,
      isAlreadyCheckedIn: true,
    };
  }

  try {
    const newAttendance = await attendanceRepository.createAttendance(
      eventId,
      userId,
    );
    return {
      attendance: newAttendance,
      isAlreadyCheckedIn: false,
    };
  } catch (error) {
    if (error.code === 'P2002') {
      const recordedAttendance = await attendanceRepository.findAttendance(
        eventId,
        userId,
      );
      return {
        attendance: recordedAttendance,
        isAlreadyCheckedIn: true,
      };
    }
    throw error;
  }
};
