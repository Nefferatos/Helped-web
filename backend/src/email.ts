import dotenv from 'dotenv'
import tls from 'tls'

dotenv.config()

type SmtpConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

const getSmtpConfig = (): SmtpConfig | null => {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim()
  const port = Number(process.env.SMTP_PORT || '465')
  const user = (process.env.SMTP_USER || '').trim()
  const pass = (process.env.SMTP_PASS || '').trim()
  const from = (process.env.SMTP_FROM || user).trim()

  if (!host || !Number.isFinite(port) || !user || !pass || !from) return null
  return { host, port, user, pass, from }
}

const encodeBase64 = (value: string) => Buffer.from(value, 'utf8').toString('base64')

const dotStuff = (value: string) =>
  value
    .replace(/\r?\n/g, '\r\n')
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n')

const readSmtpResponse = async (socket: tls.TLSSocket, timeoutMs: number) => {
  return await new Promise<{ code: number; message: string }>((resolve, reject) => {
    let buffer = ''
    let timer: NodeJS.Timeout | null = null

    const cleanup = () => {
      if (timer) clearTimeout(timer)
      socket.off('data', onData)
      socket.off('error', onError)
      socket.off('close', onClose)
    }

    const onError = (err: unknown) => {
      cleanup()
      reject(err)
    }

    const onClose = () => {
      cleanup()
      reject(new Error('SMTP connection closed'))
    }

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split(/\r\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const match = line.match(/^(\d{3})([ -])(.*)$/)
        if (!match) continue
        const code = Number(match[1])
        const isFinal = match[2] === ' '
        if (isFinal) {
          cleanup()
          resolve({ code, message: line })
          return
        }
      }
    }

    socket.on('data', onData)
    socket.once('error', onError)
    socket.once('close', onClose)
    timer = setTimeout(() => {
      cleanup()
      reject(new Error('SMTP timeout'))
    }, timeoutMs)
  })
}

const sendSmtpCommand = async (socket: tls.TLSSocket, command: string, expected: number | number[], timeoutMs: number) => {
  socket.write(`${command}\r\n`)
  const response = await readSmtpResponse(socket, timeoutMs)
  const expectedCodes = Array.isArray(expected) ? expected : [expected]
  if (!expectedCodes.includes(response.code)) {
    throw new Error(`SMTP expected ${expectedCodes.join('/')} but got ${response.code}: ${response.message}`)
  }
  return response
}

export const sendClientConfirmationCodeEmail = async (to: string, code: string) => {
  // Disabled: replaced with Supabase email verification
  // Keeping old SMTP implementation below for reference only.
  return { ok: false as const, error: 'disabled' as const }

  /*
  const config = getSmtpConfig()
  if (!config) {
    return { ok: false as const, error: 'not_configured' as const }
  }

  const subject = 'Your verification code'
  const body = `Your verification code is: ${code}\n\nThis code expires in 15 minutes.`
  const message =
    `From: ${config.from}\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n` +
    `Content-Transfer-Encoding: 8bit\r\n` +
    `\r\n` +
    `${body}\r\n`

  const timeoutMs = 15000

  const socket = tls.connect({
    host: config.host,
    port: config.port,
    servername: config.host,
    rejectUnauthorized: true,
  })

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('SMTP connect timeout')), timeoutMs)
      socket.once('secureConnect', () => {
        clearTimeout(timer)
        resolve()
      })
      socket.once('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })

    const greeting = await readSmtpResponse(socket, timeoutMs)
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting failed: ${greeting.message}`)
    }

    await sendSmtpCommand(socket, 'EHLO localhost', 250, timeoutMs)
    await sendSmtpCommand(socket, 'AUTH LOGIN', 334, timeoutMs)
    await sendSmtpCommand(socket, encodeBase64(config.user), 334, timeoutMs)
    await sendSmtpCommand(socket, encodeBase64(config.pass), 235, timeoutMs)
    await sendSmtpCommand(socket, `MAIL FROM:<${config.from}>`, 250, timeoutMs)
    await sendSmtpCommand(socket, `RCPT TO:<${to}>`, [250, 251], timeoutMs)
    await sendSmtpCommand(socket, 'DATA', 354, timeoutMs)
    socket.write(`${dotStuff(message)}\r\n.\r\n`)
    const accepted = await readSmtpResponse(socket, timeoutMs)
    if (accepted.code !== 250) {
      throw new Error(`SMTP DATA not accepted: ${accepted.message}`)
    }
    await sendSmtpCommand(socket, 'QUIT', 221, timeoutMs)
    socket.end()
    return { ok: true as const }
  } catch (error) {
    try {
      socket.end()
    } catch {
      // ignore
    }
    return { ok: false as const, error: error instanceof Error ? error.message : 'send_failed' }
  }
  */
}
