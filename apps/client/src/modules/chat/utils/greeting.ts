import { resources } from '@/resources';

const { greeting } = resources.chat;

/** The greeting for the hour of `date`, followed by the User's first name when they have one. */
export const getGreeting = (date: Date, name?: string | null) => {
  const hour = date.getHours();
  const salutation =
    hour < 12 ? greeting.morning : hour < 18 ? greeting.afternoon : greeting.evening;
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? greeting.withName(salutation, firstName) : salutation;
};
