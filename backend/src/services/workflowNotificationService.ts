import { createWorkflowNotificationStore } from '../store/workflowStore'
import { NotificationChannel } from '../types/workflow'

export const sendWorkflowNotification = async (payload: {
  channel: NotificationChannel
  recipient: string
  message: string
  referenceType?: string
  referenceId?: string
}) => {
  const record = await createWorkflowNotificationStore({
    channel: payload.channel,
    recipient: payload.recipient,
    message: payload.message,
    referenceType: payload.referenceType ?? 'workflow',
    referenceId: payload.referenceId ?? '',
  })

  return {
    notification: record,
    simulated: true,
  }
}
