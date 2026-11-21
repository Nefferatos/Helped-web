export const requiresMakeCommandCenterAgent = (message: string): boolean => {
  const asksHowToRatherThanDoing = /^(how|what|when|where|why|should i|can i|do i)\b/i.test(message.trim());
  return !asksHowToRatherThanDoing && /\b(send|launch|schedule|reschedule|cancel|pause|resume|update|change|delete|remove|assign|approve|reject|enable|disable|configure|set up|create|reply|respond|publish|execute|start|stop|broadcast)\b/i.test(message);
};
