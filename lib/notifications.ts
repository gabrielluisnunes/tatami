import { Resend } from 'resend'
import { env } from './env'

export const resend = new Resend(env.RESEND_API_KEY)

export async function sendOverdueAlert(
  email: string,
  studentName: string,
  amount: number,
  dueDate: string
) {
  void email;
  void studentName;
  void amount;
  void dueDate;
}
