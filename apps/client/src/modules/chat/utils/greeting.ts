import { resources } from '@/resources';

const { greeting } = resources.chat;

const salutationAt = (hour: number) => {
  if (hour < 12) return greeting.morning;
  if (hour < 18) return greeting.afternoon;
  return greeting.evening;
};

/** The greeting for the hour of `date`, followed by the User's first name when they have one. */
export const getGreeting = (date: Date, name?: string | null) => {
  const salutation = salutationAt(date.getHours());
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? greeting.withName(salutation, firstName) : salutation;
};
