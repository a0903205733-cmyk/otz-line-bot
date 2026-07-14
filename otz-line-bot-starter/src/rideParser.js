export function parseRideRequest(text) {
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/→|➡️|➡|到達|前往/g, "到")
    .trim();

  let origin = "";
  let destination = "";

  const patterns = [
    /(?:從|上車(?:地點)?[:：]?)\s*(.+?)\s*(?:到|去|下車(?:地點)?[:：]?)\s*(.+?)(?:[,，。]|$)/,
    /^(.+?)\s*(?:到|去)\s*(.+?)(?:[,，。]|$)/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      origin = cleanupPlace(match[1]);
      destination = cleanupPlace(match[2]);
      break;
    }
  }

  const passengerMatch = normalized.match(/(\d+)\s*(?:位|人)/);
  const passengers = passengerMatch ? Number(passengerMatch[1]) : null;

  const datetimeMatch = normalized.match(
    /((?:今天|明天|後天)?\s*(?:早上|上午|中午|下午|晚上)?\s*\d{1,2}(?::\d{2})?\s*(?:點|時)?(?:半)?)/,
  );

  return {
    origin,
    destination,
    passengers,
    datetime: datetimeMatch ? datetimeMatch[1].trim() : "",
    originalText: text,
  };
}

function cleanupPlace(value) {
  return value
    .replace(/(?:今天|明天|後天|早上|上午|中午|下午|晚上)\s*\d{0,2}(?::\d{2})?\s*(?:點|時)?(?:半)?/g, "")
    .replace(/\d+\s*(?:位|人)/g, "")
    .replace(/[，,。；;]+$/g, "")
    .trim();
}
