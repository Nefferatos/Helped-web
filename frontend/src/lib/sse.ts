type SSEEvent = {
  event?: string;
  data?: string;
};

const parseSseEvents = (chunk: string) => {
  const events: SSEEvent[] = [];
  const blocks = chunk.split("\n\n");
  const remaining = blocks.pop() ?? "";

  for (const block of blocks) {
    const lines = block.split("\n");
    const evt: SSEEvent = {};
    const dataLines: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        evt.event = line.slice(6).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length > 0) {
      evt.data = dataLines.join("\n");
    }
    if (evt.event || evt.data) {
      events.push(evt);
    }
  }

  return { events, remaining };
};

export const streamSse = async (
  url: string,
  options: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    onEvent: (event: SSEEvent) => void;
  },
) => {
  const response = await fetch(url, {
    method: "GET",
    headers: options.headers,
    signal: options.signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Stream failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error("Stream not supported by this browser");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseEvents(buffer);
    buffer = parsed.remaining;
    parsed.events.forEach(options.onEvent);
  }
};

